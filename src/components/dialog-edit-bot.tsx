"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { ShuffleIcon, Loader2Icon, Trash2Icon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { SeedAvatar } from "@/components/seed-avatar";
import { cn } from "@/lib/utils";
import { updateBotAction, deleteBotAction } from "@/action/bot";

export interface BotEditData {
  name: string;
  job: string;
  instructions: string;
  avatar: string;
}

function getRandomAvatarSeed(): string {
  return `bot-${Math.random().toString(36).substring(2, 10)}`;
}

const PRESETS = [
  {
    label: "Research assistant",
    name: "Ada",
    job: "Research assistant",
    instructions:
      "Answer briefly, cite sources, and ask before running anything destructive.",
  },
  {
    label: "Code reviewer",
    name: "Linus",
    job: "Code reviewer",
    instructions:
      "Review code diffs for bugs, performance bottlenecks, and style conventions. Provide concise, actionable feedback.",
  },
  {
    label: "Writing editor",
    name: "Hemingway",
    job: "Writing editor",
    instructions:
      "Refine tone, clarity, and grammatical precision while preserving the author's original voice.",
  },
  {
    label: "Tutor",
    name: "Socrates",
    job: "Tutor",
    instructions:
      "Explain concepts step-by-step using first principles, analogies, and guided questions.",
  },
];

export interface DialogEditBotProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bot: {
    id: string;
    name: string;
    job: string;
    instruction?: string | null;
    avatar: string;
  };
  onSuccess?: (updatedBot: {
    id: string;
    name: string;
    job: string;
    instruction?: string | null;
    avatar: string;
  }) => void;
}

