"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { PlusIcon, SearchIcon, UsersIcon, SettingsIcon, GlobeIcon } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SeedAvatar } from "@/components/seed-avatar";
import { GroupChatAvatar } from "@/components/group-chat-avatar";
import { DialogCreateBot } from "@/components/dialog-create-bot";
import { DialogCreateGroupChat } from "@/components/dialog-create-group-chat";
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
import { formatChatPreview } from "@/lib/clean-text";

export interface BotItem {
  id: string;
  name: string;
  job: string;
  avatar: string;
  instruction?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: Date | string | null;
  createdAt: Date | string | null;
}

export interface GroupChatItem {
  id: string;
  name: string;
  avatars: string[];
  members: Array<{
    id: string;
    name: string;
    avatar: string;
    job?: string;
    instruction?: string | null;
  }>;
  lastMessagePreview?: string | null;
  lastMessageAt?: Date | string | null;
  createdAt: Date | string | null;
}

export interface SidebarMenuProps extends React.ComponentProps<typeof Sidebar> {
  initialBots?: BotItem[];
  initialGroupChats?: GroupChatItem[];
  onCreateGroupChat?: () => void;
}

type ConversationItem =
  | {
      isGroup: false;
      id: string;
      name: string;
      job: string;
      avatar: string;
      instruction?: string | null;
      lastMessagePreview?: string | null;
      lastMessageAt?: Date | string | null;
      createdAt: Date | string | null;
    }
  | {
      isGroup: true;
      id: string;
      name: string;
      avatars: string[];
      members: Array<{
        id: string;
        name: string;
        avatar: string;
        job?: string;
      }>;
      lastMessagePreview?: string | null;
      lastMessageAt?: Date | string | null;
      createdAt: Date | string | null;
    };

const emptySubscribe = () => () => {};

