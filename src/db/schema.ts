import {
  pgTable,
  index,
  text,
  timestamp,
  foreignKey,
  primaryKey,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const chatKind = pgEnum("chat_kind", ["direct", "group"]);

export const chats = pgTable(
  "chats",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id").notNull(),
    kind: chatKind("kind").default("direct").notNull(),
    name: text("name"),
    lastMessagePreview: text("last_message_preview"),
    lastMessageAt: timestamp("last_message_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("chats_user_id_idx").on(table.userId)],
);

export const bots = pgTable(
  "bots",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    avatar: text("avatar").notNull(),
    job: text("job").notNull(),
    instruction: text("instruction"),
    sandboxId: text("sandbox_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("bots_user_id_idx").on(table.userId)],
);

export const chatMembers = pgTable(
  "chat_members",
  {
    chatId: text("chat_id").notNull(),
    botId: text("bot_id").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chat_members_bot_id_idx").on(table.botId),
    foreignKey({
      columns: [table.chatId],
      foreignColumns: [chats.id],
      name: "chat_members_chat_id_chats_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.botId],
      foreignColumns: [bots.id],
      name: "chat_members_bot_id_bots_id_fk",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.chatId, table.botId],
      name: "chat_members_chat_id_bot_id_pk",
    }),
  ],
);

export const chatsRelations = relations(chats, ({ many }) => ({
  members: many(chatMembers),
}));

export const botsRelations = relations(bots, ({ many }) => ({
  members: many(chatMembers),
}));

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMembers.chatId],
    references: [chats.id],
  }),
  bot: one(bots, {
    fields: [chatMembers.botId],
    references: [bots.id],
  }),
}));