export function DialogEditBot({
  open,
  onOpenChange,
  bot,
  onSuccess,
}: DialogEditBotProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isDeleting, startDeleteTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [openConfirmDelete, setOpenConfirmDelete] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<BotEditData>({
    defaultValues: {
      name: bot.name,
      job: bot.job,
      instructions: bot.instruction || "",
      avatar: bot.avatar,
    },
  });

  const watchAvatar = useWatch({
    control,
    name: "avatar",
    defaultValue: bot.avatar,
  });

  const watchJob = useWatch({
    control,
    name: "job",
    defaultValue: bot.job || "",
  });

  // Sync form default values when opening dialog or bot changes
  React.useEffect(() => {
    if (open && bot) {
      reset({
        name: bot.name,
        job: bot.job,
        instructions: bot.instruction || "",
        avatar: bot.avatar,
      });
    }
  }, [open, bot, reset]);

  // Handle Preset selection
  const handleSelectPreset = (preset: (typeof PRESETS)[0]) => {
    setValue("name", preset.name);
    setValue("job", preset.job);
    setValue("instructions", preset.instructions);
  };

  // Shuffle avatar seed
  const handleShuffleAvatar = () => {
    setValue("avatar", getRandomAvatarSeed());
  };

  // Form submit handler calling server action
  const onFormSubmit = (data: BotEditData) => {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const result = await updateBotAction({
          id: bot.id,
          name: data.name,
          job: data.job,
          instructions: data.instructions,
          avatar: data.avatar,
        });

        if (!result.success || !result.data) {
          setErrorMessage(result.error || "Failed to update bot");
          return;
        }

        router.refresh();

        if (onSuccess) {
          onSuccess({
            id: result.data.id,
            name: result.data.name,
            job: result.data.job,
            instruction: result.data.instruction,
            avatar: result.data.avatar,
          });
        }

        onOpenChange(false);
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      }
    });
  };

  // Delete bot handler
  const handleDeleteBot = () => {
    startDeleteTransition(async () => {
      try {
        const result = await deleteBotAction(bot.id);
        if (!result.success) {
          setErrorMessage(result.error || "Failed to delete bot");
          setOpenConfirmDelete(false);
          return;
        }

        setOpenConfirmDelete(false);
        onOpenChange(false);
        router.push("/");
        router.refresh();
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
        setOpenConfirmDelete(false);
      }
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setErrorMessage(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[540px] w-full max-h-[calc(100svh-2rem)] sm:max-h-[calc(100svh-3.5rem)] flex flex-col p-0 gap-0 rounded-[20px] bg-card border border-border/80 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 pb-4 gap-1.5 text-left shrink-0">
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              Edit bot
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Give it a face, a name, and a job to do.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Form Body */}
          <form
            id="edit-bot-form"
            onSubmit={handleSubmit(onFormSubmit)}
            className="overflow-y-auto overscroll-contain flex-1 min-h-0 px-6 pt-1 pb-6 flex flex-col gap-5"
          >
            {/* Server Error Alert */}
            {errorMessage && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {errorMessage}
              </div>
            )}

            {/* Preset Chips */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const isActive = watchJob === preset.job;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-xs transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      isActive
                        ? "border bg-zinc-800 text-foreground font-medium shadow-xs"
                        : "border border-border/60 bg-secondary/40 hover:bg-secondary/70 text-muted-foreground hover:text-foreground font-normal"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Face / Avatar Section */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3.5">
                <div className="size-12 overflow-hidden shrink-0 flex items-center justify-center">
                  <SeedAvatar seed={watchAvatar} size={48} className="rounded-none" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground leading-tight">
                    Face
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    Shuffle until you find one you like.
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleShuffleAvatar}
                className="rounded-lg h-8 px-3 gap-1.5 text-xs font-medium border-border/80 bg-secondary/50 hover:bg-secondary text-foreground transition-colors cursor-pointer"
              >
                <ShuffleIcon className="size-3.5" data-icon="inline-start" />
                Shuffle
              </Button>
            </div>

            <FieldGroup className="gap-4">
              {/* Name Field */}
              <Field data-invalid={!!errors.name} className="gap-1.5">
                <FieldLabel
                  htmlFor="edit-bot-name"
                  className="text-sm font-medium text-foreground"
                >
                  Name
                </FieldLabel>
                <Input
                  id="edit-bot-name"
                  placeholder="Ada"
                  disabled={isPending || isDeleting}
                  {...register("name", { required: "Name is required" })}
                  aria-invalid={!!errors.name}
                  className="h-10 rounded-xl bg-muted/20 border-border/60 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring"
                />
                {errors.name && (
                  <span className="text-xs text-destructive">
                    {errors.name.message}
                  </span>
                )}
              </Field>

              {/* Job Field */}
              <Field data-invalid={!!errors.job} className="gap-1.5">
                <FieldLabel
                  htmlFor="edit-bot-job"
                  className="text-sm font-medium text-foreground"
                >
                  Job
                </FieldLabel>
                <Input
                  id="edit-bot-job"
                  placeholder="Research assistant"
                  disabled={isPending || isDeleting}
                  {...register("job", { required: "Job is required" })}
                  aria-invalid={!!errors.job}
                  className="h-10 rounded-xl bg-muted/20 border-border/60 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring"
                />
                {errors.job && (
                  <span className="text-xs text-destructive">
                    {errors.job.message}
                  </span>
                )}
              </Field>

              {/* How it should work (Instructions) */}
              <Field data-invalid={!!errors.instructions} className="gap-1.5">
                <FieldLabel
                  htmlFor="edit-bot-instructions"
                  className="text-sm font-medium text-foreground"
                >
                  How it should work
                </FieldLabel>
                <Textarea
                  id="edit-bot-instructions"
                  rows={4}
                  placeholder="Answer briefly, cite sources, and ask before running anything destructive."
                  disabled={isPending || isDeleting}
                  {...register("instructions", {
                    required: "Instructions are required",
                  })}
                  aria-invalid={!!errors.instructions}
                  className="min-h-[104px] rounded-xl bg-muted/20 border-border/60 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring leading-relaxed py-2.5 px-3 max-h-[280px] resize-none"
                />
                {errors.instructions && (
                  <span className="text-xs text-destructive">
                    {errors.instructions.message}
                  </span>
                )}
              </Field>
            </FieldGroup>
          </form>

          {/* Dialog Footer with Delete on justify-start and Cancel/Save on justify-end */}
          <DialogFooter className="px-6 pt-4 pb-5 mt-auto shrink-0 border-t border-border/70 flex items-center justify-between w-full bg-card/95 backdrop-blur-xs">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || isDeleting}
              onClick={() => setOpenConfirmDelete(true)}
              className="rounded-xl h-9 text-sm px-4 font-medium border bg-accent  text-destructive hover:bg-destructive/10 hover:border-destructive/40 transition-colors gap-1.5 cursor-pointer shadow-xs"
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
                form="edit-bot-form"
                disabled={isPending || isDeleting}
                variant="default"
                className="rounded-xl h-9 text-sm px-4.5 font-semibold bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 shadow-xs gap-1.5 transition-colors cursor-pointer"
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
              Delete bot?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{bot.name}</strong>? This action
              cannot be undone and will permanently remove this bot and its
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
              onClick={handleDeleteBot}
              className="gap-1.5 rounded-xl h-9 text-sm px-4 font-semibold cursor-pointer shadow-xs"
            >
              {isDeleting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete bot"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default DialogEditBot;
