import type { Metadata } from "next";
import { Suspense } from "react";
import { getUserBotsAction } from "@/action/bot";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SidebarMenu } from "@/components/sidebar-menu";

export const metadata: Metadata = {
  title: "ai-worker-team - Dashboard",
  description: "Dashboard Workspace",
};

async function AsyncSidebar() {
  const result = await getUserBotsAction();
  const userBots = result.success && result.data ? result.data : [];

  return <SidebarMenu initialBots={userBots} />;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Suspense fallback={<SidebarMenu initialBots={[]} />}>
        <AsyncSidebar />
      </Suspense>
      <SidebarInset className="flex-1 flex flex-col min-w-0">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
