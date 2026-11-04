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
import { Loader2Icon } from "lucide-react";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

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
      <DialogContent className="sm:max-w-[540px] w-full max-h-[calc(100svh-2rem)] sm:max-h-[calc(100svh-3.5rem)] flex flex-col p-0 gap-0 rounded-[20px] bg-card border border-border/80 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 gap-1.5 text-left shrink-0">
          <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
            New group chat
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Name the group and pick which bots are in it.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-group-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto overscroll-contain flex-1 min-h-0 px-6 pt-1 pb-6 flex flex-col gap-5"
        >
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <FieldGroup className="gap-5">
            {/* Group Name input */}
            <Field className="gap-2">
              <FieldLabel
                htmlFor="group-name-input"
                className="text-sm font-medium text-foreground"
              >
                Name
              </FieldLabel>
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
                className="h-10 rounded-xl bg-muted/20 border-border/60 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring"
              />
            </Field>

            {/* Bots selection list */}
            <Field className="gap-2.5">
              <FieldLabel className="text-sm font-medium text-foreground">
                Bots
              </FieldLabel>

              {availableBots.length === 0 ? (
                <div className="rounded-xl border border-border/60 p-4 text-center text-xs text-muted-foreground bg-muted/10">
                  No bots available. Create bots first before creating a group chat.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 pt-0.5">
                  {availableBots.map((bot) => {
                    const isChecked = selectedBotIds.includes(bot.id);
                    return (
                      <div
                        key={bot.id}
                        onClick={() => !isPending && toggleBot(bot.id)}
                        className="flex items-center gap-3 py-1 cursor-pointer select-none group"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleBot(bot.id)}
                          disabled={isPending}
                          className="size-4.5 rounded-[4px]"
                        />
                        <div className="size-6 shrink-0 flex items-center justify-center overflow-hidden">
                          <SeedAvatar
                            seed={bot.avatar}
                            size={24}
                            className="rounded-none shrink-0"
                          />
                        </div>
                        <span className="text-sm text-foreground/90 group-hover:text-foreground font-normal">
                          {bot.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Field>
          </FieldGroup>
        </form>

        {/* Footer buttons */}
        <DialogFooter className="px-6 pt-4 pb-5 mt-auto shrink-0 border-t border-border/70 flex items-center justify-end gap-2.5 bg-card/95 backdrop-blur-xs">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-xl h-9 text-sm px-4 font-medium border-border/70 bg-secondary/60 hover:bg-secondary text-secondary-foreground transition-colors cursor-pointer"
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
            variant="default"
            className="rounded-xl h-9 text-sm px-4.5 font-semibold bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 shadow-xs gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create group"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreateGroupChat;
