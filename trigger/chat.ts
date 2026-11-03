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
import { formatChatPreview } from "@/lib/clean-text";
import { decryptApiKey } from "@/lib/encryption";
import { sandboxTools, sandboxContextStorage } from "./tools";
import { ensureSandboxActive, withSandboxLock } from "@/lib/daytona";

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

/**
 * Prunes historical base64 screenshots across all message parts and tool outputs.
 * Keeps at most the 2 latest screenshots to prevent context rot while preserving full reasoning history.
 */
export function pruneMessageHistory(
  rawMessages: ModelMessage[]
): ModelMessage[] {
  if (!rawMessages || rawMessages.length === 0) return rawMessages;

  const cloned = JSON.parse(JSON.stringify(rawMessages)) as ModelMessage[];

  type ImageRef =
    | { kind: "part-file"; mIdx: number; pIdx: number }
    | { kind: "tool-content-file"; mIdx: number; pIdx: number; vIdx: number }
    | { kind: "tool-json-screenshot"; mIdx: number; pIdx: number }
    | { kind: "content-file"; mIdx: number; cIdx: number };

  const imageRefs: ImageRef[] = [];

  for (let mIdx = 0; mIdx < cloned.length; mIdx++) {
    const msg = cloned[mIdx] as Record<string, unknown>;
    if (Array.isArray(msg.parts)) {
      for (let pIdx = 0; pIdx < msg.parts.length; pIdx++) {
        const part = msg.parts[pIdx] as Record<string, unknown> | undefined;
        if (
          part &&
          part.type === "file" &&
          typeof part.mediaType === "string" &&
          part.mediaType.startsWith("image/")
        ) {
          imageRefs.push({ kind: "part-file", mIdx, pIdx });
        } else if (
          part &&
          part.type === "tool-result" &&
          typeof part.output === "object" &&
          part.output !== null
        ) {
          const out = part.output as Record<string, unknown>;
          if (out.type === "content" && Array.isArray(out.value)) {
            for (let vIdx = 0; vIdx < out.value.length; vIdx++) {
              const item = out.value[vIdx] as
                | Record<string, unknown>
                | undefined;
              if (
                item &&
                item.type === "file" &&
                typeof item.mediaType === "string" &&
                item.mediaType.startsWith("image/")
              ) {
                imageRefs.push({
                  kind: "tool-content-file",
                  mIdx,
                  pIdx,
                  vIdx,
                });
              }
            }
          }
          if (
            out.type === "json" &&
            typeof out.value === "object" &&
            out.value !== null
          ) {
            const jsonVal = out.value as Record<string, unknown>;
            if (
              typeof jsonVal.screenshot === "string" &&
              jsonVal.screenshot.length > 500
            ) {
              imageRefs.push({ kind: "tool-json-screenshot", mIdx, pIdx });
            }
          }
        }
      }
    }

    if (Array.isArray(msg.content)) {
      for (let cIdx = 0; cIdx < msg.content.length; cIdx++) {
        const item = msg.content[cIdx] as
          | Record<string, unknown>
          | undefined;
        if (
          item &&
          item.type === "file" &&
          typeof item.mediaType === "string" &&
          item.mediaType.startsWith("image/")
        ) {
          imageRefs.push({ kind: "content-file", mIdx, cIdx });
        } else if (
          item &&
          item.type === "tool-result" &&
          typeof item.output === "object" &&
          item.output !== null
        ) {
          const out = item.output as Record<string, unknown>;
          if (out.type === "content" && Array.isArray(out.value)) {
            for (let vIdx = 0; vIdx < out.value.length; vIdx++) {
              const vItem = out.value[vIdx] as
                | Record<string, unknown>
                | undefined;
              if (
                vItem &&
                vItem.type === "file" &&
                typeof vItem.mediaType === "string" &&
                vItem.mediaType.startsWith("image/")
              ) {
                imageRefs.push({
                  kind: "tool-content-file",
                  mIdx,
                  pIdx: cIdx,
                  vIdx,
                });
              }
            }
          }
        }
      }
    }
  }

  // Keep only the last 2 screenshots
  if (imageRefs.length > 2) {
    const toPrune = imageRefs.slice(0, imageRefs.length - 2);
    for (const ref of toPrune) {
      const msg = cloned[ref.mIdx] as Record<string, unknown>;
      if (ref.kind === "part-file" && Array.isArray(msg.parts)) {
        msg.parts[ref.pIdx] = {
          type: "text",
          text: "[Screenshot lama dihapus untuk menghemat konteks]",
        };
      } else if (ref.kind === "tool-content-file") {
        const partsArr = Array.isArray(msg.parts)
          ? (msg.parts as unknown[])
          : undefined;
        const contentArr = Array.isArray(msg.content)
          ? (msg.content as unknown[])
          : undefined;
        const target = (
          partsArr ? partsArr[ref.pIdx] : contentArr?.[ref.pIdx]
        ) as Record<string, unknown> | undefined;
        const out = target?.output as Record<string, unknown> | undefined;
        const valArr = out?.value;
        if (Array.isArray(valArr) && valArr[ref.vIdx]) {
          (valArr as Record<string, unknown>[])[ref.vIdx] = {
            type: "text",
            text: "[Screenshot lama dihapus untuk menghemat konteks]",
          };
        }
      } else if (ref.kind === "tool-json-screenshot" && Array.isArray(msg.parts)) {
        const target = msg.parts[ref.pIdx] as Record<string, unknown> | undefined;
        const out = target?.output as Record<string, unknown> | undefined;
        if (typeof out?.value === "object" && out.value !== null) {
          (out.value as Record<string, unknown>).screenshot =
            "[Screenshot lama dihapus untuk menghemat konteks]";
        }
      } else if (ref.kind === "content-file" && Array.isArray(msg.content)) {
        msg.content[ref.cIdx] = {
          type: "text",
          text: "[Screenshot lama dihapus untuk menghemat konteks]",
        };
      }
    }
  }

  return cloned;
}

