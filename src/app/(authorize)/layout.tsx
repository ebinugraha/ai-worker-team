import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Genichiro - Authentication",
  description: "Sign in to Genichiro Workspace",
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
