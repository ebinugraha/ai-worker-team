import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ai-worker-team - Dashboard",
  description: "Dashboard Workspace",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col w-full">
      {children}
    </div>
  );
}
