import { Suspense } from "react";

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

async function ChatContent({ params }: ChatPageProps) {
  const { chatId } = await params;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-xs max-w-md w-full">
      <h1 className="text-lg font-semibold text-foreground">Chatbot</h1>
      <p className="mt-2 text-sm text-muted-foreground">ID: {chatId}</p>
    </div>
  );
}

export default function ChatPage({ params }: ChatPageProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <Suspense
        fallback={
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs max-w-md w-full animate-pulse">
            <div className="h-6 w-24 bg-muted rounded mx-auto" />
            <div className="h-4 w-36 bg-muted rounded mx-auto mt-2" />
          </div>
        }
      >
        <ChatContent params={params} />
      </Suspense>
    </div>
  );
}
