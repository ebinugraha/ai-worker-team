"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db, bots, chats, chatMembers } from "@/db";
import { eq, desc, and } from "drizzle-orm";
import { formatChatPreview } from "@/lib/clean-text";
import { createBotSandbox, deleteBotSandbox, getSandboxVncUrl } from "@/lib/daytona";

export interface CreateBotInput {
  name: string;
  job: string;
  instructions?: string;
  avatar: string;
}

export interface UpdateBotInput {
  id: string;
  name: string;
  job: string;
  instructions?: string;
  avatar: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createBotAction(
  input: CreateBotInput
): Promise<ActionResult<typeof bots.$inferSelect>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "Unauthorized: Please sign in to create a bot.",
      };
    }

    const { name, job, instructions, avatar } = input;

    if (!name?.trim()) {
      return { success: false, error: "Bot name is required." };
    }

    if (!job?.trim()) {
      return { success: false, error: "Bot job description is required." };
    }

    let sandboxId: string | null = null;
    try {
      sandboxId = await createBotSandbox(name.trim());
    } catch (daytonaErr) {
      console.error("Failed to create Daytona sandbox for bot:", daytonaErr);
    }

    const newBot = {
      id: `bot_${crypto.randomUUID()}`,
      userId,
      name: name.trim(),
      job: job.trim(),
      instruction: instructions?.trim() || null,
      avatar: avatar?.trim() || "bot-ada",
      sandboxId,
    };

    const [inserted] = await db.insert(bots).values(newBot).returning();

    // Create corresponding direct chat in `chats` and membership in `chat_members`
    await db.insert(chats).values({
      id: inserted.id,
      userId,
      kind: "direct",
      name: inserted.name,
      createdAt: inserted.createdAt,
      lastMessageAt: inserted.createdAt,
    });

    await db.insert(chatMembers).values({
      chatId: inserted.id,
      botId: inserted.id,
      joinedAt: inserted.createdAt,
    });

    // Revalidate the dashboard page to refetch data immediately
    revalidatePath("/");

    return {
      success: true,
      data: inserted,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create bot";
    return {
      success: false,
      error: message,
    };
  }
}

export type UserBotItem = typeof bots.$inferSelect & {
  lastMessagePreview?: string | null;
  lastMessageAt?: Date | null;
};

export async function getUserBotsAction(): Promise<
  ActionResult<Array<UserBotItem>>
> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const userBots = await db
      .select()
      .from(bots)
      .where(eq(bots.userId, userId))
      .orderBy(desc(bots.createdAt));

    // Ensure all user bots have entries in `chats` and `chat_members`
    for (const bot of userBots) {
      await db
        .insert(chats)
        .values({
          id: bot.id,
          userId,
          kind: "direct",
          name: bot.name,
          createdAt: bot.createdAt,
          lastMessageAt: bot.createdAt,
        })
        .onConflictDoNothing();

      await db
        .insert(chatMembers)
        .values({
          chatId: bot.id,
          botId: bot.id,
          joinedAt: bot.createdAt,
        })
        .onConflictDoNothing();
    }

    const userBotsWithChats = await db
      .select({
        id: bots.id,
        userId: bots.userId,
        name: bots.name,
        avatar: bots.avatar,
        job: bots.job,
        instruction: bots.instruction,
        sandboxId: bots.sandboxId,
        createdAt: bots.createdAt,
        lastMessagePreview: chats.lastMessagePreview,
        lastMessageAt: chats.lastMessageAt,
      })
      .from(bots)
      .leftJoin(chats, eq(bots.id, chats.id))
      .where(eq(bots.userId, userId))
      .orderBy(desc(bots.createdAt));

    return {
      success: true,
      data: userBotsWithChats.map((b) => ({
        ...b,
        lastMessagePreview: formatChatPreview(b.lastMessagePreview),
      })),
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch bots";
    return {
      success: false,
      error: message,
    };
  }
}

export async function getBotByIdAction(
  botId: string
): Promise<ActionResult<typeof bots.$inferSelect>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const [bot] = await db
      .select()
      .from(bots)
      .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
      .limit(1);

    if (!bot) {
      return {
        success: false,
        error: "Bot not found",
      };
    }

    return {
      success: true,
      data: bot,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch bot";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateBotAction(
  input: UpdateBotInput
): Promise<ActionResult<typeof bots.$inferSelect>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "Unauthorized: Please sign in to update a bot.",
      };
    }

    const { id, name, job, instructions, avatar } = input;

    if (!id) {
      return { success: false, error: "Bot ID is required." };
    }

    if (!name?.trim()) {
      return { success: false, error: "Bot name is required." };
    }

    if (!job?.trim()) {
      return { success: false, error: "Bot job description is required." };
    }

    const [updated] = await db
      .update(bots)
      .set({
        name: name.trim(),
        job: job.trim(),
        instruction: instructions?.trim() || null,
        avatar: avatar?.trim() || "bot-ada",
      })
      .where(and(eq(bots.id, id), eq(bots.userId, userId)))
      .returning();

    if (!updated) {
      return {
        success: false,
        error: "Bot not found or unauthorized.",
      };
    }

    // Keep chats table name in sync
    await db
      .update(chats)
      .set({ name: updated.name })
      .where(eq(chats.id, updated.id));

    // Revalidate paths so cache updates immediately
    revalidatePath("/");
    revalidatePath(`/chat/${id}`);

    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update bot";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteBotAction(
  botId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "Unauthorized: Please sign in to delete a bot.",
      };
    }

    if (!botId) {
      return { success: false, error: "Bot ID is required." };
    }

    const [deleted] = await db
      .delete(bots)
      .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
      .returning();

    if (!deleted) {
      return {
        success: false,
        error: "Bot not found or unauthorized.",
      };
    }

    if (deleted.sandboxId) {
      await deleteBotSandbox(deleted.sandboxId);
    }

    // Cascades to chatMembers and cleans up direct chat
    await db.delete(chats).where(eq(chats.id, botId));

    revalidatePath("/");
    revalidatePath(`/chat/${botId}`);

    return {
      success: true,
      data: { id: deleted.id },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete bot";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Returns a signed VNC URL for a bot's Daytona sandbox.
 */
export async function getBotVncUrlAction(
  sandboxId: string
): Promise<ActionResult<{ vncUrl: string }>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (!sandboxId) {
      return { success: false, error: "Sandbox ID is required" };
    }

    const vncUrl = await getSandboxVncUrl(sandboxId);
    return {
      success: true,
      data: { vncUrl },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to get VNC URL";
    console.error(`Failed to get VNC URL for sandbox ${sandboxId}:`, err);
    return {
      success: false,
      error: message,
    };
  }
}
