"use client";

import * as React from "react";
import { UserButton } from "@clerk/nextjs";
import { PlusIcon, SearchIcon, UsersIcon } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu as UiSidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SeedAvatar } from "@/components/seed-avatar";
import { DialogCreateBot } from "@/components/dialog-create-bot";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface BotItem {
  id: string;
  name: string;
  job: string;
  avatar: string;
  instruction?: string | null;
  createdAt: Date | string | null;
}

interface SidebarMenuProps extends React.ComponentProps<typeof Sidebar> {
  initialBots?: BotItem[];
  onCreateGroupChat?: () => void;
}

function formatRelativeTime(
  dateInput: Date | string | number | null | undefined
): string {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const distance = formatDistanceToNowStrict(d);
    if (distance === "0 seconds") return "just now";
    return distance;
  } catch {
    return "";
  }
}

export function SidebarMenu({
  initialBots = [],
  onCreateGroupChat,
  ...props
}: SidebarMenuProps) {
  const [selectedBotId, setSelectedBotId] = React.useState<string | null>(null);
  const [openCreateBot, setOpenCreateBot] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const activeBotId = selectedBotId ?? initialBots[0]?.id ?? null;

  const filteredBots = React.useMemo(() => {
    if (!searchQuery.trim()) return initialBots;
    const q = searchQuery.toLowerCase();
    return initialBots.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.job.toLowerCase().includes(q) ||
        b.instruction?.toLowerCase().includes(q)
    );
  }, [initialBots, searchQuery]);

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border"
        {...props}
      >
        {/* Top Header Section */}
        <SidebarHeader className="p-3 pb-2 gap-3">
          {/* Top Action Row: '+' button on the top right opening DropdownMenu */}
          <div className="flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  >
                    <PlusIcon className="size-4" />
                    <span className="sr-only">Open creation menu</span>
                  </Button>
                }
              />
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={6}
                className="w-56 p-1.5 rounded-xl bg-popover/95 backdrop-blur-sm border border-border/60 shadow-lg"
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => setOpenCreateBot(true)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer"
                  >
                    <PlusIcon className="size-4" data-icon="inline-start" />
                    <span>Create new bot</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={onCreateGroupChat}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer"
                  >
                    <UsersIcon className="size-4" data-icon="inline-start" />
                    <span>Create group chat</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search Input with ⌘K badge */}
          <div className="relative flex items-center w-full">
            <SearchIcon className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="h-8 w-full pl-8 pr-11 text-xs bg-sidebar-accent/50 border-sidebar-border rounded-lg placeholder:text-muted-foreground/70 focus-visible:ring-1"
            />
            <kbd className="absolute right-2 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/80 bg-sidebar-accent/70 border border-sidebar-border rounded pointer-events-none select-none">
              ⌘K
            </kbd>
          </div>
        </SidebarHeader>

        {/* Main Content Area: Bot List Items using shadcn sidebar primitives */}
        <SidebarContent className="px-2 py-1 overflow-y-auto">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <UiSidebarMenu className="gap-1">
                {filteredBots.map((bot) => {
                  const isActive = activeBotId === bot.id;
                  const relativeTime = formatRelativeTime(bot.createdAt);

                  return (
                    <SidebarMenuItem key={bot.id}>
                      <SidebarMenuButton
                        size="lg"
                        isActive={isActive}
                        onClick={() => setSelectedBotId(bot.id)}
                        className={cn(
                          "h-auto p-2.5 rounded-xl gap-3 transition-colors cursor-pointer text-left w-full",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-2xs font-normal"
                            : "hover:bg-sidebar-accent/50"
                        )}
                      >
                        {/* Bot Avatar */}
                        <div className="size-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-muted/30">
                          <SeedAvatar seed={bot.avatar} size={36} />
                        </div>

                        {/* Bot Details (Name + Relative Time, Instruction/Job Preview) */}
                        <div className="flex flex-col min-w-0 flex-1 leading-none">
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {bot.name}
                            </span>
                            {relativeTime && (
                              <span
                                suppressHydrationWarning
                                className="text-xs text-muted-foreground shrink-0 font-normal"
                              >
                                {relativeTime}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground/80 truncate block leading-tight mt-1">
                            {bot.instruction || bot.job}
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </UiSidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
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

      <DialogCreateBot open={openCreateBot} onOpenChange={setOpenCreateBot} />
    </>
  );
}

export { SidebarMenu as AppSidebar };
export default SidebarMenu;
