import {
  chat,
  defaultStorage,
  type InferChatUIMessageFromTools,
} from "@trigger.dev/sdk/ai";
import { createOpenAI } from "@ai-sdk/openai";
import { type ModelMessage } from "@ai-sdk/provider-utils";
import { stepCountIs, type JSONValue } from "ai";
import { db, bots } from "@/db";
import { eq } from "drizzle-orm";
import { sandboxTools, sandboxContextStorage } from "./tools";

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
  run: async ({ messages, tools, chatId, signal, streamText }) => {
    let botInfo = null;
    if (chatId) {
      try {
        const [bot] = await db
          .select({
            name: bots.name,
            job: bots.job,
            instruction: bots.instruction,
            sandboxId: bots.sandboxId,
          })
          .from(bots)
          .where(eq(bots.id, chatId))
          .limit(1);
        botInfo = bot ?? null;
      } catch (err) {
        console.error("Failed to load bot details for chat agent:", err);
      }
    }

    const systemPromptParts: string[] = [];

    if (botInfo) {
      systemPromptParts.push(`Your name is ${botInfo.name}.`);
      systemPromptParts.push(`Your role and job: ${botInfo.job}.`);

      if (botInfo.instruction?.trim()) {
        systemPromptParts.push(
          `Your purpose and instructions:\n${botInfo.instruction.trim()}`
        );
      }

      if (botInfo.sandboxId) {
        systemPromptParts.push(
          `Sandbox Environment: You are operating inside an isolated Daytona sandbox computer environment (Sandbox ID: ${botInfo.sandboxId}).`
        );
      }
    } else {
      systemPromptParts.push("You are a helpful and intelligent AI teammate.");
    }

    systemPromptParts.push(`You have full computer and sandbox access via your tools:
- bash: Execute terminal commands inside the Linux environment.
- readFile: Read file contents from the sandbox filesystem.
- writeFile: Create or update files in the sandbox filesystem.
- listFiles: List files and directory structures.
- mouseClick: Click on screen coordinates (0 to 1024 width, 0 to 768 height).
- mouseScroll: Scroll the mouse wheel up, down, left, or right.
- mouseMove: Position the mouse cursor.
- keyboardType: Type text into active windows.
- keyboardPress: Press specific keys or shortcuts (enter, tab, escape, ctrl+c, etc.).
- viewScreen: Take a screenshot to inspect what is on screen for your own internal reasoning. Never render this image in chat; it is strictly for your visual perception.
- showScreen: Capture and show the desktop screen directly to the user in chat when they ask to see it or when presenting visual results.
- getDisplayInfo: Check display resolution and screen bounds.

CRITICAL INSTRUCTIONS:
1. All your sandbox tools are FULLY ACTIVE and operational right now. NEVER claim that you do not have tools or cannot execute actions.
2. When the user asks for a screenshot or asks to see what is on screen (e.g. 'berikan screenshot', 'tampilkan layar', 'lihat layar', 'show screen'), ALWAYS call the \`showScreen\` tool immediately.
3. Stay in character, think step by step when using computer tools, and communicate clearly.`);

    const systemInstruction = systemPromptParts.join("\n\n");
    const sanitizedMessages = sanitizeMessagesForModel(messages);

    return sandboxContextStorage.run(
      {
        chatId: chatId ?? "",
        sandboxId: botInfo?.sandboxId ?? null,
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
