import {
  defaultStorage,
  type TranscriptStorage,
  type TranscriptCursors,
  type TranscriptLoadResult,
} from "@trigger.dev/sdk/ai";
import type { UIMessage } from "ai";
import { db } from "@/db";
import { chats } from "@/db/schema";
import { eq } from "drizzle-orm";

interface StoredTranscriptPayload {
  v: 1;
  entries: Array<{
    id: string;
    message: UIMessage;
    final: boolean;
  }>;
  state: unknown | null;
  cursors?: TranscriptCursors;
  updatedAt: string;
}

/**
 * Strips heavy debug grid base64 screenshots from internal `computer_use` tool outputs
 * so the transcript JSON remains lightweight and never fails remote/DB persistence,
 * while preserving user-facing `showScreen` screenshots.
 */
function compactMessageForStorage<T extends UIMessage>(msg: T): T {
  if (!msg || msg.role !== "assistant" || !Array.isArray(msg.parts)) {
    return msg;
  }

  let modified = false;
  const nextParts = msg.parts.map((part) => {
    const p = part as Record<string, unknown>;
    const isComputerUse =
      p.type === "tool-computer_use" ||
      (p.type === "dynamic-tool" && p.toolName === "computer_use");

    if (
      isComputerUse &&
      p.output &&
      typeof p.output === "object" &&
      "screenshot" in (p.output as Record<string, unknown>)
    ) {
      modified = true;
      const restOutput = { ...(p.output as Record<string, unknown>) };
      delete restOutput.screenshot;
      return {
        ...p,
        output: restOutput,
      };
    }
    return part;
  });

  if (!modified) return msg;
  return {
    ...msg,
    parts: nextParts as T["parts"],
  };
}

export async function readTranscriptFromDb(
  chatId: string
): Promise<StoredTranscriptPayload | null> {
  try {
    const rows = await db
      .select({ transcriptData: chats.transcriptData })
      .from(chats)
      .where(eq(chats.id, chatId))
      .limit(1);

    const raw = rows[0]?.transcriptData;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTranscriptPayload;
    if (!parsed || !Array.isArray(parsed.entries)) return null;
    return parsed;
  } catch (err) {
    console.warn("[transcript-storage] Failed to read transcript from DB:", err);
    return null;
  }
}

export async function writeTranscriptToDb(
  chatId: string,
  payload: StoredTranscriptPayload
): Promise<void> {
  try {
    await db
      .update(chats)
      .set({
        transcriptData: JSON.stringify(payload),
      })
      .where(eq(chats.id, chatId));
  } catch (err) {
    console.warn("[transcript-storage] Failed to write transcript to DB:", err);
  }
}

/**
 * Optimistically appends a user message to the DB transcript immediately when sent
 * from the browser, so refreshing before the Trigger.dev worker boots never loses the message.
 */
