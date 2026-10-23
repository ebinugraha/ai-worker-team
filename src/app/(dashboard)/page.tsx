import { Suspense } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Skeleton } from "@/components/ui/skeleton";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { EmptyBots } from "@/components/empty-bots";
import { BotList } from "@/components/bot-list";
import { db, bots } from "@/db";
import { eq, desc } from "drizzle-orm";

async function ProtectedDashboard() {
  await auth.protect();
  const user = await currentUser();

  let userBots: Array<typeof bots.$inferSelect> = [];
  if (user?.id) {
    try {
      userBots = await db
        .select()
        .from(bots)
        .where(eq(bots.userId, user.id))
        .orderBy(desc(bots.createdAt));
    } catch {
      userBots = [];
    }
  }

  if (userBots.length === 0) {
    return <EmptyBots />;
  }

  return <BotList initialBots={userBots} />;
}

function DashboardFallback() {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <Skeleton className="size-10 rounded-full" />
      <Skeleton className="h-7 w-48 rounded-lg" />
      <Skeleton className="h-4 w-72 rounded-md" />
      <Skeleton className="h-4 w-56 rounded-md" />
      <Skeleton className="h-9 w-36 rounded-xl mt-2" />
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-border/40 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="font-semibold text-sm tracking-tight text-foreground">
            AI Worker Team
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <Suspense fallback={<DashboardFallback />}>
          <ProtectedDashboard />
        </Suspense>
      </main>
    </div>
  );
}
