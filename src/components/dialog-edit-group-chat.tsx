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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SeedAvatar } from "@/components/seed-avatar";
import { updateGroupChatAction, deleteGroupChatAction } from "@/action/chat";
import { getUserBotsAction } from "@/action/bot";
import { cn } from "@/lib/utils";
import { Trash2Icon, Loader2Icon } from "lucide-react";

export interface BotMemberOption {
  id: string;
  name: string;
  avatar: string;
  job?: string;
}

export interface DialogEditGroupChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: {
    id: string;
    name: string;
    members: BotMemberOption[];
  };
  availableBots?: BotMemberOption[];
  onSuccess?: (updated: {
    id: string;
    name: string;
    members: BotMemberOption[];
  }) => void;
}

export function DialogEditGroupChat({
  open,
  onOpenChange,
  group,
  availableBots: initialAvailableBots,
  onSuccess,
}: DialogEditGroupChatProps) {
  const router = useRouter();
  const [name, setName] = React.useState(group.name);
  const [selectedBotIds, setSelectedBotIds] = React.useState<string[]>(
    group.members.map((m) => m.id)
  );
  const [allBots, setAllBots] = React.useState<BotMemberOption[]>(
    initialAvailableBots || group.members
  );
  const [isPending, startTransition] = React.useTransition();
  const [isDeleting, startDeleteTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [openConfirmDelete, setOpenConfirmDelete] = React.useState(false);

  // Sync state whenever dialog opens or group changes
  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(group.name);
      setSelectedBotIds(group.members.map((m) => m.id));
      setErrorMessage(null);

      // If availableBots wasn't passed or is incomplete, fetch all user bots
      if (!initialAvailableBots || initialAvailableBots.length === 0) {
        getUserBotsAction().then((res) => {
          if (res.success && res.data) {
            setAllBots(
              res.data.map((b) => ({
                id: b.id,
                name: b.name,
                avatar: b.avatar,
                job: b.job,
              }))
            );
          }
        });
      } else {
        setAllBots(initialAvailableBots);
      }
    }
  }, [open, group, initialAvailableBots]);

  const toggleBot = (botId: string) => {
    setSelectedBotIds((prev) =>
      prev.includes(botId)
        ? prev.filter((id) => id !== botId)
        : [...prev, botId]
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter a group name.");
      return;
    }
    if (selectedBotIds.length < 2) {
      setErrorMessage("Please select at least 2 bots for the group.");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      try {
        const result = await updateGroupChatAction({
          chatId: group.id,
          name: trimmedName,
          botIds: selectedBotIds,
        });

        if (!result.success || !result.data) {
          setErrorMessage(result.error || "Failed to update group chat");
          return;
        }

        const updatedMembers = allBots.filter((b) =>
          selectedBotIds.includes(b.id)
        );

        onSuccess?.({
          id: group.id,
          name: trimmedName,
          members: updatedMembers,
        });

        onOpenChange(false);
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      }
    });
  };

  const handleDeleteGroup = () => {
    startDeleteTransition(async () => {
      try {
        const result = await deleteGroupChatAction(group.id);
        if (!result.success) {
          setErrorMessage(result.error || "Failed to delete group chat");
          setOpenConfirmDelete(false);
          return;
        }

        setOpenConfirmDelete(false);
        onOpenChange(false);
        router.push("/");
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
        setOpenConfirmDelete(false);
      }
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] p-6 gap-5 rounded-2xl bg-card border-border/60">
          <DialogHeader className="gap-1.5 text-left">
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              Edit group chat
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Update the name and manage members in this group.
            </DialogDescription>
          </DialogHeader>

          {/* Server / Validation Error Alert */}
          {errorMessage && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
              {errorMessage}
            </div>
          )}

          <form
            id="edit-group-form"
            onSubmit={handleFormSubmit}
            className="flex flex-col gap-4"
          >
            {/* Group Name input */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-group-name-input"
                className="text-sm font-medium text-foreground"
              >
                Name
              </label>
              <Input
                id="edit-group-name-input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Team group name"
                disabled={isPending || isDeleting}
                className="h-9 bg-neutral-900/60 border-neutral-800 focus:border-neutral-700 text-sm"
              />
            </div>

            {/* Bots selection list */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Members
                </label>
                <span className="text-xs text-muted-foreground">
                  {selectedBotIds.length} of {allBots.length} selected
                </span>
              </div>

              {allBots.length === 0 ? (
                <div className="rounded-lg border border-border/60 p-4 text-center text-xs text-muted-foreground">
                  No bots found.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border border-border/60 p-1.5 bg-neutral-950/40">
                  {allBots.map((bot) => {
                    const isChecked = selectedBotIds.includes(bot.id);
                    return (
                      <div
                        key={bot.id}
                        onClick={() => !isPending && !isDeleting && toggleBot(bot.id)}
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
                          disabled={isPending || isDeleting}
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
          </form>

          {/* Dialog Footer with Delete on justify-start and Cancel/Save on justify-end */}
          <DialogFooter className="border-t border-border/60 flex flex-row items-center justify-between pt-4">
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || isDeleting}
              onClick={() => setOpenConfirmDelete(true)}
              className="rounded-lg text-sm px-3.5 gap-1.5 cursor-pointer shadow-xs"
            >
              <Trash2Icon className="size-4" data-icon="inline-start" />
              Delete
            </Button>
            <div className="flex items-center gap-2.5 ml-auto">
              <Button
                type="button"
                variant="outline"
                disabled={isPending || isDeleting}
                onClick={() => onOpenChange(false)}
                className="rounded-lg text-sm px-4 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="edit-group-form"
                disabled={
                  isPending ||
                  isDeleting ||
                  !name.trim() ||
                  selectedBotIds.length < 2
                }
                variant="default"
                className="rounded-lg text-sm px-4 font-semibold shadow-xs gap-1.5 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={openConfirmDelete}
        onOpenChange={setOpenConfirmDelete}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{group.name}</strong>? This action
              cannot be undone and will permanently remove this group chat and its
              conversations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteGroup}
              className="gap-1.5 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete group"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default DialogEditGroupChat;
