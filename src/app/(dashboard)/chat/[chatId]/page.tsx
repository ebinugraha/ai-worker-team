import { Suspense } from "react";
import { getBotByIdAction } from "@/action/bot";
import { ChatBotView } from "@/components/chat-bot-view";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

function ChatContentSkeleton() {
  return (
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
  );
}

async function ChatContent({ params }: ChatPageProps) {
  const { chatId } = await params;
  const result = await getBotByIdAction(chatId);
  const bot = result.success && result.data ? result.data : null;

  return (
    <ChatBotView
      key={chatId}
      chatId={chatId}
      botName={bot?.name ?? "Chatbot"}
      botAvatar={bot?.avatar ?? "bot-default"}
      botJob={bot?.job ?? ""}
      botInstruction={bot?.instruction ?? ""}
    />
  );
}

export default function ChatPage({ params }: ChatPageProps) {
  return (
    <div className="flex flex-1 flex-col h-full min-h-0 min-w-0 w-full overflow-hidden">
      <Suspense fallback={<ChatContentSkeleton />}>
        <ChatContent params={params} />
      </Suspense>
    </div>
  );
}
