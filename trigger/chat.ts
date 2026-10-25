import {
  chat,
  defaultStorage,
  type InferChatUIMessageFromTools,
} from "@trigger.dev/sdk/ai";
import { createOpenAI } from "@ai-sdk/openai";
import { type ModelMessage } from "@ai-sdk/provider-utils";
import { stepCountIs, type JSONValue } from "ai";
import { db, bots, chats, chatMembers } from "@/db";
import { eq } from "drizzle-orm";
import { sandboxTools, sandboxContextStorage } from "./tools";
import { getDaytonaClient } from "@/lib/daytona";

const nineRouter = createOpenAI({
  baseURL: process.env.NINE_ROUTER_BASE_URL,
  apiKey: process.env.NINE_ROUTER_API_KEY,
});

export type ChatAgentUIMessage = InferChatUIMessageFromTools<
  typeof sandboxTools
>;

/**
 * Strips massive base64 payloads and long stdout outputs from past messages in the conversation history.
 * Prevents exceeding the 1,048,576 token context window while preserving full tool call structure.
 */
function sanitizeMessagesForModel(rawMessages: ModelMessage[]): ModelMessage[] {
  // Take at most the last 30 turns if history has grown very large
  const windowed = rawMessages.length > 30 ? rawMessages.slice(-30) : rawMessages;

  return windowed.map((msg, idx) => {
    const isRecentTurn = idx >= windowed.length - 2;

    if (msg.role === "tool" && Array.isArray(msg.content)) {
      return {
        ...msg,
        content: msg.content.map((part) => {
          if (part.type === "tool-result") {
            const out = part.output;
            if (out.type === "json" && typeof out.value === "object" && out.value !== null) {
              const val = { ...(out.value as Record<string, unknown>) };
              if (
                "screenshot" in val &&
                typeof val.screenshot === "string" &&
                val.screenshot.length > 500
              ) {
                if (part.toolName === "showScreen" || !isRecentTurn) {
                  delete val.screenshot;
                  val.screenshotNote = "[Screenshot omitted from history to conserve tokens]";
                }
              }

              if (
                "stdout" in val &&
                typeof val.stdout === "string" &&
                val.stdout.length > 20000
              ) {
                val.stdout =
                  val.stdout.slice(0, 15000) +
                  "\n...[stdout truncated in history]";
              }

              if (
                "content" in val &&
                typeof val.content === "string" &&
                val.content.length > 20000
              ) {
                val.content =
                  val.content.slice(0, 15000) +
                  "\n...[file content truncated in history]";
              }

              return {
                ...part,
                output: {
                  ...out,
                  value: val as unknown as JSONValue,
                },
              };
            }

            if (out.type === "content" && Array.isArray(out.value)) {
              if (!isRecentTurn) {
                return {
                  ...part,
                  output: {
                    type: "text" as const,
                    value: `[Tool ${part.toolName} output from previous turn summarized]`,
                  },
                };
              }
            }

            if (out.type === "text" && out.value.length > 25000) {
              return {
                ...part,
                output: {
                  ...out,
                  value: out.value.slice(0, 20000) + "\n...[output truncated in history]",
                },
              };
            }
          }
          return part;
        }),
      };
    }

    return msg;
  });
}

