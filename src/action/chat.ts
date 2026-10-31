"use server";

import { auth as clerkAuth } from "@clerk/nextjs/server";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { runs } from "@trigger.dev/sdk/v3";
import {
  chat,
  defaultStorage,
  type ChatStartSessionParams,
} from "@trigger.dev/sdk/ai";
import { revalidatePath } from "next/cache";
import { db, chats, chatMembers, bots } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import { formatChatPreview } from "@/lib/clean-text";
import type { chatAgent } from "../../trigger/chat";

const baseStartSession =
  chat.createStartSessionAction<typeof chatAgent>("chat-agent");
const baseLoadTranscript = chat.createLoadTranscriptAction(defaultStorage, {
  limit: 50,
});

export async function startChatSession(
  params: ChatStartSessionParams<typeof chatAgent>
) {
  const { userId } = await clerkAuth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const result = await baseStartSession(params);
  if (result && typeof result === "object" && "run" in result) {
    const runObj = (result as { run?: { id?: string } }).run;
    if (params.chatId && runObj?.id) {
      await db
        .update(chats)
        .set({ latestRunId: runObj.id })
        .where(eq(chats.id, params.chatId))
        .catch(() => {});
    }
  }
  return result;
}

export async function stopChatGeneration(chatIdOrRunId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { userId } = await clerkAuth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    let runId = chatIdOrRunId;
    if (!runId.startsWith("run_")) {
      const [chat] = await db
        .select({ latestRunId: chats.latestRunId })
        .from(chats)
        .where(eq(chats.id, chatIdOrRunId))
        .limit(1);

      if (chat?.latestRunId) {
        runId = chat.latestRunId;
      } else {
        return {
          success: false,
          error: "Tidak ada proses aktif yang ditemukan untuk chat ini",
        };
      }
    }

    await runs.cancel(runId);
    return { success: true };
  } catch (err) {
    console.error("Failed to cancel run:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menghentikan agent",
    };
  }
}

export async function mintChatAccessToken(chatId: string) {
  const { userId } = await clerkAuth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return triggerAuth.createPublicToken({
    scopes: {
      read: { sessions: chatId },
      write: { sessions: chatId },
    },
    expirationTime: "1h",
  });
}

export async function loadChatTranscript(params: {
  chatId: string;
  clientData?: unknown;
  limit?: number;
  before?: string;
}) {
  const { userId } = await clerkAuth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const result = await baseLoadTranscript(params);
  if (result && Array.isArray(result.messages)) {
    const seen = new Map<string, number>();
    for (let i = 0; i < result.messages.length; i++) {
      const msg = result.messages[i];
      if (msg && msg.id) {
        seen.set(msg.id, i);
      }
    }
    result.messages = result.messages.filter((msg, index) => {
      if (!msg || !msg.id) return false;
      return seen.get(msg.id) === index;
    });

    // Auto-sync lastMessagePreview if empty in database
    if (result.messages.length > 0 && params.chatId) {
      const lastMsg = result.messages[result.messages.length - 1];
      let preview = "";
      if (lastMsg && Array.isArray(lastMsg.parts)) {
        for (const part of lastMsg.parts) {
          if (part && "text" in part && typeof (part as { text?: unknown }).text === "string") {
            preview = (part as { text: string }).text;
          }
        }
      }
      if (preview) {
        const clean = formatChatPreview(preview, 160);
        if (clean) {
          db.update(chats)
            .set({
              lastMessagePreview: clean,
              lastMessageAt: new Date(),
            })
            .where(eq(chats.id, params.chatId))
            .catch(() => {});
        }
      }
    }
  }

  return result;
}

export interface ChatMemberBot {
  id: string;
  name: string;
  avatar: string;
  job: string;
  instruction: string | null;
  sandboxId: string | null;
}

export interface ChatDetails {
  id: string;
  isGroup: boolean;
  name: string;
  avatar?: string;
  avatars?: string[];
  members: ChatMemberBot[];
  job?: string;
  instruction?: string | null;
  sandboxId?: string | null;
}

