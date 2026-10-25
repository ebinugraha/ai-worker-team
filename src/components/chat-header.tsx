"use client";

import * as React from "react";
import { MonitorIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
          "h-11 w-full border-b border-border bg-background px-4 flex items-center justify-between shrink-0 select-none",
          className
        )}
        {...props}
      >
        {/* Left section: Avatar + Name (Clickable button to edit) */}
        {isGroup ? (
          <button
            type="button"
            onClick={() => setOpenEditGroup(true)}
            className="flex items-center gap-2.5 min-w-0 p-1 -ml-1 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group text-left outline-none focus-visible:ring-1 focus-visible:ring-ring"
            title="Click to edit group chat"
          >
            <div className="size-5 shrink-0 flex items-center justify-center overflow-hidden rounded-md group-hover:scale-105 transition-transform">
              <GroupChatAvatar
                avatars={currentGroupAvatars}
                size={20}
                alt={currentGroupName}
              />
            </div>
            <span className="font-medium text-sm text-foreground truncate group-hover:text-foreground">
              {currentGroupName}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpenEdit(true)}
            className="flex items-center gap-2.5 min-w-0 p-1 -ml-1 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group text-left outline-none focus-visible:ring-1 focus-visible:ring-ring"
            title="Click to edit bot"
          >
            <div className="size-5 shrink-0 flex items-center justify-center overflow-hidden rounded-md group-hover:scale-105 transition-transform">
              <SeedAvatar seed={currentAvatar} size={20} alt={currentName} />
            </div>
            <span className="font-medium text-sm text-foreground truncate group-hover:text-foreground">
              {currentName}
            </span>
          </button>
        )}

        {/* Right section: Monitor Icon Button (only for single bot direct chat) */}
        {!isGroup && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onToggleMonitor}
              className={cn(
                "size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer",
                isMonitorOpen && "bg-muted text-foreground"
              )}
              title={isMonitorOpen ? "Close monitor" : "Open monitor"}
              aria-label="Monitor view"
              aria-pressed={isMonitorOpen}
            >
              <MonitorIcon className="size-4" />
            </Button>
          </div>
        )}
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
      className="h-11 w-full border-b border-border bg-background px-4 flex items-center justify-between shrink-0 select-none"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Skeleton className="size-5 rounded-md" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
      <Skeleton className="size-8 rounded-lg" />
    </header>
  );
}

export default ChatHeader;