export const chatAgent = chat.agent({
  id: "chat-agent",
  storage: defaultStorage,
  tools: sandboxTools,
  run: async ({ messages, tools, chatId, signal, streamText, clientData }) => {
    const requestedBotId = (clientData as { botId?: string } | undefined)?.botId;

    let isGroup = false;
    let chatName = "";
    let groupMembers: Array<{
      id: string;
      name: string;
      avatar: string;
      job: string;
      instruction: string | null;
      sandboxId: string | null;
    }> = [];

    // 1. Check if chatId is a group chat in `chats` table
    if (chatId) {
      try {
        const [chatRecord] = await db
          .select({
            id: chats.id,
            name: chats.name,
            kind: chats.kind,
          })
          .from(chats)
          .where(eq(chats.id, chatId))
          .limit(1);

        if (chatRecord && chatRecord.kind === "group") {
          isGroup = true;
          chatName = chatRecord.name || "Group Chat";

          // Fetch all bot members in this group
          groupMembers = await db
            .select({
              id: bots.id,
              name: bots.name,
              avatar: bots.avatar,
              job: bots.job,
              instruction: bots.instruction,
              sandboxId: bots.sandboxId,
            })
            .from(chatMembers)
            .innerJoin(bots, eq(chatMembers.botId, bots.id))
            .where(eq(chatMembers.chatId, chatId));
        }
      } catch (err) {
        console.error("Failed to query group chat record:", err);
      }
    }

    let activeBot: {
      id: string;
      name: string;
      avatar: string;
      job: string;
      instruction: string | null;
      sandboxId: string | null;
    } | null = null;

    // 2. Identify the active bot for this turn
    if (requestedBotId) {
      if (isGroup && groupMembers.length > 0) {
        activeBot = groupMembers.find((b) => b.id === requestedBotId) ?? null;
      }

      if (!activeBot) {
        try {
          const [bot] = await db
            .select({
              id: bots.id,
              name: bots.name,
              avatar: bots.avatar,
              job: bots.job,
              instruction: bots.instruction,
              sandboxId: bots.sandboxId,
            })
            .from(bots)
            .where(eq(bots.id, requestedBotId))
            .limit(1);
          activeBot = bot ?? null;
        } catch (err) {
          console.error("Failed to load requested bot details:", err);
        }
      }
    }

    // If still not identified, fallback
    if (!activeBot) {
      if (isGroup && groupMembers.length > 0) {
        activeBot = groupMembers[0];
      } else if (chatId) {
        try {
          const [bot] = await db
            .select({
              id: bots.id,
              name: bots.name,
              avatar: bots.avatar,
              job: bots.job,
              instruction: bots.instruction,
              sandboxId: bots.sandboxId,
            })
            .from(bots)
            .where(eq(bots.id, chatId))
            .limit(1);
          activeBot = bot ?? null;
        } catch (err) {
          console.error("Failed to load direct bot details:", err);
        }
      }
    }

    // Ensure activeBot is included in memberBots array for context
    if (activeBot && groupMembers.length === 0) {
      groupMembers = [activeBot];
    }

    // Attempt to load persistent memory (MEMORY.md) from the active bot's Daytona sandbox
    let botMemoryContent: string | null = null;
    if (activeBot?.sandboxId) {
      try {
        const daytona = getDaytonaClient();
        const sb = await daytona.get(activeBot.sandboxId);
        if (sb.state === "stopped") {
          await sb.start();
        }
        const buf = await sb.fs.downloadFile("MEMORY.md");
        const text = buf.toString("utf-8").trim();
        if (text) {
          botMemoryContent = text;
        }
      } catch {
        // If MEMORY.md does not exist yet or failed to download, initialize it
        try {
          const daytona = getDaytonaClient();
          const sb = await daytona.get(activeBot.sandboxId);
          await sb.fs.uploadFile(Buffer.from(""), "MEMORY.md");
        } catch {
          // ignore fallback initialization error
        }
      }
    }

    const systemPromptParts: string[] = [];

    if (isGroup && activeBot) {
      const otherBots = groupMembers.filter((m) => m.id !== activeBot.id);

      systemPromptParts.push(`=== GROUP CHAT CONTEXT ===
You are currently participating in a GROUP CHAT named "${chatName || "Team Group Chat"}".
You are collaborating with a team of specialized AI bots and the human user in this shared workspace.

YOUR ACTIVE IDENTITY FOR THIS TURN:
- You are speaking and acting strictly as: ${activeBot.name}
- Your Job / Role: ${activeBot.job}
- Your Specialty & Instructions:
${activeBot.instruction?.trim() || "Provide specialized, high-quality assistance in your area of expertise."}
${activeBot.sandboxId ? `- Sandbox Computer Environment: Active (ID: ${activeBot.sandboxId})` : ""}

TEAMMATES IN THIS GROUP CHAT:
${
  otherBots.length > 0
    ? otherBots
        .map(
          (b) =>
            `• ${b.name} (${b.job})${
              b.instruction
                ? ` - Specialty: ${b.instruction.trim().replace(/\n+/g, " ").slice(0, 200)}`
                : ""
            }`
        )
        .join("\n")
    : "None (you are the only bot member in this group)."
}`);

      systemPromptParts.push(`=== PERSISTENT MEMORY & CROSS-CHAT RECALL (MEMORY.md) ===
You have an isolated Daytona sandbox environment with your own personal persistent memory file: "MEMORY.md".
- Cross-Chat Knowledge: "MEMORY.md" stores persistent facts, user preferences, instructions, and context you learned from the user in private 1:1 chats.
- Answering from Past Conversations: When the user asks you in this group chat about something discussed in private 1:1 chat (e.g. "apa yang pernah saya ceritakan di chat pribadi?", or asks about their personal preferences, background, or previous tasks), you MUST refer to your MEMORY.md!
- Reading Memory: You can read "MEMORY.md" at any time using the \`readFile\` tool if you need to search or verify details.
- Updating Memory: When important new decisions or user facts are established in this group chat, you can update "MEMORY.md" using the \`writeFile\` tool.`);

      if (botMemoryContent) {
        systemPromptParts.push(`=== CURRENT PERSISTENT MEMORY FROM YOUR SANDBOX (MEMORY.md) ===
The following notes are recorded in your "MEMORY.md" from past 1:1 or group conversations:
"""
${botMemoryContent}
"""
You know this information and can reference it directly when replying to the user!`);
      }

      systemPromptParts.push(`=== HANDOFF & COLLABORATION GUIDELINES ===
1. EVALUATE FIT PROACTIVELY:
   - Stay in character as ${activeBot.name}.
   - If the user's prompt, question, or need aligns with the role or specialty of another teammate bot in this group (e.g. asking about research, data gathering, or literature analysis when Wong/another research bot is in the group, or asking about coding when a software engineer bot is present, or asking who can do a certain task), you MUST immediately call the \`handoff\` tool!
   - Do NOT try to answer or fulfill tasks that belong to a specialist teammate yourself.

2. SEAMLESS TAKEOVER ON HANDOFF (CRITICAL):
   When you call the \`handoff\` tool to hand off the conversation to [TargetBot]:
   - Step 1: Call the \`handoff\` tool with \`targetBotName\` and \`reason\`.
   - Step 2: Once the handoff tool completes, [TargetBot] MUST IMMEDIATELY STEP IN AND TAKE OVER THE CONVERSATION IN THIS VERY SAME TURN!
     Format your response clearly:
     
     **${activeBot.name}**:
     Saya alihkan tugas ini ke rekan saya, **[TargetBot.name]** ([TargetBot.job]), karena ini adalah keahlian utama beliau.

     ---

     **[TargetBot.name]**:
     Halo! Saya [TargetBot.name]. [TargetBot directly answers the user's question or introduces their capabilities in detail, fulfilling the user's prompt in character according to TargetBot's role].

   This way, the user immediately receives the answer from the appropriate specialist bot without having to ask again!

3. WHEN TO ANSWER YOURSELF:
   - If the request matches your job (${activeBot.job}), answer it directly with excellence.
   - If the user explicitly addresses you by name (e.g., "${activeBot.name}, please do X"), do your best to assist them.
   - For general greetings without specific tasks, you may answer directly.`);

      systemPromptParts.push(`=== TOOLS & CAPABILITIES ===
You have access to the following tools:
1. \`handoff\`: Transfer the conversation or task to another teammate bot in this group chat if their specialty is a better fit.
2. Computer Sandbox Tools (available if you have an active sandbox environment):
   - \`bash\`: Run terminal commands in your Linux sandbox environment.
   - \`readFile\`: Read file contents from the sandbox filesystem (e.g. 'MEMORY.md').
   - \`writeFile\`: Create or update files in the sandbox filesystem (e.g. 'MEMORY.md').
   - \`listFiles\`: List files and directory structures in the sandbox.
   - \`mouseClick\`, \`mouseMove\`, \`mouseScroll\`: GUI mouse controls.
   - \`keyboardType\`, \`keyboardPress\`: GUI keyboard controls.
   - \`viewScreen\`: Internal screenshot for your visual perception (never render raw base64 image in chat).
   - \`showScreen\`: Capture and show screenshot directly to the user in chat when requested.
   - \`getDisplayInfo\`: View screen dimensions.

CRITICAL RULES:
- When a handoff is warranted, call the \`handoff\` tool before concluding your turn.
- When the user asks to see the screen or for a screenshot, ALWAYS call \`showScreen\`.
- Communicate clearly, professionally, and stay true to your personality.`);
    } else if (activeBot) {
      systemPromptParts.push(`Your name is ${activeBot.name}.
Your role and job: ${activeBot.job}.
${activeBot.instruction?.trim() ? `Your purpose and instructions:\n${activeBot.instruction.trim()}` : ""}
${activeBot.sandboxId ? `Sandbox Environment: You are operating inside an isolated Daytona sandbox computer environment (Sandbox ID: ${activeBot.sandboxId}).` : ""}`);

      systemPromptParts.push(`=== PERSISTENT MEMORY GUIDELINES (MEMORY.md) ===
Your sandbox contains a persistent memory file at "MEMORY.md".
- Purpose: You use "MEMORY.md" to retain durable knowledge about the user, their preferences, project facts, personal notes, or specific requests. What you write here persists across sessions and is accessible by you even when you are talking in a group chat!
- When to write to MEMORY.md:
  * When the user shares personal facts (e.g. name, role, favorite things, hobbies, habits, allergies, background).
  * When the user shares project guidelines, technical preferences, or specific instructions.
  * When the user explicitly asks you to remember something ("ingat ini", "catat ini", "remember that...").
  * HOW TO UPDATE: First call \`readFile\` on "MEMORY.md" to retrieve existing notes, merge the new facts into a structured, clean markdown list, and call \`writeFile\` with path: "MEMORY.md".
- When to read from MEMORY.md:
  * Whenever the user asks what you remember about them, or refers to past conversations.
  * You can call \`readFile\` on "MEMORY.md" at any time.`);

      if (botMemoryContent) {
        systemPromptParts.push(`=== CURRENT PERSISTENT MEMORY FROM YOUR SANDBOX (MEMORY.md) ===
The following notes are currently recorded in your "MEMORY.md":
"""
${botMemoryContent}
"""
Use this context to personalize your interactions and honor the user's past preferences.`);
      }

      systemPromptParts.push(`=== AVAILABLE TOOLS & CAPABILITIES ===
You have full computer and sandbox access via your tools:
- bash: Execute terminal commands inside the Linux environment.
- readFile: Read file contents from the sandbox filesystem (e.g. 'MEMORY.md').
- writeFile: Create or update files in the sandbox filesystem (e.g. 'MEMORY.md').
- listFiles: List files and directory structures.
- mouseClick: Click on screen coordinates.
- mouseScroll: Scroll the mouse wheel.
- mouseMove: Position the mouse cursor.
- keyboardType: Type text into active windows.
- keyboardPress: Press specific keys or shortcuts.
- viewScreen: Take a screenshot to inspect what is on screen for internal reasoning. Never render this image in chat.
- showScreen: Capture and show the desktop screen directly to the user in chat when requested.
- getDisplayInfo: Check display resolution.

Note: You are in a direct 1-on-1 private chat with the user. The \`handoff\` tool is not applicable here.

CRITICAL INSTRUCTIONS:
1. All your sandbox tools are FULLY ACTIVE and operational right now. NEVER claim that you do not have tools or cannot execute actions.
2. When the user asks for a screenshot or asks to see what is on screen (e.g. 'berikan screenshot', 'tampilkan layar', 'lihat layar', 'show screen'), ALWAYS call the \`showScreen\` tool immediately.
3. Stay in character, think step by step when using computer tools, and communicate clearly.`);
    } else {
      systemPromptParts.push("You are a helpful and intelligent AI teammate.");
    }

    const systemInstruction = systemPromptParts.join("\n\n");
    const sanitizedMessages = sanitizeMessagesForModel(messages);

    if (activeBot) {
      chat.setUIMessageStreamOptions({
        messageMetadata: () => ({
          botId: activeBot.id,
          botName: activeBot.name,
        }),
      });
    }

    return sandboxContextStorage.run(
      {
        chatId: chatId ?? "",
        sandboxId: activeBot?.sandboxId ?? null,
        isGroup,
        memberBots: groupMembers,
      },
      () =>
        streamText({
          model: nineRouter.chat("my-combo-9router"),
          system: systemInstruction,
          messages: sanitizedMessages,
          tools,
          stopWhen: stepCountIs(10),
          abortSignal: signal,
        })
    );
  },
});
