"use client";

import * as React from "react";
import { MonitorIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SeedAvatar } from "@/components/seed-avatar";
import { GroupChatAvatar } from "@/components/group-chat-avatar";
import { DialogEditBot } from "@/components/dialog-edit-bot";
import { DialogEditGroupChat } from "@/components/dialog-edit-group-chat";
import { cn } from "@/lib/utils";

export interface ChatHeaderMember {
  id: string;
  name: string;
  avatar: string;
  job?: string;
}

export interface ChatHeaderProps extends React.ComponentProps<"header"> {
  botId: string;
  name: string;
  avatar?: string;
  isGroup?: boolean;
  avatars?: string[];
  members?: ChatHeaderMember[];
  availableBots?: ChatHeaderMember[];
  job?: string;
  instruction?: string | null;
  isMonitorOpen?: boolean;
  onToggleMonitor?: () => void;
}

export function ChatHeader({
  botId,
  name,
  avatar = "bot-default",
  isGroup = false,
  avatars = [],
  members = [],
  availableBots = [],
  job = "",
  instruction = "",
  isMonitorOpen = false,
  onToggleMonitor,
  className,
  ...props
}: ChatHeaderProps) {
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openEditGroup, setOpenEditGroup] = React.useState(false);

  const [updatedBot, setUpdatedBot] = React.useState<{
    id: string;
    name: string;
    avatar: string;
    job: string;
    instruction?: string | null;
  } | null>(null);

  const [updatedGroup, setUpdatedGroup] = React.useState<{
    id: string;
    name: string;
    avatars: string[];
    members: ChatHeaderMember[];
  } | null>(null);

  const isCurrentBot = updatedBot?.id === botId;
  const currentName = isCurrentBot ? updatedBot.name : name;
  const currentAvatar = isCurrentBot ? updatedBot.avatar : avatar;
  const currentJob = isCurrentBot ? updatedBot.job : job;
  const currentInstruction = isCurrentBot
    ? (updatedBot.instruction ?? "")
    : (instruction ?? "");

  const isCurrentGroup = isGroup && updatedGroup?.id === botId;
  const currentGroupName = isCurrentGroup ? updatedGroup.name : name;
  const currentGroupAvatars = isCurrentGroup ? updatedGroup.avatars : avatars;
  const currentGroupMembers = isCurrentGroup ? updatedGroup.members : members;

  return (
    <>
      <header
        data-slot="chat-header"
        className={cn(
          "h-16 w-full border-b border-border/60 bg-background/95 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between shrink-0 select-none",
          className
        )}
        {...props}
      >
        {/* Left section: Bot / Group info */}
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger className="md:hidden size-9 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer" />

          {isGroup ? (
            <button
              type="button"
              onClick={() => setOpenEditGroup(true)}
              className="flex items-center gap-3 min-w-0 p-1.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group text-left outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="Klik untuk mengubah grup"
            >
              <div className="size-9 shrink-0 flex items-center justify-center overflow-hidden rounded-lg group-hover:scale-105 transition-transform">
                <GroupChatAvatar
                  avatars={currentGroupAvatars}
                  size={36}
                  alt={currentGroupName}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base sm:text-lg text-foreground truncate group-hover:text-foreground">
                  {currentGroupName}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline-block">
                  {currentGroupMembers.length} bot anggota
                </span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpenEdit(true)}
              className="flex items-center gap-3 min-w-0 p-1.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group text-left outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="Klik untuk mengubah bot"
            >
              <div className="size-9 shrink-0 flex items-center justify-center overflow-hidden rounded-lg group-hover:scale-105 transition-transform">
                <SeedAvatar seed={currentAvatar} size={36} alt={currentName} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base sm:text-lg text-foreground truncate group-hover:text-foreground">
                  {currentName}
                </span>
                {currentJob && (
                  <span className="text-xs sm:text-sm text-muted-foreground hidden md:inline-block truncate max-w-[240px]">
                    {currentJob}
                  </span>
                )}
              </div>
            </button>
          )}
        </div>

        {/* Right section: Simple Screen Toggle Button */}
        <div className="flex items-center gap-3 shrink-0">
          {!isGroup && (
            <Button
              type="button"
              variant={isMonitorOpen ? "secondary" : "outline"}
              size="default"
              onClick={onToggleMonitor}
              className={cn(
                "h-10 text-sm font-medium px-4 gap-2 rounded-lg cursor-pointer transition-colors",
                isMonitorOpen
                  ? "bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700"
                  : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title={isMonitorOpen ? "Tutup layar komputer" : "Buka layar komputer"}
              aria-label={isMonitorOpen ? "Tutup layar komputer" : "Buka layar komputer"}
              aria-pressed={isMonitorOpen}
            >
              <MonitorIcon data-icon="inline-start" className="size-4" />
              <span>{isMonitorOpen ? "Tutup Layar" : "Lihat Layar"}</span>
            </Button>
          )}
        </div>
      </header>

      {/* Edit Bot Dialog (only for single bot) */}
      {!isGroup && (
        <DialogEditBot
          open={openEdit}
          onOpenChange={setOpenEdit}
          bot={{
            id: botId,
            name: currentName,
            job: currentJob,
            instruction: currentInstruction,
            avatar: currentAvatar,
          }}
          onSuccess={(updated) => {
            setUpdatedBot(updated);
          }}
        />
      )}

      {/* Edit Group Chat Dialog (only for group chat) */}
      {isGroup && (
        <DialogEditGroupChat
          open={openEditGroup}
          onOpenChange={setOpenEditGroup}
          group={{
            id: botId,
            name: currentGroupName,
            members: currentGroupMembers,
          }}
          availableBots={availableBots}
          onSuccess={(updated) => {
            setUpdatedGroup({
              id: updated.id,
              name: updated.name,
              avatars: updated.members.map((m) => m.avatar),
              members: updated.members,
            });
          }}
        />
      )}
    </>
  );
}

export function ChatHeaderSkeleton() {
  return (
    <header
      data-slot="chat-header-skeleton"
      aria-hidden="true"
      className="h-12 w-full border-b border-border/60 bg-background/95 backdrop-blur-sm px-3 sm:px-4 flex items-center justify-between shrink-0 select-none"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Skeleton className="md:hidden size-8 -ml-1 rounded-md" />
        <Skeleton className="size-5 rounded" />
        <Skeleton className="h-4 w-28 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="hidden sm:block h-6 w-24 rounded" />
        <Skeleton className="h-7 w-28 rounded-md" />
      </div>
    </header>
  );
}

export default ChatHeader;
