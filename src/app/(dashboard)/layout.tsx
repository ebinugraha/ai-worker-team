import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getUserBotsAction } from "@/action/bot";
import { getUserGroupChatsAction } from "@/action/chat";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SidebarMenu } from "@/components/sidebar-menu";

export const metadata: Metadata = {
  title: "Genichiro - Dashboard",
  description: "Dashboard Workspace",
};

function SidebarFallback() {
  return (
    <div
      aria-hidden="true"
      className="hidden md:flex flex-col w-(--sidebar-width) h-svh border-r border-sidebar-border bg-sidebar p-3 gap-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-5 rounded-md bg-sidebar-accent/50 animate-pulse" />
          <div className="h-4 w-20 rounded bg-sidebar-accent/50 animate-pulse" />
        </div>
        <div className="size-7 rounded-lg bg-sidebar-accent/50 animate-pulse" />
      </div>
      <div className="h-8 w-full rounded-lg bg-sidebar-accent/50 animate-pulse" />
      <div className="flex-1 flex flex-col gap-2 mt-2">
        <div className="h-14 w-full rounded-xl bg-sidebar-accent/30 animate-pulse" />
        <div className="h-14 w-full rounded-xl bg-sidebar-accent/30 animate-pulse" />
      </div>
      <div className="pt-2 border-t border-sidebar-border flex items-center gap-2">
        <div className="size-8 rounded-full bg-sidebar-accent/50 animate-pulse" />
        <div className="h-4 w-24 rounded bg-sidebar-accent/50 animate-pulse" />
      </div>
    </div>
  );
}

async function AsyncSidebar() {
  await connection();
  const [botsResult, groupChatsResult] = await Promise.all([
    getUserBotsAction(),
    getUserGroupChatsAction(),
  ]);

  const userBots = botsResult.success && botsResult.data ? botsResult.data : [];
  const groupChats =
    groupChatsResult.success && groupChatsResult.data ? groupChatsResult.data : [];

  return (
    <SidebarMenu initialBots={userBots} initialGroupChats={groupChats} />
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider className="h-svh max-h-svh overflow-hidden">
      <Suspense fallback={<SidebarFallback />}>
        <AsyncSidebar />
      </Suspense>
      <SidebarInset className="flex-1 flex flex-col min-w-0 h-svh max-h-svh overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
