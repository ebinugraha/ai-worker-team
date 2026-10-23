"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeedAvatar } from "@/components/seed-avatar";
import { DialogCreateBot } from "@/components/dialog-create-bot";
import type { bots } from "@/db";

interface BotListProps {
  initialBots: Array<typeof bots.$inferSelect>;
}

export function BotList({ initialBots }: BotListProps) {
  const [openCreateBot, setOpenCreateBot] = useState(false);

  return (
    <div className="w-full max-w-4xl flex flex-col gap-6 py-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Your bots
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your AI teammates and their instructions.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setOpenCreateBot(true)}
          className="gap-1.5 rounded-xl text-xs font-medium"
        >
          <PlusIcon className="size-3.5" data-icon="inline-start" />
          Create bot
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initialBots.map((bot) => (
          <div
            key={bot.id}
            className="p-4 rounded-2xl border border-border/60 bg-card text-card-foreground shadow-xs flex flex-col gap-3 transition-colors hover:border-border"
          >
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl overflow-hidden shrink-0 border border-border/40 flex items-center justify-center bg-muted/40">
                <SeedAvatar seed={bot.avatar} size={40} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm tracking-tight text-foreground truncate">
                  {bot.name}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {bot.job}
                </span>
              </div>
            </div>

            {bot.instruction && (
              <p className="text-xs text-muted-foreground/90 line-clamp-2 bg-muted/20 p-2.5 rounded-lg border border-border/30">
                {bot.instruction}
              </p>
            )}
          </div>
        ))}
      </div>

      <DialogCreateBot open={openCreateBot} onOpenChange={setOpenCreateBot} />
    </div>
  );
}

export default BotList;
