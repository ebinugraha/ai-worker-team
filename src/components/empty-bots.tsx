"use client";

import { useSyncExternalStore } from "react";
import { PlusIcon } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { SeedAvatar } from "@/components/seed-avatar";

const emptySubscribe = () => () => {};

let cachedClientSeed = "";
function getClientSeed() {
  if (!cachedClientSeed) {
    cachedClientSeed = Math.random().toString(36).substring(2, 10);
  }
  return cachedClientSeed;
}

function getServerSeed() {
  return "bot-default";
}

interface EmptyBotsProps {
  onCreateBot?: () => void;
  seed?: string;
}

export function EmptyBots({ onCreateBot, seed: customSeed }: EmptyBotsProps) {
  const dynamicSeed = useSyncExternalStore(
    emptySubscribe,
    getClientSeed,
    getServerSeed
  );

  const seed = customSeed || dynamicSeed;

  return (
    <Empty className="min-h-[380px] max-w-md mx-auto py-12 px-4 border-0">
      <EmptyHeader className="gap-3">
        <EmptyMedia>
          <div className="size-12 rounded-full overflow-hidden flex items-center justify-center p-0.5">
            <SeedAvatar seed={seed} size={44} />
          </div>
        </EmptyMedia>
        <EmptyTitle className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Meet your first bot
        </EmptyTitle>
        <EmptyDescription className="text-sm text-muted-foreground text-balance max-w-sm leading-relaxed">
          Every bot gets its own personality, memory, and face. Spin one up and
          start the conversation.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="mt-2">
        <Button
          onClick={onCreateBot}
          variant="secondary"
          size="lg"
          className="rounded-xl px-4 font-medium transition-colors"
        >
          <PlusIcon data-icon="inline-start" />
          Create a new bot
        </Button>
      </EmptyContent>
    </Empty>
  );
}
