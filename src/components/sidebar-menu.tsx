"use client";

import * as React from "react";
import { UserButton } from "@clerk/nextjs";
import { PlusIcon, SearchIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarMenuProps extends React.ComponentProps<typeof Sidebar> {
  onNewChat?: () => void;
}

export function SidebarMenu({ onNewChat, ...props }: SidebarMenuProps) {
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border" {...props}>
      {/* Top Header Section */}
      <SidebarHeader className="p-3 pb-2 gap-3">
        {/* Top Action Row: '+' button on the top right */}
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          >
            <PlusIcon className="size-4" />
            <span className="sr-only">New chat</span>
          </Button>
        </div>

        {/* Search Input with ⌘K badge */}
        <div className="relative flex items-center w-full">
          <SearchIcon className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search"
            className="h-8 w-full pl-8 pr-11 text-xs bg-sidebar-accent/50 border-sidebar-border rounded-lg placeholder:text-muted-foreground/70 focus-visible:ring-1"
          />
          <kbd className="absolute right-2 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/80 bg-sidebar-accent/70 border border-sidebar-border rounded pointer-events-none select-none">
            ⌘K
          </kbd>
        </div>
      </SidebarHeader>

      {/* Main Content Area (Ready for chat threads) */}
      <SidebarContent className="px-2 py-1 overflow-y-auto">
        {/* Content container - ready for dynamic chat threads */}
      </SidebarContent>

      {/* Footer: User profile with Clerk UserButton */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center w-full">
          <React.Suspense
            fallback={
              <div className="flex items-center gap-2.5 p-[1.5px]">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
            }
          >
            <UserButton
              showName
              appearance={{
                elements: {
                  rootBox: "flex items-center w-full",
                  userButtonTrigger:
                    "flex flex-row items-center justify-start gap-2.5 w-full p-[1.5px] rounded-lg bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors focus-visible:ring-1 focus-visible:ring-sidebar-ring outline-none",
                  userButtonBox:
                    "flex flex-row items-center justify-start gap-2.5 w-full text-left",
                  userButtonAvatarBox: "size-8 shrink-0 rounded-full order-1",
                  userButtonOuterIdentifier:
                    "text-sm font-medium text-sidebar-foreground text-left truncate max-w-[150px] order-2",
                },
              }}
            />
          </React.Suspense>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export { SidebarMenu as AppSidebar };
export default SidebarMenu;