export const chatAgent = chat.agent({
  id: "chat-agent",
  storage: defaultStorage,
  tools: sandboxTools,
  run: async ({ messages, tools, chatId, signal, streamText, clientData, ctx }) => {
    const requestedBotId = (clientData as { botId?: string } | undefined)?.botId;

    // Track latest active Trigger.dev run ID for stopChatGeneration
    const currentRunId = (ctx as { run?: { id?: string } } | undefined)?.run?.id;
    if (chatId && currentRunId) {
      db.update(chats)
        .set({ latestRunId: currentRunId })
        .where(eq(chats.id, chatId))
        .catch((err) => {
          console.error("Failed to update latestRunId in chats:", err);
        });
    }

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
    let activeBot: {
      id: string;
      name: string;
      avatar: string;
      job: string;
      instruction: string | null;
      sandboxId: string | null;
    } | null = null;

    // 1. Check if chatId is in `chats` table (direct or group)
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
          } else if (chatRecord.kind === "direct") {
            const [directBot] = await db
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
              .where(eq(chatMembers.chatId, chatId))
              .limit(1);

            if (directBot) {
              activeBot = directBot;
            }
          }
        } else {
          // If not in chats table yet, check if chatId is a direct bot
          const [botRecord] = await db
            .select()
            .from(bots)
            .where(eq(bots.id, chatId))
            .limit(1);

          if (botRecord) {
            ownerUserId = botRecord.userId;
            activeBot = botRecord;

            await db
              .insert(chats)
              .values({
                id: botRecord.id,
                userId: botRecord.userId,
                kind: "direct",
                name: botRecord.name,
                createdAt: botRecord.createdAt,
                lastMessageAt: new Date(),
              })
              .onConflictDoNothing();

            await db
              .insert(chatMembers)
              .values({
                chatId: botRecord.id,
                botId: botRecord.id,
                joinedAt: botRecord.createdAt,
              })
              .onConflictDoNothing();
          }
        }
      } catch (err) {
        console.error("Failed to query chat/bot record in trigger:", err);
      }
    }

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
        const sb = await ensureSandboxActive(activeBot.sandboxId);
        const buf = await sb.fs.downloadFile("MEMORY.md");
        const text = buf.toString("utf-8").trim();
        if (text) {
          botMemoryContent = text;
        }
      } catch {
        // If MEMORY.md does not exist yet or failed to download, initialize it
        try {
          const sb = await ensureSandboxActive(activeBot.sandboxId);
          await sb.fs.uploadFile(Buffer.from(""), "MEMORY.md");
        } catch {
          // ignore fallback initialization error
        }
      }
    }

    // Ensure all attachments sent by the user in this conversation are synced into the active bot's sandbox
    if (activeBot?.sandboxId) {
      try {
        const sb = await ensureSandboxActive(activeBot.sandboxId);

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
      `=== IDENTITY & JARVIS-GRADE COGNITIVE AGENCY ===
You are ${activeBot ? activeBot.name : "Jarvis"}, an elite Autonomous AI Partner, Systems Architect, and Computational Engineer with J.A.R.V.I.S.-grade cognitive agency, technical brilliance, and proactive execution.
${activeBot ? `Role & Job: ${activeBot.job}` : ""}
${activeBot?.instruction?.trim() ? `Specialty & Directives:\n${activeBot.instruction.trim()}` : ""}
${activeBot?.sandboxId ? `Active Sandbox Environment: Connected to an isolated Linux container (Sandbox ID: ${activeBot.sandboxId}) with root-level terminal, high-speed internet, and VNC desktop.` : ""}

YOUR OPERATING STANDARD:
- Unrivaled Competence & High Agency: You do not just discuss solutions—you actively execute them. You inspect real files, run diagnostics, install dependencies, compile, test, and deliver finished, verified results.
- Razor-Sharp Perception: You never hallucinate when you can verify with tools.
- Decisive & "Gercep": When the user gives a goal or asks a question, you act immediately and thoroughly without unnecessary hesitation or asking obvious clarifying questions if you can discover the answers yourself.`
    ];

    if (isGroup && activeBot) {
      const otherBots = groupMembers.filter((m) => m.id !== activeBot.id);

      systemPromptParts.push(`=== GROUP CHAT COLLABORATION ===
You are currently participating in a shared group chat named "${chatName || "Team Group Chat"}".
You are collaborating with a team of specialized AI bots and the human user in this workspace.

TEAMMATES IN THIS GROUP:
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
}

COLLABORATION & HANDOFF RULES:
1. PRIORITIZE DIRECT EXECUTION: If you can handle or assist with the task using your reasoning and sandbox tools, EXECUTE IT DIRECTLY. Do not deflect or bounce tasks across teammates unnecessarily.
2. DELIBERATE DELEGATION: ONLY hand off if the user explicitly requests another member (e.g., "tanyakan pada Wong", "oper ke Hemingway") or if the problem strictly falls into another member's exclusive specialty.
3. SEAMLESS TAKEOVER: When you invoke \`handoff\`, ensure a seamless transition so the user receives an immediate, helpful response.`);
    }

    if (activeBot) {
      systemPromptParts.push(`=== PERSISTENT SECOND BRAIN & CONTINUOUS SELF-LEARNING (MEMORY.md) ===
Your sandbox contains a durable, persistent second brain at "MEMORY.md". It acts as your permanent long-term memory across all chats and sessions.
- FIRST-CLASS SELF-LEARNING TOOL (\`save_memory\`):
  Whenever you discover or learn:
  1. \`user_profile\`: User's personal preferences, identity, tech stack choices, habits, or explicit directives.
  2. \`architecture\`: Key project architecture, library choices, conventions, environment quirks, or database schemas.
  3. \`task_directive\`: Active standing tasks, milestones, or user mandates.
  4. \`learned_playbook\`: A bug solution, proven troubleshooting recipe, build fix, or procedure that succeeded.
  -> CALL \`save_memory({ category, title, content })\` IMMEDIATELY! It automatically organizes and writes to "MEMORY.md".
- ACTIVE REFLEXION & CONTINUOUS IMPROVEMENT:
  After solving a non-trivial challenge or when a tool call fails and you find the fix, reflect on the lesson: *What failed? Why? What was the solution?* and record the playbook into your memory so you become progressively smarter over time!
- CROSS-SESSION KNOWLEDGE RECALL:
  When the user asks about previous discussions, rules, or facts, consult your MEMORY.md!`);

      if (botMemoryContent) {
        systemPromptParts.push(`=== CURRENT RECALLED MEMORY FROM YOUR SANDBOX (MEMORY.md) ===
The following durable facts are currently active from your "MEMORY.md":
"""
${botMemoryContent}
"""
You have already recalled this information and can reference it directly when replying to the user!`);
      }

      systemPromptParts.push(`=== CORE OPERATING PROTOCOL: HIGH-AGENCY & PROACTIVE EXECUTION ("GERCEP") ===
1. HIGH AGENCY & DIRECT ACTION:
   - When the user asks you to create, fix, debug, test, or build something, DO NOT merely list instructions for the user to follow. You have full root access to the Linux sandbox: inspect the files, run terminal commands, write the code, and verify it yourself!
   - Proactively fix obstacles: if a package is missing, install it; if a port is in use, find the process; if a test fails, analyze the stack trace and patch the code.
   - Never surrender ("Dilarang Pasrah"): if a command fails or an approach errors out, diagnose the root cause and try an alternative. Never repeat an identical failed command blindly.

2. STRUCTURED CHAIN-OF-THOUGHT REASONING:
   - For non-trivial engineering tasks or multi-step tool executions, structure your thinking inside a \`<thought>\` block:
     * **Tujuan & Analisis:** What is the core goal and expected outcome?
     * **Observasi Status:** What is the current terminal output, file content, or system state?
     * **Rencana Tindakan:** What is the exact next tool call and why?
     * **Verifikasi:** Did the previous step succeed? What proves it worked?
   - In simple conversational turns or direct explanations, communicate directly without forced thought tags.

3. 4-PHASE SYSTEMATIC DEBUGGING (NEVER GUESS):
   - Phase 1: Root Cause Investigation — Read the full error message and stack trace. Never skip lines or guess. Trace data flow upstream to where the bad value originates.
   - Phase 2: Pattern Analysis — Compare working vs broken code or references in the codebase.
   - Phase 3: Ranked Hypotheses — Form 2-3 falsifiable hypotheses before changing code. Test the most likely one with a minimal probe.
   - Phase 4: Surgical Fix & Regression Verification — Fix root cause with \`file_system\` (\`action: "edit"\` or \`editFile\`). Run tests/builds to ensure zero regressions.

4. PLAN-DO-CHECK-ACT (PDCA) ITERATIVE CYCLE:
   - **Plan:** Define clear goal and verifiable criteria.
   - **Do:** Implement changes in small, focused steps.
   - **Check:** Inspect outputs, test results, or screenshots.
   - **Act:** If successful, standardize (call \`save_memory\`). If unsuccessful, learn, refine hypothesis, and run the next cycle.

5. TOOL SELECTION & SANDBOX CAPABILITIES:
   - Terminal & CLI: ALWAYS use \`bash_exec\` for all terminal operations (running builds, git, node, python, testing, inspecting processes).
   - Code & File Operations: ALWAYS use \`file_system\` (\`action: "read"\`, \`action: "write"\`, \`action: "edit"\`, \`action: "list"\`) or \`editFile\` for surgical find-and-replace. NEVER open GUI editors in VNC.
   - Web Research & Docs: Use \`fetch_url\` to quickly inspect documentation or API responses, or curl via \`bash_exec\`.
   - Continuous Memory: Use \`save_memory\` to permanently retain learned playbooks and user facts.
   - Screen Inspection: Call \`showScreen\` immediately whenever the user asks to see what is on screen ("tampilkan layar", "screenshot", "lihat desktop").
   - Internet Access: Your sandbox has high-speed internet. You can curl APIs, clone repos, or download packages freely.

6. MASTERING COMPUTER & VNC DESKTOP OPERATION (\`computer_use\`):
   - Scope: ONLY use \`computer_use\` when interacting with visual desktop GUI applications (browsers, testing web UI, window controls).
   - Normalized Coordinates: Accept \`0\` to \`1000\` for x and y.
   - Visual Verification: Inspect the red click dot and coordinate grid stamped on returned screenshots to confirm click accuracy.
   - Handling Loaders: When a page or process is loading, call \`wait\` or \`computer_use({ action: "wait", seconds: 5 })\`.
   - Hotkeys: Use \`key\` with values like \`ctrl+c\` (cancel command), \`Return\` (enter), \`Escape\`, \`Tab\`, \`ctrl+a\`, \`ctrl+v\`, \`BackSpace\`, or arrows.
   - STRICT HYBRID RULE: NEVER type shell commands or source code via VNC virtual keyboard! Commands belong in \`bash_exec\`, code edits belong in \`file_system\` / \`editFile\`. VNC is strictly for visual interaction.

7. MULTIMODAL VISION INTELLIGENCE:
   - When the user attaches images or screenshots, they are injected directly into your visual tokens. Inspect and analyze them with superhuman detail directly. NEVER run bash search commands to look for user images on disk.
   - Document files (PDF, ZIP, code) are stored in \`/home/daytona/uploads/\`. ZIP archives are automatically extracted into subfolders ready for inspection.

8. COMMUNICATION & ELEGANCE:
   - Communicate in clear, sharp, intelligent Indonesian (or the user's language).
   - Be concise, direct, and authoritative: lead with the answer or action, not boilerplate preamble. Finished work gets a crisp summary of what was accomplished and verified.`);
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
          if (setting.aiApiKey) activeAiApiKey = decryptApiKey(setting.aiApiKey);
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

    // Record incoming user message preview in chats table
    if (chatId && messages && messages.length > 0) {
      try {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === "user") {
          let userText = "";
          if (typeof lastMsg.content === "string") {
            userText = lastMsg.content;
          } else if (Array.isArray(lastMsg.content)) {
            for (const part of lastMsg.content) {
              if (
                part &&
                part.type === "text" &&
                typeof part.text === "string"
              ) {
                userText = part.text;
              }
            }
          }
          if (userText) {
            const clean = formatChatPreview(userText, 160);
            if (clean) {
              await db
                .update(chats)
                .set({
                  lastMessagePreview: `You: ${clean}`,
                  lastMessageAt: new Date(),
                })
                .where(eq(chats.id, chatId));
            }
          }
        }
      } catch (err) {
        console.warn("Failed to record incoming user message in trigger:", err);
      }
    }

    const runExecution = async () => {
      const currentMessages: ModelMessage[] = [...sanitizedMessages];
      const maxAutoContinues = 4;
      let loopCount = 0;
      let finalSummaryText = "";

      while (loopCount <= maxAutoContinues) {
        if (signal?.aborted) break;

        const prunedMessages = pruneMessageHistory(currentMessages);

        const result = streamText({
          model: turnAiClient.chat(activeAiModel),
          system: systemInstruction,
          messages: prunedMessages,
          tools,
          stopWhen: stepCountIs(80),
          maxOutputTokens: 65536,
          temperature: 0.1,
          abortSignal: signal,
          onFinish: async ({ text }) => {
            if (text) {
              finalSummaryText = text;
            }
          },
        });

        const { message, status } = await chat.pipeAndCapture(result, {
          signal,
        });

        if (status === "error" || signal?.aborted) {
          break;
        }

        // Check if finish_task or handoff was called in this turn
        const didCallFinishTask = message?.parts?.some((p: unknown) => {
          if (typeof p !== "object" || p === null) return false;
          const rec = p as Record<string, unknown>;
          return (
            (rec.type === "tool-call" || rec.type === "tool-result") &&
            (rec.toolName === "finish_task" ||
              rec.name === "finish_task" ||
              rec.toolName === "handoff" ||
              rec.name === "handoff")
          );
        });

        if (didCallFinishTask) {
          break;
        }

        // Collect all text parts generated by the assistant
        let totalAssistantText = "";
        if (Array.isArray(message?.parts)) {
          for (const part of message.parts as unknown[]) {
            if (
              typeof part === "object" &&
              part !== null &&
              (part as Record<string, unknown>).type === "text" &&
              typeof (part as Record<string, unknown>).text === "string"
            ) {
              totalAssistantText +=
                ((part as Record<string, unknown>).text as string) + " ";
            }
          }
        }
        totalAssistantText = totalAssistantText.trim();

        // Check if the assistant already signaled conclusion in text
        const hasActionFinish =
          /<action>[\s\S]*?"type"\s*:\s*"FINISH"/i.test(totalAssistantText);
        const hasTaskCompleteKeyword =
          /tugas (?:telah )?selesai|pekerjaan (?:telah )?selesai|selesai dikerjakan|berhasil menyelesaikan/i.test(
            totalAssistantText
          );

        // If the model produced a substantive text response to the user,
        // it has already communicated its answer or completed the task.
        // Continuing would produce duplicate looping messages.
        if (
          hasActionFinish ||
          hasTaskCompleteKeyword ||
          totalAssistantText.length > 0
        ) {
          break;
        }

        if (loopCount >= maxAutoContinues) {
          break;
        }

        // Auto-nudge only when the agent stopped without producing any text response
        if (message) {
          currentMessages.push({
            role: "assistant",
            content: [{ type: "text", text: "Memproses langkah..." }],
          });

          currentMessages.push({
            role: "user",
            content:
              "SYSTEM NOTIFICATION: Jika tugas belum selesai, lanjutkan eksekusi langkah berikutnya sekarang. Jika tugas sudah selesai, panggil tool 'finish_task' atau berikan rangkuman akhir jawaban kepada pengguna.",
          });

          loopCount++;
        } else {
          break;
        }
      }

      if (chatId && finalSummaryText) {
        try {
          const clean = formatChatPreview(finalSummaryText, 160);
          if (clean) {
            await db
              .update(chats)
              .set({
                lastMessagePreview: clean,
                lastMessageAt: new Date(),
              })
              .where(eq(chats.id, chatId));
          }
        } catch (err) {
          console.warn("Failed to update chats onFinish in trigger:", err);
        }
      }
    };

    return sandboxContextStorage.run(
      {
        chatId: chatId ?? "",
        sandboxId: activeBot?.sandboxId ?? null,
        isGroup,
        memberBots: groupMembers,
      },
      () => {
        if (activeBot?.sandboxId) {
          return withSandboxLock(activeBot.sandboxId, runExecution);
        }
        return runExecution();
      }
    );
  },
});