function SidebarUserButton() {
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    return (
      <div className="flex items-center gap-2.5 p-[1.5px] group-data-[collapsible=icon]:justify-center">
        <Skeleton className="size-8 rounded-full shrink-0" />
        <Skeleton className="h-4 w-28 rounded group-data-[collapsible=icon]:hidden" />
      </div>
    );
  }

  return (
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
    >
      <UserButton.MenuItems>
        <UserButton.Link
          label="Landing Page"
          href="/landing"
          labelIcon={<GlobeIcon className="size-4" />}
        />
        <UserButton.Link
          label="Settings"
          href="/settings"
          labelIcon={<SettingsIcon className="size-4" />}
        />
      </UserButton.MenuItems>
    </UserButton>
  );
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
  initialGroupChats = [],
  onCreateGroupChat,
  ...props
}: SidebarMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [openCreateBot, setOpenCreateBot] = React.useState(false);
  const [openCreateGroupChat, setOpenCreateGroupChat] = React.useState(false);
  const [openCommand, setOpenCommand] = React.useState(false);

  // Combine bots and group chats in chronological order (by last message time or creation time)
  const conversations = React.useMemo(() => {
    const items: ConversationItem[] = [
      ...initialBots.map((b) => ({ ...b, isGroup: false as const })),
      ...initialGroupChats.map((g) => ({ ...g, isGroup: true as const })),
    ];
    return items.sort((a, b) => {
      const timeA = a.lastMessageAt
        ? new Date(a.lastMessageAt).getTime()
        : a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;
      const timeB = b.lastMessageAt
        ? new Date(b.lastMessageAt).getTime()
        : b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;
      return timeB - timeA;
    });
  }, [initialBots, initialGroupChats]);

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
        <SidebarHeader className="p-4 pb-3 gap-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:gap-2">
          {/* Top Action Row: Logo + 'Genichiro' on the left, '+' button on the right */}
          <div className="flex items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-2">
            {/* Logo + Genichiro brand title */}
            <Link
              href="/"
              onClick={() => {
                if (isMobile) {
                  setOpenMobile(false);
                }
              }}
              className="flex items-center gap-3 min-w-0 select-none group-data-[collapsible=icon]:hidden hover:opacity-85 transition-opacity"
            >
              <Image
                src="/Logo.svg"
                alt="Genichiro"
                width={28}
                height={26}
                className="h-7 w-auto shrink-0 object-contain"
                priority
              />
              <span className="font-bold text-lg sm:text-xl tracking-tight text-foreground truncate">
                Genichiro
              </span>
            </Link>

            {/* Logo in collapsed mode */}
            <Link
              href="/"
              onClick={() => {
                if (isMobile) {
                  setOpenMobile(false);
                }
              }}
              className="hidden group-data-[collapsible=icon]:flex items-center justify-center size-10 rounded-xl hover:bg-sidebar-accent transition-colors select-none"
              title="Genichiro Home"
            >
              <Image
                src="/Logo.svg"
                alt="Genichiro"
                width={26}
                height={24}
                className="size-7 shrink-0 object-contain"
                priority
              />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:rounded-xl"
                  >
                    <PlusIcon className="size-5" />
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
                    onClick={() => {
                      if (isMobile) {
                        setOpenMobile(false);
                      }
                      setOpenCreateBot(true);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer"
                  >
                    <PlusIcon className="size-4" data-icon="inline-start" />
                    <span>Create new bot</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => {
                      if (isMobile) {
                        setOpenMobile(false);
                      }
                      if (onCreateGroupChat) {
                        onCreateGroupChat();
                      } else {
                        setOpenCreateGroupChat(true);
                      }
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer"
                  >
                    <UsersIcon className="size-4" data-icon="inline-start" />
                    <span>Create a groupchat</span>
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
              "relative flex items-center justify-between w-full h-11 px-3.5 text-sm bg-sidebar-accent/40 hover:bg-sidebar-accent/70 border border-sidebar-border/70 rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none group focus-visible:ring-1 focus-visible:ring-sidebar-ring outline-none",
              "group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:hover:bg-sidebar-accent"
            )}
          >
            <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
              <SearchIcon className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors group-data-[collapsible=icon]:hidden text-sm">
                Search
              </span>
            </div>
            <kbd className="px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground bg-sidebar-accent/80 border border-sidebar-border/70 rounded select-none pointer-events-none group-data-[collapsible=icon]:hidden">
              ⌘K
            </kbd>
          </button>
        </SidebarHeader>

        {/* Main Content Area: Conversations (Bots + Group chats) */}
        <SidebarContent className="px-3 py-2.5 overflow-y-auto group-data-[collapsible=icon]:px-1.5">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <UiSidebarMenu className="gap-1.5 group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:items-center">
                {conversations.map((item) => {
                  const chatPath = `/chat/${item.id}`;
                  const isActive = pathname === chatPath;
                  const relativeTime = formatRelativeTime(
                    item.lastMessageAt || item.createdAt
                  );
                  const previewText = formatChatPreview(item.lastMessagePreview);

                  return (
                    <SidebarMenuItem
                      key={item.id}
                      className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
                    >
                      <SidebarMenuButton
                        size="default"
                        isActive={isActive}
                        tooltip={
                          item.isGroup
                            ? `${item.name} (${item.members.map((m) => m.name).join(", ")})`
                            : `${item.name} • ${previewText || item.job}`
                        }
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                          router.push(chatPath);
                        }}
                        className={cn(
                          "relative h-15 px-3.5 py-2.5 rounded-xl gap-3.5 transition-colors cursor-pointer text-left w-full select-none",
                          isActive
                            ? "bg-zinc-800 text-zinc-100 font-medium"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40",
                          "group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl"
                        )}
                      >
                        {/* Avatar: SeedAvatar for direct bot, GroupChatAvatar for group */}
                        <div
                          className={cn(
                            "size-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center",
                            isActive ? "bg-muted/50" : "bg-muted/30"
                          )}
                        >
                          {item.isGroup ? (
                            <GroupChatAvatar avatars={item.avatars} size={40} />
                          ) : (
                            <SeedAvatar seed={item.avatar} size={40} />
                          )}
                        </div>

                        {/* Details (Name + Relative Time, Subtitle) */}
                        <div className="flex flex-col min-w-0 flex-1 leading-snug group-data-[collapsible=icon]:hidden">
                          <div className="flex items-center justify-between gap-1.5 w-full">
                            <span className="font-semibold text-base text-zinc-100 truncate">
                              {item.name}
                            </span>
                            {relativeTime && (
                              <span
                                suppressHydrationWarning
                                className="text-xs text-zinc-400 shrink-0 font-mono"
                              >
                                {relativeTime}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-zinc-400 truncate block mt-0.5">
                            {previewText
                              ? previewText
                              : item.isGroup
                              ? item.members.map((m) => m.name).join(", ")
                              : "Belum ada pesan"}
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
        <SidebarFooter className="border-t border-sidebar-border p-4 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center justify-between w-full group-data-[collapsible=icon]:justify-center gap-1">
            <div className="flex-1 min-w-0">
              <React.Suspense
                fallback={
                  <div className="flex items-center gap-2.5 p-[1.5px] group-data-[collapsible=icon]:justify-center">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-28 rounded group-data-[collapsible=icon]:hidden" />
                  </div>
                }
              >
                <SidebarUserButton />
              </React.Suspense>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                if (isMobile) {
                  setOpenMobile(false);
                }
                router.push("/settings");
              }}
              className="text-muted-foreground hover:text-foreground shrink-0 group-data-[collapsible=icon]:hidden cursor-pointer"
              title="Pengaturan Model AI"
            >
              <SettingsIcon className="size-4" />
            </Button>
          </div>
        </SidebarFooter>

        {/* Sidebar Rail with drag & click to collapse/expand */}
        <SidebarRail />
      </Sidebar>

      {/* Command Palette Dialog (Cmd+K / Ctrl+K) */}
      <CommandDialog
        open={openCommand}
        onOpenChange={setOpenCommand}
        title="Search Conversations"
        description="Search through your bots and group chats"
      >
        <CommandInput placeholder="Search bots and group chats..." />
        <CommandList>
          <CommandEmpty>No conversations found.</CommandEmpty>
          <CommandGroup heading="Conversations">
            {conversations.map((item) => {
              const previewText = formatChatPreview(item.lastMessagePreview);
              return (
                <CommandItem
                  key={item.id}
                  value={
                    item.isGroup
                      ? `${item.name} ${previewText} ${item.members.map((m) => m.name).join(" ")}`
                      : `${item.name} ${previewText || item.job} ${item.instruction || ""}`
                  }
                  onSelect={() => {
                    if (isMobile) {
                      setOpenMobile(false);
                    }
                    router.push(`/chat/${item.id}`);
                    setOpenCommand(false);
                  }}
                  className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer"
                >
                  <div className="size-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-muted/30">
                    {item.isGroup ? (
                      <GroupChatAvatar avatars={item.avatars} size={32} />
                    ) : (
                      <SeedAvatar seed={item.avatar} size={32} />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {item.name}
                      </span>
                      <span
                        suppressHydrationWarning
                        className="text-[11px] text-muted-foreground shrink-0 font-normal"
                      >
                        {formatRelativeTime(
                          item.lastMessageAt || item.createdAt
                        )}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate">
                      {previewText
                        ? previewText
                        : item.isGroup
                        ? item.members.map((m) => m.name).join(", ")
                        : "Belum ada pesan"}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Create Bot Dialog */}
      <DialogCreateBot open={openCreateBot} onOpenChange={setOpenCreateBot} />

      {/* Create Group Chat Dialog */}
      <DialogCreateGroupChat
        open={openCreateGroupChat}
        onOpenChange={setOpenCreateGroupChat}
        availableBots={initialBots}
      />
    </>
  );
}

export { SidebarMenu as AppSidebar };
export default SidebarMenu;
