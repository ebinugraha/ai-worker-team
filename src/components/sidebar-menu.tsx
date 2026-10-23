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
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
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
  const [openCommand, setOpenCommand] = React.useState(false);

  const activeBotId = selectedBotId ?? initialBots[0]?.id ?? null;

  // Keyboard shortcut for Cmd+K / Ctrl+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpenCommand((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border"
        {...props}
      >
        {/* Top Header Section */}
        <SidebarHeader className="p-3 pb-2 gap-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:gap-2">
          {/* Top Action Row: '+' button on the top right opening DropdownMenu */}
          <div className="flex items-center justify-end group-data-[collapsible=icon]:justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:rounded-xl"
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

          {/* Search Trigger Button with ⌘K badge */}
          <button
            type="button"
            onClick={() => setOpenCommand(true)}
            title="Search (⌘K)"
            className={cn(
              "relative flex items-center justify-between w-full h-8 px-2.5 text-xs bg-sidebar-accent/50 hover:bg-sidebar-accent border border-sidebar-border rounded-lg text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer select-none group focus-visible:ring-1 focus-visible:ring-sidebar-ring outline-none",
              "group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:hover:bg-sidebar-accent"
            )}
          >
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <SearchIcon className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 group-data-[collapsible=icon]:size-4" />
              <span className="font-normal text-muted-foreground group-hover:text-foreground transition-colors group-data-[collapsible=icon]:hidden">
                Search
              </span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/80 bg-sidebar-accent/70 border border-sidebar-border rounded select-none pointer-events-none group-data-[collapsible=icon]:hidden">
              ⌘K
            </kbd>
          </button>
        </SidebarHeader>

        {/* Main Content Area: Bot List Items using shadcn sidebar primitives */}
        <SidebarContent className="px-2 py-1 overflow-y-auto group-data-[collapsible=icon]:px-1">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <UiSidebarMenu className="gap-1.5 group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:items-center">
                {initialBots.map((bot) => {
                  const isActive = activeBotId === bot.id;
                  const relativeTime = formatRelativeTime(bot.createdAt);

                  return (
                    <SidebarMenuItem
                      key={bot.id}
                      className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
                    >
                      <SidebarMenuButton
                        size="lg"
                        isActive={isActive}
                        tooltip={`${bot.name} • ${bot.job}`}
                        onClick={() => setSelectedBotId(bot.id)}
                        className={cn(
                          "h-auto p-2.5 rounded-xl gap-3 transition-colors cursor-pointer text-left w-full",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-2xs font-normal"
                            : "hover:bg-sidebar-accent/50",
                          "group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl"
                        )}
                      >
                        {/* Bot Avatar */}
                        <div
                          className={cn(
                            "size-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center",
                            isActive ? "bg-muted/40" : "bg-muted/30"
                          )}
                        >
                          <SeedAvatar seed={bot.avatar} size={36} />
                        </div>

                        {/* Bot Details (Name + Relative Time, Instruction/Job Preview) */}
                        <div className="flex flex-col min-w-0 flex-1 leading-none group-data-[collapsible=icon]:hidden">
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
        <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center w-full group-data-[collapsible=icon]:justify-center">
            <React.Suspense
              fallback={
                <div className="flex items-center gap-2.5 p-[1.5px] group-data-[collapsible=icon]:justify-center">
                  <Skeleton className="size-8 rounded-full shrink-0" />
                  <Skeleton className="h-4 w-28 rounded group-data-[collapsible=icon]:hidden" />
                </div>
              }
            >
              <UserButton
                showName
                appearance={{
                  elements: {
                    rootBox:
                      "flex items-center w-full group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center",
                    userButtonTrigger:
                      "flex flex-row items-center justify-start gap-2.5 w-full p-[1.5px] rounded-lg bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors focus-visible:ring-1 focus-visible:ring-sidebar-ring outline-none group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center",
                    userButtonBox:
                      "flex flex-row items-center justify-start gap-2.5 w-full text-left group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center",
                    userButtonAvatarBox: "size-8 shrink-0 rounded-full order-1",
                    userButtonOuterIdentifier:
                      "text-sm font-medium text-sidebar-foreground text-left truncate max-w-[150px] order-2 group-data-[collapsible=icon]:hidden",
                  },
                }}
              />
            </React.Suspense>
          </div>
        </SidebarFooter>

        {/* Sidebar Rail with drag & click to collapse/expand */}
        <SidebarRail />
      </Sidebar>

      {/* Command Palette Dialog (Cmd+K / Ctrl+K) */}
      <CommandDialog
        open={openCommand}
        onOpenChange={setOpenCommand}
        title="Search Bots"
        description="Search through your bots by name, job, or instructions"
      >
        <CommandInput placeholder="Search bots..." />
        <CommandList>
          <CommandEmpty>No bots found.</CommandEmpty>
          <CommandGroup heading="Bots">
            {initialBots.map((bot) => (
              <CommandItem
                key={bot.id}
                value={`${bot.name} ${bot.job} ${bot.instruction || ""}`}
                onSelect={() => {
                  setSelectedBotId(bot.id);
                  setOpenCommand(false);
                }}
                className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer"
              >
                <div className="size-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-muted/30">
                  <SeedAvatar seed={bot.avatar} size={32} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-foreground truncate">
                      {bot.name}
                    </span>
                    <span
                      suppressHydrationWarning
                      className="text-[11px] text-muted-foreground shrink-0 font-normal"
                    >
                      {formatRelativeTime(bot.createdAt)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    {bot.instruction || bot.job}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Create Bot Dialog */}
      <DialogCreateBot open={openCreateBot} onOpenChange={setOpenCreateBot} />
    </>
  );
}

export { SidebarMenu as AppSidebar };
export default SidebarMenu;
