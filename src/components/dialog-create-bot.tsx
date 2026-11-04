"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { ShuffleIcon, Loader2Icon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { SeedAvatar } from "@/components/seed-avatar";
import { cn } from "@/lib/utils";
import { createBotAction, type CreateBotInput } from "@/action/bot";

export type BotFormData = CreateBotInput;

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

interface DialogCreateBotProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitSuccess?: (data: BotFormData) => void;
}

export function DialogCreateBot({
  open,
  onOpenChange,
  onSubmitSuccess,
}: DialogCreateBotProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<BotFormData>({
    defaultValues: {
      name: PRESETS[0].name,
      job: PRESETS[0].job,
      instructions: PRESETS[0].instructions,
      avatar: "bot-ada",
    },
  });

  const watchAvatar = useWatch({
    control,
    name: "avatar",
    defaultValue: "bot-ada",
  });

  const watchJob = useWatch({
    control,
    name: "job",
    defaultValue: PRESETS[0].job,
  });

  // Randomize avatar every time the dialog opens
  React.useEffect(() => {
    if (open) {
      setValue("avatar", getRandomAvatarSeed());
    }
  }, [open, setValue]);

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

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setErrorMessage(null);
    }
    onOpenChange(newOpen);
  };

  // Form submit handler calling server action
  const onFormSubmit = (data: BotFormData) => {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const result = await createBotAction({
          name: data.name,
          job: data.job,
          instructions: data.instructions,
          avatar: data.avatar,
        });

        if (!result.success) {
          setErrorMessage(result.error || "Failed to create bot.");
          return;
        }

        // Query refetching via Next.js router
        router.refresh();

        if (onSubmitSuccess) {
          onSubmitSuccess(data);
        }

        onOpenChange(false);
        reset({
          name: PRESETS[0].name,
          job: PRESETS[0].job,
          instructions: PRESETS[0].instructions,
          avatar: getRandomAvatarSeed(),
        });
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[540px] w-full max-h-[calc(100svh-2rem)] sm:max-h-[calc(100svh-3.5rem)] flex flex-col p-0 gap-0 rounded-[20px] bg-card border border-border/80 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 gap-1.5 text-left shrink-0">
          <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
            New bot
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Give it a face, a name, and a job to do.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form
          id="create-bot-form"
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
                htmlFor="bot-name"
                className="text-sm font-medium text-foreground"
              >
                Name
              </FieldLabel>
              <Input
                id="bot-name"
                placeholder="Ada"
                disabled={isPending}
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
                htmlFor="bot-job"
                className="text-sm font-medium text-foreground"
              >
                Job
              </FieldLabel>
              <Input
                id="bot-job"
                placeholder="Research assistant"
                disabled={isPending}
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
                htmlFor="bot-instructions"
                className="text-sm font-medium text-foreground"
              >
                How it should work
              </FieldLabel>
              <Textarea
                id="bot-instructions"
                rows={4}
                placeholder="Answer briefly, cite sources, and ask before running anything destructive."
                disabled={isPending}
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

        <DialogFooter className="px-6 pt-4 pb-5 mt-auto shrink-0 border-t border-border/70 flex items-center justify-end gap-2.5 bg-card/95 backdrop-blur-xs">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-9 text-sm px-4 font-medium border-border/70 bg-secondary/60 hover:bg-secondary text-secondary-foreground transition-colors cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-bot-form"
            disabled={isPending}
            variant="default"
            className="rounded-xl h-9 text-sm px-4.5 font-semibold bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 shadow-xs gap-1.5 transition-colors cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create bot"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreateBot;
