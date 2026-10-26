"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SeedAvatar } from "@/components/seed-avatar";
import { createGroupChatAction } from "@/action/chat";
import { cn } from "@/lib/utils";

export interface BotOption {
  id: string;
  name: string;
  avatar: string;
  job?: string;
}

export interface DialogCreateGroupChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBots: BotOption[];
  onSuccess?: (chatId: string) => void;
}

export function DialogCreateGroupChat({
  open,
  onOpenChange,
  availableBots,
  onSuccess,
}: DialogCreateGroupChatProps) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [selectedBotIds, setSelectedBotIds] = React.useState<string[]>([]);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setSelectedBotIds([]);
    setError(null);
    setIsPending(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const toggleBot = (botId: string) => {
    setSelectedBotIds((prev) =>
      prev.includes(botId)
        ? prev.filter((id) => id !== botId)
        : [...prev, botId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a group name.");
      return;
    }
    if (selectedBotIds.length < 2) {
      setError("Please select at least 2 bots for the group.");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const result = await createGroupChatAction({
        name: trimmedName,
        botIds: selectedBotIds,
      });

      if (result.success && result.data) {
        onOpenChange(false);
        router.push(`/chat/${result.data.chatId}`);
        router.refresh();
        onSuccess?.(result.data.chatId);
      } else {
        setError(result.error || "Failed to create group chat.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[calc(100svh-2rem)] sm:max-h-[calc(100svh-3.5rem)] flex flex-col p-0 gap-0 bg-background border-border rounded-2xl overflow-hidden">
        <DialogHeader className="p-6 pb-4 gap-1.5 text-left shrink-0">
          <DialogTitle className="text-lg font-semibold text-foreground">
            New group chat
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Name the group and pick which bots are in it.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-group-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto overscroll-contain flex-1 min-h-0 px-6 py-1 flex flex-col gap-4"
        >
          {/* Group Name input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="group-name-input"
              className="text-sm font-medium text-foreground"
            >
              Name
            </label>
            <Input
              id="group-name-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Weekend plans"
              disabled={isPending}
              autoFocus
              className="h-9 bg-neutral-900/60 border-neutral-800 focus:border-neutral-700 text-sm"
            />
          </div>

          {/* Bots selection list */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Bots
              </label>
              <span className="text-xs text-muted-foreground">
                {selectedBotIds.length} of {availableBots.length} selected
              </span>
            </div>

            {availableBots.length === 0 ? (
              <div className="rounded-lg border border-border/60 p-4 text-center text-xs text-muted-foreground">
                No bots available. Create bots first before creating a group chat.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border border-border/60 p-1.5 bg-neutral-950/40">
                {availableBots.map((bot) => {
                  const isChecked = selectedBotIds.includes(bot.id);
                  return (
                    <div
                      key={bot.id}
                      onClick={() => !isPending && toggleBot(bot.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors select-none",
                        isChecked
                          ? "bg-neutral-800/70 text-foreground"
                          : "hover:bg-neutral-900 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleBot(bot.id)}
                        disabled={isPending}
                        className="pointer-events-none"
                      />
                      <SeedAvatar
                        seed={bot.avatar}
                        size={28}
                        className="rounded-full shrink-0"
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium truncate text-foreground">
                          {bot.name}
                        </span>
                        {bot.job && (
                          <span className="text-xs text-muted-foreground truncate">
                            {bot.job}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs text-destructive rounded-lg bg-destructive/10 border border-destructive/20 p-2.5">
              {error}
            </div>
          )}
        </form>

        {/* Footer buttons */}
        <DialogFooter className="p-6 pt-3 mt-auto shrink-0 border-t border-border/60 flex items-center justify-end gap-2 bg-background/90 backdrop-blur-xs">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="h-8.5 px-3.5 text-xs font-medium cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-group-form"
            disabled={
              isPending ||
              !name.trim() ||
              selectedBotIds.length < 2 ||
              availableBots.length < 2
            }
            className="h-8.5 px-3.5 text-xs font-medium cursor-pointer"
          >
            {isPending ? "Creating..." : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreateGroupChat;
