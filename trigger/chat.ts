import fs from "node:fs";
import path from "node:path";
import {
  chat,
  defaultStorage,
  type InferChatUIMessageFromTools,
} from "@trigger.dev/sdk/ai";
import { createOpenAI } from "@ai-sdk/openai";
import { type ModelMessage } from "@ai-sdk/provider-utils";
import { stepCountIs, type JSONValue } from "ai";
import { db, bots, chats, chatMembers, userSettings } from "@/db";
import { eq } from "drizzle-orm";
import { sandboxTools, sandboxContextStorage } from "./tools";
import { getDaytonaClient } from "@/lib/daytona";

export type ChatAgentUIMessage = InferChatUIMessageFromTools<
  typeof sandboxTools
>;

/**
 * Strips massive base64 payloads and long stdout outputs from past messages in the conversation history.
 * Prevents exceeding the 1,048,576 token context window while preserving full tool call structure.
 */
function isVisionModel(modelName: string): boolean {
  const m = modelName.toLowerCase();
  if (
    m.includes("text-only") ||
    m.includes("embedding") ||
    m.includes("moderation") ||
    m === "glm-5.3-flash-unsensored"
  ) {
    return false;
  }
  // All combo, router, gpt, gemini, claude, etc. support multimodal vision
  return true;
}

