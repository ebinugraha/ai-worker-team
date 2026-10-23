"use client";

import * as React from "react";
import { MonitorIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SeedAvatar } from "@/components/seed-avatar";
import { DialogEditBot } from "@/components/dialog-edit-bot";
import { cn } from "@/lib/utils";

export interface ChatHeaderProps extends React.ComponentProps<"header"> {
  botId: string;
  name: string;
  avatar: string;
  job?: string;
  instruction?: string | null;
}

export function ChatHeader({
  botId,
  name,
  avatar,
  job = "",
  instruction = "",
  className,
  ...props
}: ChatHeaderProps) {
  const [openEdit, setOpenEdit] = React.useState(false);
  const [updatedBot, setUpdatedBot] = React.useState<{
    id: string;
    name: string;
    avatar: string;
    job: string;
    instruction?: string | null;
  } | null>(null);

  const isCurrentBot = updatedBot?.id === botId;
  const currentName = isCurrentBot ? updatedBot.name : name;
  const currentAvatar = isCurrentBot ? updatedBot.avatar : avatar;
  const currentJob = isCurrentBot ? updatedBot.job : job;
  const currentInstruction = isCurrentBot
    ? (updatedBot.instruction ?? "")
    : (instruction ?? "");

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
        {/* Left section: Clickable Avatar + Bot Name opening DialogEditBot */}
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

        {/* Right section: Monitor Icon Button (not yet functional) */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
            title="Monitor"
            aria-label="Monitor view"
          >
            <MonitorIcon className="size-4" />
          </Button>
        </div>
      </header>

      {/* Edit Bot Dialog */}
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
