"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db, bots } from "@/db";
import { eq, desc, and } from "drizzle-orm";

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

    const newBot = {
      id: `bot_${crypto.randomUUID()}`,
      userId,
      name: name.trim(),
      job: job.trim(),
      instruction: instructions?.trim() || null,
      avatar: avatar?.trim() || "bot-ada",
      sandboxId: null,
    };

    const [inserted] = await db.insert(bots).values(newBot).returning();

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

export async function getUserBotsAction(): Promise<
  ActionResult<Array<typeof bots.$inferSelect>>
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

    return {
      success: true,
      data: userBots,
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
