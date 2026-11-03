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
            "text-xs sm:text-sm font-medium text-sidebar-foreground text-left truncate max-w-[140px] order-2 group-data-[collapsible=icon]:hidden",
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
          label="Pengaturan"
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
        className="border-r border-sidebar-border/50"
        {...props}
      >
        {/* Top Header Section */}
        <SidebarHeader className="p-3.5 pb-2.5 gap-2.5 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:gap-2">
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
              className="flex items-center gap-2.5 min-w-0 select-none group-data-[collapsible=icon]:hidden hover:opacity-85 transition-opacity"
            >
              <Image
                src="/Logo.svg"
                alt="Genichiro"
                width={22}
                height={20}
                className="size-5.5 shrink-0 object-contain"
                priority
              />
              <span className="font-semibold text-sm tracking-tight text-foreground truncate">
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
              className="hidden group-data-[collapsible=icon]:flex items-center justify-center size-9 rounded-lg hover:bg-sidebar-accent/50 transition-colors select-none"
              title="Genichiro Home"
            >
              <Image
                src="/Logo.svg"
                alt="Genichiro"
                width={22}
                height={20}
                className="size-5 shrink-0 object-contain"
                priority
              />
            </Link>

            {/* Plus Action Button & Popover (dropdown-plus-button-sidebar-photo.png) */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg bg-sidebar-accent/40 hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors group-data-[collapsible=icon]:size-9 border border-sidebar-border/40 cursor-pointer"
                  >
                    <PlusIcon className="size-4 stroke-[1.75]" />
                    <span className="sr-only">Tambah percakapan</span>
                  </Button>
                }
              />
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={6}
                className="w-52 p-1 rounded-xl bg-popover/98 backdrop-blur-sm border border-border/50 shadow-xl"
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      if (isMobile) {
                        setOpenMobile(false);
                      }
                      setOpenCreateBot(true);
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs sm:text-sm font-normal rounded-lg cursor-pointer hover:bg-accent"
                  >
                    <PlusIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
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
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs sm:text-sm font-normal rounded-lg cursor-pointer hover:bg-accent"
                  >
                    <UsersIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                    <span>Create group chat</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search Trigger Button with ⌘K badge (sidebar-photo.png) */}
          <button
            type="button"
            onClick={() => setOpenCommand(true)}
            title="Search (⌘K)"
            className={cn(
              "relative flex items-center justify-between w-full h-9 px-3 text-xs bg-sidebar-accent/30 hover:bg-sidebar-accent/50 border border-sidebar-border/60 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none group focus-visible:ring-1 focus-visible:ring-sidebar-ring outline-none",
              "group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:hover:bg-sidebar-accent/50"
            )}
          >
            <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
              <SearchIcon className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              <span className="font-normal text-muted-foreground group-hover:text-foreground transition-colors group-data-[collapsible=icon]:hidden text-xs">
                Search
              </span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground/80 bg-sidebar-accent/70 border border-sidebar-border/60 rounded select-none pointer-events-none group-data-[collapsible=icon]:hidden">
              ⌘K
            </kbd>
          </button>
        </SidebarHeader>

        {/* Main Content Area: Conversations (Bots + Group chats) (list-bot-sidebar-photo.png) */}
        <SidebarContent className="px-2.5 py-2 overflow-y-auto group-data-[collapsible=icon]:px-1.5">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <UiSidebarMenu className="gap-1 group-data-[collapsible=icon]:gap-1.5 group-data-[collapsible=icon]:items-center">
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
                          "relative h-[52px] px-2.5 py-2 rounded-xl gap-3 transition-colors cursor-pointer text-left w-full select-none",
                          isActive
                            ? "bg-[#242427] dark:bg-zinc-800/80 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40",
                          "group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-lg"
                        )}
                      >
                        {/* Avatar (SeedAvatar for direct bot, GroupChatAvatar for group) */}
                        <div
                          className={cn(
                            "size-8.5 rounded-lg overflow-hidden shrink-0 flex items-center justify-center",
                            isActive ? "bg-muted/50" : "bg-muted/20"
                          )}
                        >
                          {item.isGroup ? (
                            <GroupChatAvatar avatars={item.avatars} size={34} />
                          ) : (
                            <SeedAvatar seed={item.avatar} size={34} />
                          )}
                        </div>

                        {/* Details (Name + Relative Time, Subtitle) */}
                        <div className="flex flex-col min-w-0 flex-1 leading-snug group-data-[collapsible=icon]:hidden">
                          <div className="flex items-center justify-between gap-1.5 w-full">
                            <span className="font-medium text-[13px] text-foreground truncate">
                              {item.name}
                            </span>
                            {relativeTime && (
                              <span
                                suppressHydrationWarning
                                className="text-[11px] text-muted-foreground/75 shrink-0 font-normal"
                              >
                                {relativeTime}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-normal truncate mt-0.5 block leading-tight">
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

        {/* Footer: User profile with Clerk UserButton and Settings Button */}
        <SidebarFooter className="border-t border-sidebar-border/40 p-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
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
              size="icon"
              onClick={() => {
                if (isMobile) {
                  setOpenMobile(false);
                }
                router.push("/settings");
              }}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0 group-data-[collapsible=icon]:hidden cursor-pointer"
              title="Pengaturan"
            >
              <SettingsIcon className="size-3.5" />
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
        title="Cari Percakapan"
        description="Cari bot atau obrolan grup"
      >
        <CommandInput placeholder="Cari bot dan obrolan grup..." />
        <CommandList>
          <CommandEmpty>Percakapan tidak ditemukan.</CommandEmpty>
          <CommandGroup heading="Percakapan">
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
                  <div className="size-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-muted/20">
                    {item.isGroup ? (
                      <GroupChatAvatar avatars={item.avatars} size={32} />
                    ) : (
                      <SeedAvatar seed={item.avatar} size={32} />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-xs sm:text-sm text-foreground truncate">
                        {item.name}
                      </span>
                      <span
                        suppressHydrationWarning
                        className="text-[11px] text-muted-foreground/75 shrink-0 font-normal"
                      >
                        {formatRelativeTime(
                          item.lastMessageAt || item.createdAt
                        )}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-normal truncate mt-0.5">
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
