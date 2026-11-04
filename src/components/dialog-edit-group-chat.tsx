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
import { Trash2Icon, Loader2Icon } from "lucide-react";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

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
        <DialogContent className="sm:max-w-[540px] w-full max-h-[calc(100svh-2rem)] sm:max-h-[calc(100svh-3.5rem)] flex flex-col p-0 gap-0 rounded-[20px] bg-card border border-border/80 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 pb-4 gap-1.5 text-left shrink-0">
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              Edit group chat
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Update the name and manage members in this group.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Form Body */}
          <form
            id="edit-group-form"
            onSubmit={handleFormSubmit}
            className="overflow-y-auto overscroll-contain flex-1 min-h-0 px-6 pt-1 pb-6 flex flex-col gap-5"
          >
            {/* Server / Validation Error Alert */}
            {errorMessage && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {errorMessage}
              </div>
            )}

            <FieldGroup className="gap-5">
              {/* Group Name input */}
              <Field className="gap-2">
                <FieldLabel
                  htmlFor="edit-group-name-input"
                  className="text-sm font-medium text-foreground"
                >
                  Name
                </FieldLabel>
                <Input
                  id="edit-group-name-input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Weekend plans"
                  disabled={isPending || isDeleting}
                  className="h-10 rounded-xl bg-muted/20 border-border/60 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring"
                />
              </Field>

              {/* Bots selection list */}
              <Field className="gap-2.5">
                <FieldLabel className="text-sm font-medium text-foreground">
                  Members
                </FieldLabel>

                {allBots.length === 0 ? (
                  <div className="rounded-xl border border-border/60 p-4 text-center text-xs text-muted-foreground bg-muted/10">
                    No bots found.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 pt-0.5">
                    {allBots.map((bot) => {
                      const isChecked = selectedBotIds.includes(bot.id);
                      return (
                        <div
                          key={bot.id}
                          onClick={() => !isPending && !isDeleting && toggleBot(bot.id)}
                          className="flex items-center gap-3 py-1 cursor-pointer select-none group"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleBot(bot.id)}
                            disabled={isPending || isDeleting}
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

          {/* Dialog Footer with Delete on justify-start and Cancel/Save on justify-end */}
          <DialogFooter className="px-6 pt-4 pb-5 mt-auto shrink-0 border-t border-border/70 flex items-center justify-between w-full bg-card/95 backdrop-blur-xs">
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || isDeleting}
              onClick={() => setOpenConfirmDelete(true)}
              className="rounded-xl h-9 text-sm px-4 font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/40 transition-colors gap-1.5 cursor-pointer shadow-xs"
            >
              <Trash2Icon className="size-4" data-icon="inline-start" />
              Delete
            </Button>
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                disabled={isPending || isDeleting}
                onClick={() => onOpenChange(false)}
                className="rounded-xl h-9 text-sm px-4 font-medium border-border/70 bg-secondary/60 hover:bg-secondary text-secondary-foreground transition-colors cursor-pointer"
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
                className="rounded-xl h-9 text-sm px-4.5 font-semibold bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 shadow-xs gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
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
        <AlertDialogContent className="rounded-2xl border-border/60 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold tracking-tight text-foreground">
              Delete group chat?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{group.name}</strong>? This action
              cannot be undone and will permanently remove this group chat and its
              conversations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2.5">
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-xl h-9 text-sm px-4 font-medium border-border/70 bg-secondary/60 hover:bg-secondary text-secondary-foreground transition-colors cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteGroup}
              className="gap-1.5 rounded-xl h-9 text-sm px-4 font-semibold cursor-pointer shadow-xs"
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