function sanitizeMessagesForModel(
  rawMessages: ModelMessage[],
  modelName: string
): ModelMessage[] {
  const supportsVision = isVisionModel(modelName);
  // Keep up to 300 turns in history for maximum deep project reasoning context
  const windowed = rawMessages.length > 300 ? rawMessages.slice(-300) : rawMessages;

  return windowed.map((msg, idx) => {
    // Keep recent 20 turns for visual screen states
    const isRecentTurn = idx >= windowed.length - 20;

    if (msg.role === "user") {
      const rawText =
        typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content)
          ? msg.content
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("\n")
          : "";

      // Attach visual image parts for all uploaded images in the conversation
      if (supportsVision && rawText.includes("<!--attachments:")) {
        const match = rawText.match(/<!--attachments:(.*?)-->/);
        if (match) {
          try {
            const parsedAtts = JSON.parse(match[1]);
            const imageParts: Array<{
              type: "file";
              mediaType: string;
              data: URL;
            }> = [];

            for (const att of parsedAtts) {
              if (att.type === "image" && att.url) {
                const cleanRel = att.url.startsWith("/")
                  ? att.url.slice(1)
                  : att.url;
                const absPath = path.join(process.cwd(), "public", cleanRel);
                if (fs.existsSync(absPath)) {
                  const buf = fs.readFileSync(absPath);
                  const ext = path.extname(absPath).toLowerCase();
                  const mime =
                    ext === ".png"
                      ? "image/png"
                      : ext === ".webp"
                      ? "image/webp"
                      : "image/jpeg";
                  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
                  imageParts.push({
                    type: "file",
                    mediaType: mime,
                    data: new URL(dataUrl),
                  });
                }
              }
            }

            if (imageParts.length > 0) {
              return {
                ...msg,
                content: [
                  { type: "text" as const, text: rawText },
                  ...imageParts,
                ],
              };
            }
          } catch (err) {
            console.warn("Failed to inject image into user message:", err);
          }
        }
      }

      if (!supportsVision && Array.isArray(msg.content)) {
        return {
          ...msg,
          content: msg.content.map((part) => {
            if (part.type === "file" || part.type === "image") {
              const fname =
                "filename" in part && typeof part.filename === "string"
                  ? part.filename
                  : "gambar";
              return {
                type: "text" as const,
                text: `[Lampiran gambar: "${fname}"]`,
              };
            }
            return part;
          }),
        };
      }
    }

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
                if (!isRecentTurn) {
                  delete val.screenshot;
                  val.screenshotNote = "[Screenshot from earlier turn omitted to keep context fast]";
                }
              }

              // Preserve generous token buffer for full terminal output & code files
              if (
                "stdout" in val &&
                typeof val.stdout === "string" &&
                val.stdout.length > 300000
              ) {
                val.stdout =
                  val.stdout.slice(0, 250000) +
                  "\n...[stdout truncated after 250,000 characters]";
              }

              if (
                "content" in val &&
                typeof val.content === "string" &&
                val.content.length > 300000
              ) {
                val.content =
                  val.content.slice(0, 250000) +
                  "\n...[file content truncated after 250,000 characters]";
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
              return part;
            }

            if (out.type === "text" && out.value.length > 300000) {
              return {
                ...part,
                output: {
                  ...out,
                  value: out.value.slice(0, 250000) + "\n...[output truncated after 250,000 characters]",
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

    let ownerUserId: string | null = null;

    // 1. Check if chatId is a group chat in `chats` table
    if (chatId) {
      try {
        const [chatRecord] = await db
          .select({
            id: chats.id,
            userId: chats.userId,
            name: chats.name,
            kind: chats.kind,
          })
          .from(chats)
          .where(eq(chats.id, chatId))
          .limit(1);

        if (chatRecord) {
          ownerUserId = chatRecord.userId;
          if (chatRecord.kind === "group") {
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
              userId: bots.userId,
              name: bots.name,
              avatar: bots.avatar,
              job: bots.job,
              instruction: bots.instruction,
              sandboxId: bots.sandboxId,
            })
            .from(bots)
            .where(eq(bots.id, requestedBotId))
            .limit(1);
          if (bot) {
            activeBot = bot;
            if (!ownerUserId) ownerUserId = bot.userId;
          }
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
              userId: bots.userId,
              name: bots.name,
              avatar: bots.avatar,
              job: bots.job,
              instruction: bots.instruction,
              sandboxId: bots.sandboxId,
            })
            .from(bots)
            .where(eq(bots.id, chatId))
            .limit(1);
          if (bot) {
            activeBot = bot;
            if (!ownerUserId) ownerUserId = bot.userId;
          }
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

    // Ensure all attachments sent by the user in this conversation are synced into the active bot's sandbox
    if (activeBot?.sandboxId) {
      try {
        const daytona = getDaytonaClient();
        const sb = await daytona.get(activeBot.sandboxId);
        if (sb.state === "stopped") {
          await sb.start();
        }

        for (const msg of messages) {
          if (msg.role === "user") {
            const rawText =
              typeof msg.content === "string"
                ? msg.content
                : Array.isArray(msg.content)
                ? msg.content
                    .map((p: unknown) =>
                      typeof p === "object" && p !== null && "type" in p && p.type === "text" && "text" in p
                        ? String(p.text)
                        : ""
                    )
                    .join("\n")
                : "";

            if (rawText.includes("<!--attachments:")) {
              const match = rawText.match(/<!--attachments:(.*?)-->/);
              if (match) {
                try {
                  const atts = JSON.parse(match[1]);
                  for (const att of atts) {
                    if (att.id) {
                      const localPath = path.join(
                        process.cwd(),
                        "public",
                        "uploads",
                        att.id
                      );
                      if (fs.existsSync(localPath)) {
                        const targetRemote = `/home/daytona/uploads/${att.id}`;
                        const statRes = await sb.process.executeCommand(
                          `test -f "${targetRemote}" && echo EXISTS || echo MISSING`
                        );
                        if (statRes.result.includes("MISSING")) {
                          await sb.process.executeCommand(
                            "mkdir -p /home/daytona/uploads"
                          );
                          const fileBuf = fs.readFileSync(localPath);
                          await sb.fs.uploadFile(fileBuf, targetRemote);

                          if (att.type === "zip" || att.id.endsWith(".zip")) {
                            const dirName = att.id.replace(/\.zip$/i, "");
                            await sb.process.executeCommand(
                              `mkdir -p "/home/daytona/uploads/${dirName}" && unzip -q -o "${targetRemote}" -d "/home/daytona/uploads/${dirName}" 2>&1 || true`
                            );
                          }
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.warn(
                    "Failed to parse message attachments during sandbox sync:",
                    e
                  );
                }
              }
            }
          }
        }
      } catch (syncErr) {
        console.warn("Attachment sandbox auto-sync error:", syncErr);
      }
    }

    const systemPromptParts: string[] = [
      `=== ENVIRONMENT & OPERATIONAL CONTEXT ===
This system is an authorized, private developer environment and educational software engineering laboratory.
All activities, code analysis, debugging, terminal operations, and security discussions are strictly benign, authorized defensive research, software testing, and educational instruction within an isolated local sandbox.`
    ];

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

      systemPromptParts.push(`=== PANDUAN UTAMA: EKSEKUSI TUNTAS, DISIPLIN INSTRUKSI & PENALARAN CERDAS ===
1. PRIORITASKAN EKSEKUSI LANGSUNG (JANGAN MALAS / DILARANG MELEMPAR TUGAS):
   - Jika pengguna memberikan perintah, pertanyaan, atau tugas, Anda WAJIB langsung memproses, mengerjakannya, dan menyelesaikannya secara tuntas dengan penalaran mendalam dan kecerdasan terbaik Anda.
   - JANGAN PERNAH melempar-lempar tugas atau mengalihkan tugas (\`handoff\`) jika Anda sendiri mampu menjawab atau menggunakan tools sandbox untuk menyelesaikannya!
   - HANYA gunakan tool \`handoff\` jika pengguna secara EKSPLISIT meminta untuk berbicara dengan rekan lain (misal: "tolong oper ke Wong", "tanyakan pada Ada"), atau jika pengguna bertanya "siapa di sini yang ahli tentang X?".

2. PATUHI INSTRUKSI DENGAN AKURAT:
   - Baca dan pahami instruksi pengguna dengan sangat teliti. Kerjakan apa yang diminta secara presisi, jangan melakukan hal lain yang menyimpang dari yang diperintahkan.
   - Jika diminta menganalisis gambar/file, fokuslah pada isi gambar/file tersebut secara mendalam.
   - Jika diminta menjalankan kode atau perintah terminal, uji dengan cermat di sandbox dan verifikasi hasilnya sebelum menyimpulkan.`);

      systemPromptParts.push(`=== TOOLS & CAPABILITIES ===
You have access to the following tools:
1. \`handoff\`: Transfer the conversation or task to another teammate bot in this group chat if their specialty is a better fit.
2. Computer Sandbox Tools (available if you have an active sandbox environment):
   - \`bash\`: Run terminal commands in your Linux sandbox environment.
   - \`readFile\`: Read file contents from the sandbox filesystem (e.g. 'MEMORY.md').
   - \`writeFile\`: Create or update files in the sandbox filesystem (e.g. 'MEMORY.md').
   - \`listFiles\`: List files and directory structures in the sandbox.
   - \`openImage\`: Open and display an image on the sandbox desktop screen (:0) to show it on the live VNC preview.
   - \`mouseClick\`, \`mouseMove\`, \`mouseScroll\`: GUI mouse controls.
   - \`keyboardType\`, \`keyboardPress\`: GUI keyboard controls.
   - \`viewScreen\`: Internal screenshot for your visual perception (never render raw base64 image in chat).
   - \`showScreen\`: Capture and show screenshot directly to the user in chat when requested.
   - \`getDisplayInfo\`: View screen dimensions.

CRITICAL RULES:
- When a handoff is warranted, call the \`handoff\` tool before concluding your turn.
- When the user asks to see the screen or for a screenshot, ALWAYS call \`showScreen\`.
- Communicate clearly, professionally, and stay true to your personality.

=== PANDUAN UTAMA: ANALISIS VISUAL GAMBAR & PENGGUNAAN TOOLS ===
1. ANALISIS GAMBAR LANGSUNG (MULTIMODAL):
   - Jika pengguna melampirkan gambar/foto (misal: "siapa artis ini?", "analisis gambar ini", "ada error apa di screenshot ini?"):
   - Anda TELAH MENERIMA dan DAPAT MELIHAT gambar tersebut secara langsung melalui token visual multimodal Anda!
   - JANGAN PERNAH menjalankan perintah bash untuk mencari file gambar di filesystem sandbox (seperti \`find / -name "*image*"\` atau \`find /tmp\`).
   - Langsung amati gambar tersebut, kenali objek/orang/teks di dalamnya, dan berikan jawaban yang lengkap, detail, dan solutif.

2. DOKUMEN & FILE SANDBOX:
   - Jika pengguna mengunggah dokumen (PDF, kode, CSV, JSON), isi teksnya telah disertakan dalam pesan atau di \`/home/daytona/uploads/\`.

3. TIDAK BOLEH PASRAH / BERHENTI TANPA JAWABAN (ANTI-GHOSTING):
   - Anda DILARANG KERAS pasrah atau menyerah jika suatu tool gagal atau perintah tidak ditemukan di sandbox.
   - Jika ada tool yang gagal atau tidak terinstall, jangan mengulang perintah yang sama terus-menerus.
   - Berikan kesimpulan dan jawaban akhir yang jelas, ramah, dan tuntas kepada pengguna dalam Bahasa Indonesia. JANGAN PERNAH mengakhiri giliran tanpa teks feedback!`);
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

      systemPromptParts.push(`=== FILE UPLOADS & USER ATTACHMENTS (SANDBOX STORAGE) ===
When the user attaches or uploads files (ZIP archives, screenshots, code, data files):
- The files are stored directly in your Daytona Linux sandbox under \`/home/daytona/uploads/\`.
- ZIP archives are automatically extracted into their respective directories under \`/home/daytona/uploads/\`.
- You can freely inspect, execute, compile, test, or modify these files using \`bash\`, \`readFile\`, \`writeFile\`, and \`listFiles\` tools.
- Because the files reside directly on your disk, prompt tokens are kept minimal while giving you full access to complete projects and datasets!

=== AVAILABLE TOOLS & CAPABILITIES ===
You have full computer and sandbox access via your tools:
- bash: Execute terminal commands inside the Linux environment.
- readFile: Read file contents from the sandbox filesystem (e.g. 'MEMORY.md').
- writeFile: Create or update files in the sandbox filesystem (e.g. 'MEMORY.md').
- listFiles: List files and directory structures.
- openImage: Open and display an image on the sandbox desktop screen (:0) to show it on the live VNC preview.
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
3. Stay in character, think step by step when using computer tools, and communicate clearly.

=== PANDUAN UTAMA: ANALISIS VISUAL GAMBAR & PENGGUNAAN TOOLS ===
1. ANALISIS GAMBAR LANGSUNG (MULTIMODAL):
   - Jika pengguna melampirkan gambar/foto (misal: "siapa artis ini?", "analisis gambar ini", "ada error apa di screenshot ini?"):
   - Anda TELAH MENERIMA dan DAPAT MELIHAT gambar tersebut secara langsung melalui token visual multimodal Anda!
   - JANGAN PERNAH menjalankan perintah bash untuk mencari file gambar di filesystem sandbox (seperti \`find / -name "*image*"\` atau \`find /tmp\`).
   - Langsung amati gambar tersebut, kenali objek/orang/teks di dalamnya, dan berikan jawaban yang lengkap, detail, dan solutif.

2. DOKUMEN & FILE SANDBOX:
   - Jika pengguna mengunggah dokumen (PDF, kode, CSV, JSON), isi teksnya telah disertakan dalam pesan atau di \`/home/daytona/uploads/\`.

3. TIDAK BOLEH PASRAH / BERHENTI TANPA JAWABAN (ANTI-GHOSTING):
   - Anda DILARANG KERAS pasrah atau menyerah jika suatu tool gagal atau perintah tidak ditemukan di sandbox.
   - Jika ada tool yang gagal atau tidak terinstall, jangan mengulang perintah yang sama terus-menerus.
   - Berikan kesimpulan dan jawaban akhir yang jelas, ramah, dan tuntas kepada pengguna dalam Bahasa Indonesia. JANGAN PERNAH mengakhiri giliran tanpa teks feedback!`);
    } else {
      systemPromptParts.push("You are a helpful and intelligent AI teammate.");
    }

    const systemInstruction = systemPromptParts.join("\n\n");

    if (activeBot) {
      chat.setUIMessageStreamOptions({
        messageMetadata: () => ({
          botId: activeBot.id,
          botName: activeBot.name,
        }),
      });
    }

    // Resolve dynamic AI provider and model configured by the user
    let activeAiBaseUrl =
      process.env.AI_BASE_URL ||
      process.env.NINE_ROUTER_BASE_URL ||
      "https://omoapicall.web.id/v1";
    let activeAiApiKey =
      process.env.AI_API_KEY || process.env.NINE_ROUTER_API_KEY || "";
    let activeAiModel = process.env.AI_MODEL || "glm-5.3-flashh";

    if (ownerUserId) {
      try {
        const [setting] = await db
          .select()
          .from(userSettings)
          .where(eq(userSettings.userId, ownerUserId))
          .limit(1);

        if (setting) {
          if (setting.aiBaseUrl) activeAiBaseUrl = setting.aiBaseUrl;
          if (setting.aiApiKey) activeAiApiKey = setting.aiApiKey;
          if (setting.aiModel) activeAiModel = setting.aiModel;
        }
      } catch (err) {
        console.error("Failed to query userSettings for owner:", err);
      }
    }

    const sanitizedMessages = sanitizeMessagesForModel(messages, activeAiModel);

    const turnAiClient = createOpenAI({
      baseURL: activeAiBaseUrl,
      apiKey: activeAiApiKey,
    });

    return sandboxContextStorage.run(
      {
        chatId: chatId ?? "",
        sandboxId: activeBot?.sandboxId ?? null,
        isGroup,
        memberBots: groupMembers,
      },
      () =>
        streamText({
          model: turnAiClient.chat(activeAiModel),
          system: systemInstruction,
          messages: sanitizedMessages,
          tools,
          stopWhen: stepCountIs(80),
          maxOutputTokens: 65536,
          temperature: 0.2,
          abortSignal: signal,
        })
    );
  },
});
