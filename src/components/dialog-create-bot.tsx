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
import { createBotAction, type CreateBotInput } from "@/action/bot";
import { cn } from "@/lib/utils";

export type BotFormData = CreateBotInput;

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

  const [selectedPreset, setSelectedPreset] = React.useState<string>(
    PRESETS[0].label
  );

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

  // Handle Preset selection
  const handleSelectPreset = (preset: (typeof PRESETS)[0]) => {
    setSelectedPreset(preset.label);
    setValue("name", preset.name);
    setValue("job", preset.job);
    setValue("instructions", preset.instructions);
  };

  // Shuffle avatar seed
  const handleShuffleAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 10);
    setValue("avatar", randomSeed);
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
        reset();
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-6 gap-5 rounded-2xl bg-card border-border/60">
        <DialogHeader className="gap-1.5 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
            New bot
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Give it a face, a name, and a job to do.
          </DialogDescription>
        </DialogHeader>

        {/* Server Error Alert */}
        {errorMessage && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            {errorMessage}
          </div>
        )}

        {/* Preset Chips */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const isActive = selectedPreset === preset.label;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors border",
                  isActive
                    ? "bg-secondary text-secondary-foreground border-border"
                    : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Face / Avatar Section */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl overflow-hidden shrink-0 border border-border/40 flex items-center justify-center bg-muted/40">
              <SeedAvatar seed={watchAvatar} size={40} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground leading-tight">
                Face
              </span>
              <span className="text-xs text-muted-foreground">
                Shuffle until you find one you like.
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShuffleAvatar}
            className="rounded-full px-3 gap-1.5 text-xs font-medium border-border/80 hover:bg-muted"
          >
            <ShuffleIcon className="size-3.5" data-icon="inline-start" />
            Shuffle
          </Button>
        </div>

        {/* Form Body */}
        <form id="create-bot-form" onSubmit={handleSubmit(onFormSubmit)}>
          <FieldGroup className="gap-4">
            {/* Name Field */}
            <Field data-invalid={!!errors.name} className="gap-1.5">
              <FieldLabel
                htmlFor="bot-name"
                className="text-xs font-medium text-foreground"
              >
                Name
              </FieldLabel>
              <Input
                id="bot-name"
                placeholder="Ada"
                disabled={isPending}
                {...register("name", { required: "Name is required" })}
                aria-invalid={!!errors.name}
                className="rounded-lg bg-muted/20 border-border/60 text-sm focus-visible:ring-1"
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
                className="text-xs font-medium text-foreground"
              >
                Job
              </FieldLabel>
              <Input
                id="bot-job"
                placeholder="Research assistant"
                disabled={isPending}
                {...register("job", { required: "Job is required" })}
                aria-invalid={!!errors.job}
                className="rounded-lg bg-muted/20 border-border/60 text-sm focus-visible:ring-1"
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
                className="text-xs font-medium text-foreground"
              >
                How it should work
              </FieldLabel>
              <Textarea
                id="bot-instructions"
                rows={3}
                placeholder="Answer briefly, cite sources, and ask before running anything destructive."
                disabled={isPending}
                {...register("instructions", {
                  required: "Instructions are required",
                })}
                aria-invalid={!!errors.instructions}
                className="rounded-lg bg-muted/20 border-border/60 text-sm resize-none focus-visible:ring-1 leading-relaxed"
              />
              {errors.instructions && (
                <span className="text-xs text-destructive">
                  {errors.instructions.message}
                </span>
              )}
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter className="mt-2 pt-3 border-t border-border/60 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            className="rounded-lg text-sm px-4"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-bot-form"
            disabled={isPending}
            variant="default"
            className="rounded-lg text-sm px-4 font-semibold shadow-xs gap-1.5"
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
