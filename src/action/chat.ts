"use server";

import { auth as clerkAuth } from "@clerk/nextjs/server";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import {
  chat,
  defaultStorage,
  type ChatStartSessionParams,
} from "@trigger.dev/sdk/ai";
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

  return baseStartSession(params);
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

  return baseLoadTranscript(params);
}
