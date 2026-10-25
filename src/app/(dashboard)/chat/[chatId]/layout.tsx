import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat - ai-worker-team",
  description: "Chatbot conversation workspace",
};

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="flex flex-1 flex-col h-full min-h-0 min-w-0 w-full overflow-hidden">
      {children}
    </div>
  );
}