export async function createGroupChatAction(payload: {
  name: string;
  botIds: string[];
}): Promise<{
  success: boolean;
  data?: { chatId: string; name: string };
  error?: string;
}> {
  const { userId } = await clerkAuth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const trimmedName = payload.name?.trim();
  if (!trimmedName) {
    return { success: false, error: "Nama obrolan grup wajib diisi" };
  }

  const botIds = Array.isArray(payload.botIds)
    ? payload.botIds.filter(Boolean)
    : [];
  if (botIds.length < 2) {
    return {
      success: false,
      error: "Pilih minimal 2 bot untuk membuat obrolan grup",
    };
  }

  try {
    const chatId = `group_${crypto.randomUUID()}`;

    // Insert group chat
    await db.insert(chats).values({
      id: chatId,
      userId,
      kind: "group",
      name: trimmedName,
    });

    // Insert members
    const members = botIds.map((botId) => ({
      chatId,
      botId,
    }));
    await db.insert(chatMembers).values(members);

    revalidatePath("/", "layout");
    revalidatePath(`/chat/${chatId}`);

    return {
      success: true,
      data: { chatId, name: trimmedName },
    };
  } catch (err) {
    console.error("Failed to create group chat:", err);
    return { success: false, error: "Gagal membuat obrolan grup" };
  }
}

export async function updateGroupChatAction(payload: {
  chatId: string;
  name: string;
  botIds: string[];
}): Promise<{
  success: boolean;
  data?: { chatId: string; name: string; botIds: string[] };
  error?: string;
}> {
  const { userId } = await clerkAuth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const { chatId, name, botIds } = payload;
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return { success: false, error: "Nama obrolan grup wajib diisi" };
  }

  const validBotIds = Array.isArray(botIds) ? botIds.filter(Boolean) : [];
  if (validBotIds.length < 2) {
    return {
      success: false,
      error: "Pilih minimal 2 bot untuk obrolan grup",
    };
  }

  try {
    const [existingChat] = await db
      .select()
      .from(chats)
      .where(
        and(eq(chats.id, chatId), eq(chats.userId, userId), eq(chats.kind, "group"))
      )
      .limit(1);

    if (!existingChat) {
      return {
        success: false,
        error: "Obrolan grup tidak ditemukan atau tidak memiliki akses",
      };
    }

    // 1. Update group chat name
    await db
      .update(chats)
      .set({ name: trimmedName })
      .where(eq(chats.id, chatId));

    // 2. Replace members
    await db.delete(chatMembers).where(eq(chatMembers.chatId, chatId));

    const newMembers = validBotIds.map((botId) => ({
      chatId,
      botId,
    }));
    await db.insert(chatMembers).values(newMembers);

    revalidatePath("/", "layout");
    revalidatePath(`/chat/${chatId}`);

    return {
      success: true,
      data: { chatId, name: trimmedName, botIds: validBotIds },
    };
  } catch (err) {
    console.error("Failed to update group chat:", err);
    return { success: false, error: "Gagal memperbarui obrolan grup" };
  }
}

export async function deleteGroupChatAction(chatId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { userId } = await clerkAuth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const [existingChat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .limit(1);

    if (!existingChat) {
      return {
        success: false,
        error: "Obrolan grup tidak ditemukan atau tidak memiliki akses",
      };
    }

    await db.delete(chatMembers).where(eq(chatMembers.chatId, chatId));
    await db.delete(chats).where(eq(chats.id, chatId));

    revalidatePath("/", "layout");
    revalidatePath("/");

    return { success: true };
  } catch (err) {
    console.error("Failed to delete group chat:", err);
    return { success: false, error: "Gagal menghapus obrolan grup" };
  }
}

