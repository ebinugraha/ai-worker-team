import { Suspense } from "react";
import { getBotByIdAction } from "@/action/bot";
import { ChatBotView } from "@/components/chat-bot-view";
import { ChatHeaderSkeleton } from "@/components/chat-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatResizableLayout } from "@/components/chat-resizable-layout";

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

function ChatPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col h-full min-h-0 min-w-0 w-full overflow-hidden">
      <ChatHeaderSkeleton />
      <div className="flex flex-1 flex-col h-full min-h-0 w-full p-4 sm:p-6 md:p-8 justify-between animate-pulse">
        <div className="flex flex-col gap-4 w-full pt-2">
          <div className="flex justify-end w-full">
            <Skeleton className="h-10 w-64 rounded-full bg-neutral-800" />
          </div>
          <div className="flex justify-start w-full">
            <Skeleton className="h-10 w-96 rounded-full bg-neutral-800" />
          </div>
        </div>
        <div className="w-full pb-2">
          <Skeleton className="h-24 w-full rounded-2xl bg-neutral-900" />
        </div>
      </div>
    </div>
  );
}

async function ChatContent({ params }: ChatPageProps) {
  const { chatId } = await params;
  const result = await getBotByIdAction(chatId);
  const bot = result.success && result.data ? result.data : null;

  return (
    <ChatResizableLayout
      botId={chatId}
      botName={bot?.name ?? "Chatbot"}
      botAvatar={bot?.avatar ?? "bot-default"}
      botJob={bot?.job ?? ""}
      botInstruction={bot?.instruction ?? ""}
      sandboxId={bot?.sandboxId ?? null}
    >
      <ChatBotView
        key={chatId}
        chatId={chatId}
        botName={bot?.name ?? "Chatbot"}
        botAvatar={bot?.avatar ?? "bot-default"}
        botJob={bot?.job ?? ""}
        botInstruction={bot?.instruction ?? ""}
      />
    </ChatResizableLayout>
  );
}

export default function ChatPage({ params }: ChatPageProps) {
  return (
    <div className="flex flex-1 flex-col h-full min-h-0 min-w-0 w-full overflow-hidden">
      <Suspense fallback={<ChatPageSkeleton />}>
        <ChatContent params={params} />
      </Suspense>
    </div>
  );
}
