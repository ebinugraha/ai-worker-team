"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db, bots } from "@/db";
import { eq, desc } from "drizzle-orm";

export interface CreateBotInput {
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
