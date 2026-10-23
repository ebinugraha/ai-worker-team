import type { Metadata } from "next";
import { Suspense } from "react";
import { getBotByIdAction } from "@/action/bot";
import { ChatHeader, ChatHeaderSkeleton } from "@/components/chat-header";

export const metadata: Metadata = {
  title: "Chat - ai-worker-team",
  description: "Chatbot conversation workspace",
};

interface ChatLayoutProps {
  children: React.ReactNode;
  params: Promise<{ chatId: string }>;
}

async function AsyncChatHeader({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  const result = await getBotByIdAction(chatId);
  const bot = result.success && result.data ? result.data : null;

  return (
    <ChatHeader
      botId={chatId}
      name={bot?.name ?? "Chatbot"}
      avatar={bot?.avatar ?? "bot-default"}
      job={bot?.job ?? ""}
      instruction={bot?.instruction ?? ""}
    />
  );
}

export default function ChatLayout({
  children,
  params,
}: ChatLayoutProps) {
  return (
    <div className="flex flex-1 flex-col h-full min-h-0 min-w-0 w-full overflow-hidden">
      <Suspense fallback={<ChatHeaderSkeleton />}>
        <AsyncChatHeader params={params} />
      </Suspense>
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
