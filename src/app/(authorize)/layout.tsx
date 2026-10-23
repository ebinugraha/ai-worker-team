import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ai-worker-team - Authentication",
  description: "Sign in to AI Worker Team",
};

export default function AuthorizeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