export async function getChatWithMembersAction(
  chatId: string
): Promise<{ success: boolean; data?: ChatDetails; error?: string }> {
  try {
    // 1. Check if chatId exists in chats table
    const [existingChat] = await db
      .select()
      .from(chats)
      .where(eq(chats.id, chatId))
      .limit(1);

    if (existingChat && existingChat.kind === "group") {
      const memberRows = await db
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

      return {
        success: true,
        data: {
          id: existingChat.id,
          isGroup: true,
          name: existingChat.name || "Group Chat",
          avatars: memberRows.map((m) => m.avatar),
          members: memberRows,
        },
      };
    }

    // 2. Check if chatId is a direct bot ID
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

    if (bot) {
      return {
        success: true,
        data: {
          id: bot.id,
          isGroup: false,
          name: bot.name,
          avatar: bot.avatar,
          job: bot.job,
          instruction: bot.instruction,
          sandboxId: bot.sandboxId,
          members: [bot],
        },
      };
    }

    return { success: false, error: "Obrolan tidak ditemukan" };
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      ("digest" in err ||
        ("cause" in err &&
          err.cause &&
          typeof err.cause === "object" &&
          "digest" in err.cause) ||
        (err instanceof Error &&
          err.message.includes("During prerendering")))
    ) {
      throw err;
    }
    console.error("Failed to fetch chat details:", err);
    return { success: false, error: "Gagal memuat detail obrolan" };
  }
}

export interface GroupChatItem {
  id: string;
  name: string;
  avatars: string[];
  members: ChatMemberBot[];
  lastMessagePreview?: string | null;
  lastMessageAt?: Date | string | null;
  createdAt: Date | string | null;
}

export async function getUserGroupChatsAction(): Promise<{
  success: boolean;
  data?: GroupChatItem[];
  error?: string;
}> {
  const { userId } = await clerkAuth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const groupChats = await db
      .select()
      .from(chats)
      .where(and(eq(chats.userId, userId), eq(chats.kind, "group")))
      .orderBy(desc(chats.createdAt));

    const results: GroupChatItem[] = [];

    for (const chatItem of groupChats) {
      const memberRows = await db
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
        .where(eq(chatMembers.chatId, chatItem.id));

      results.push({
        id: chatItem.id,
        name: chatItem.name || "Group Chat",
        avatars: memberRows.map((m) => m.avatar),
        members: memberRows,
        lastMessagePreview: formatChatPreview(chatItem.lastMessagePreview),
        lastMessageAt: chatItem.lastMessageAt,
        createdAt: chatItem.createdAt,
      });
    }

    return { success: true, data: results };
  } catch (err) {
    console.error("Failed to fetch user group chats:", err);
    return { success: false, error: "Gagal memuat daftar obrolan grup" };
  }
}

export async function recordChatActivityAction(payload: {
  chatId: string;
  preview: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await clerkAuth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const { chatId, preview } = payload;
    if (!chatId) {
      return { success: false, error: "Missing chatId" };
    }

    const cleanText = formatChatPreview(preview, 160);

    const now = new Date();

    const [existingChat] = await db
      .select({ id: chats.id })
      .from(chats)
      .where(eq(chats.id, chatId))
      .limit(1);

    if (existingChat) {
      await db
        .update(chats)
        .set({
          lastMessagePreview: cleanText,
          lastMessageAt: now,
        })
        .where(eq(chats.id, chatId));
    } else {
      const [bot] = await db
        .select()
        .from(bots)
        .where(eq(bots.id, chatId))
        .limit(1);

      if (bot) {
        await db.insert(chats).values({
          id: bot.id,
          userId,
          kind: "direct",
          name: bot.name,
          lastMessagePreview: cleanText,
          lastMessageAt: now,
          createdAt: bot.createdAt,
        });

        await db
          .insert(chatMembers)
          .values({
            chatId: bot.id,
            botId: bot.id,
            joinedAt: bot.createdAt,
          })
          .onConflictDoNothing();
      }
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("Failed to record chat activity:", err);
    return { success: false, error: "Gagal mencatat pesan terakhir" };
  }
}
