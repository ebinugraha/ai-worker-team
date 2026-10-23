import type { Metadata } from "next";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SidebarMenu } from "@/components/sidebar-menu";

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
    <SidebarProvider>
      <SidebarMenu />
      <SidebarInset className="flex-1 flex flex-col min-w-0">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
