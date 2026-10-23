import { Suspense } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { ModeToggle } from "@/components/mode-toggle";
import { EmptyBots } from "@/components/empty-bots";
import { db, bots } from "@/db";
import { eq } from "drizzle-orm";

async function ProtectedDashboard() {
  await auth.protect();
  const user = await currentUser();

  let userBots: Array<typeof bots.$inferSelect> = [];
  if (user?.id) {
    try {
      userBots = await db.select().from(bots).where(eq(bots.userId, user.id));
    } catch {
      userBots = [];
    }
  }

  if (userBots.length === 0) {
    return <EmptyBots />;
  }

  return (
    <div className="w-full max-w-2xl flex flex-col gap-4 py-8">
      <h2 className="text-xl font-semibold tracking-tight">Your Bots</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {userBots.map((bot) => (
          <div
            key={bot.id}
            className="p-4 rounded-xl border bg-card text-card-foreground shadow-xs flex flex-col gap-1"
          >
            <div className="font-semibold text-base">{bot.name}</div>
            <div className="text-sm text-muted-foreground">{bot.job}</div>
          </div>
        ))}
      </div>
    </div>
  );
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
      <header className="border-b border-border/40 px-6 py-3 flex items-center justify-between">
        <div className="font-semibold text-sm tracking-tight text-foreground">
          AI Worker Team
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserButton />
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