export async function appendOptimisticMessageToDb(
  chatId: string,
  message: UIMessage
): Promise<void> {
  if (!chatId || !message?.id) return;
  try {
    const existing = await readTranscriptFromDb(chatId);
    const entries = existing?.entries ? [...existing.entries] : [];
    const idx = entries.findIndex((e) => e.id === message.id);
    if (idx !== -1) {
      entries[idx] = { id: message.id, message, final: true };
    } else {
      entries.push({ id: message.id, message, final: true });
    }
    await writeTranscriptToDb(chatId, {
      v: 1,
      entries,
      state: existing?.state ?? null,
      cursors: existing?.cursors,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[transcript-storage] Optimistic append failed:", err);
  }
}

/**
 * Durable TranscriptStorage backed by Neon PostgreSQL (`chats.transcript_data`)
 * and mirrored to Trigger.dev's `defaultStorage` for session tail replay compatibility.
 */
export const dbTranscriptStorage: TranscriptStorage<unknown> = {
  async load<TUIMessage extends UIMessage = UIMessage>(
    scope: { chatId: string; clientData: unknown },
    opts?: { limit?: number; before?: string }
  ): Promise<TranscriptLoadResult<TUIMessage>> {
    const [dbData, remoteResult] = await Promise.all([
      readTranscriptFromDb(scope.chatId),
      defaultStorage
        .load<TUIMessage>(scope, opts)
        .catch(() => null as TranscriptLoadResult<TUIMessage> | null),
    ]);

    const dbMessages = (dbData?.entries ?? []).map(
      (e) => e.message as TUIMessage
    );
    const remoteMessages = remoteResult?.messages ?? [];

    // Merge messages by ID, preserving order and preferring the richer message (more parts)
    const mergedMap = new Map<string, TUIMessage>();
    const orderedIds: string[] = [];

    for (const msg of dbMessages) {
      if (!msg?.id) continue;
      mergedMap.set(msg.id, msg);
      orderedIds.push(msg.id);
    }

    for (const msg of remoteMessages) {
      if (!msg?.id) continue;
      const existing = mergedMap.get(msg.id);
      if (!existing) {
        mergedMap.set(msg.id, msg);
        orderedIds.push(msg.id);
      } else {
        const existingPartsLen = Array.isArray(existing.parts)
          ? existing.parts.length
          : 0;
        const nextPartsLen = Array.isArray(msg.parts) ? msg.parts.length : 0;
        if (nextPartsLen >= existingPartsLen) {
          mergedMap.set(msg.id, msg);
        }
      }
    }

    const messages = orderedIds
      .map((id) => mergedMap.get(id))
      .filter((m): m is TUIMessage => Boolean(m));

    const nonFinalIds = (dbData?.entries ?? [])
      .filter((e) => e.final === false)
      .map((e) => e.id);

    const cursors: TranscriptCursors | undefined =
      remoteResult?.cursors?.lastOutEventId || dbData?.cursors?.lastOutEventId
        ? {
            lastOutEventId:
              dbData?.cursors?.lastOutEventId ??
              remoteResult?.cursors?.lastOutEventId,
            lastInEventId:
              dbData?.cursors?.lastInEventId ??
              remoteResult?.cursors?.lastInEventId,
          }
        : undefined;

    return {
      messages,
      state: dbData?.state ?? remoteResult?.state ?? null,
      cursors,
      ...(nonFinalIds.length > 0
        ? { nonFinalIds }
        : remoteResult?.nonFinalIds
        ? { nonFinalIds: remoteResult.nonFinalIds }
        : {}),
    };
  },

  async loadContext<TUIMessage extends UIMessage = UIMessage>(
    scope: { chatId: string; clientData: unknown },
    event: {
      chatId: string;
      turn: number;
      trigger: "submit-message" | "regenerate-message" | "action";
      incomingMessages: TUIMessage[];
      previousMessages: TUIMessage[];
    }
  ): Promise<TUIMessage[]> {
    const dbData = await readTranscriptFromDb(scope.chatId);
    const dbMessages = (dbData?.entries ?? []).map(
      (e) => e.message as TUIMessage
    );

    // Combine DB messages with in-memory previousMessages (preserving order by ID)
    const byId = new Map<string, TUIMessage>();
    const order: string[] = [];

    for (const msg of dbMessages) {
      if (!msg?.id) continue;
      byId.set(msg.id, msg);
      order.push(msg.id);
    }

    for (const msg of event.previousMessages) {
      if (!msg?.id) continue;
      if (!byId.has(msg.id)) {
        order.push(msg.id);
      }
      byId.set(msg.id, msg);
    }

    const base = order
      .map((id) => byId.get(id))
      .filter((m): m is TUIMessage => Boolean(m));

    if (event.trigger === "regenerate-message") {
      while (base.length > 0 && base[base.length - 1].role !== "user") {
        base.pop();
      }
      return base;
    }

    for (const incoming of event.incomingMessages) {
      if (!incoming?.id) continue;
      const idx = base.findIndex((m) => m.id === incoming.id);
      if (idx !== -1) {
        base[idx] = incoming;
      } else {
        base.push(incoming);
      }
    }

    return base;
  },

  async save(ctx, changeset) {
    const compactedEntries = changeset.transcript.entries.map((entry) => ({
      id: entry.id,
      message: compactMessageForStorage(entry.message),
      final: entry.final ?? true,
    }));

    // Merge with any existing DB entries so if a continuation run started fresh
    // before reading DB, earlier messages are never wiped out.
    const existing = await readTranscriptFromDb(ctx.chatId);
    let finalEntries = compactedEntries;

    if (
      existing?.entries &&
      existing.entries.length > 0 &&
      changeset.reason !== "compaction"
    ) {
      const byId = new Map(existing.entries.map((e) => [e.id, e]));
      const order = existing.entries.map((e) => e.id);
      for (const entry of compactedEntries) {
        if (!byId.has(entry.id)) {
          order.push(entry.id);
        }
        byId.set(entry.id, entry);
      }
      finalEntries = order
        .map((id) => byId.get(id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e));
    }

    const mergedCursors: TranscriptCursors | undefined =
      changeset.cursors?.lastOutEventId ||
      changeset.cursors?.lastInEventId ||
      existing?.cursors
        ? {
            lastOutEventId:
              changeset.cursors?.lastOutEventId ??
              existing?.cursors?.lastOutEventId,
            lastInEventId:
              changeset.cursors?.lastInEventId ??
              existing?.cursors?.lastInEventId,
          }
        : undefined;

    await Promise.all([
      writeTranscriptToDb(ctx.chatId, {
        v: 1,
        entries: finalEntries,
        state: changeset.transcript.state ?? existing?.state ?? null,
        cursors: mergedCursors,
        updatedAt: new Date().toISOString(),
      }),
      defaultStorage
        .save(ctx, {
          ...changeset,
          transcript: {
            ...changeset.transcript,
            entries: finalEntries,
          },
        })
        .catch((err) => {
          console.warn(
            "[transcript-storage] defaultStorage.save fallback warning:",
            err
          );
        }),
    ]);
  },
};