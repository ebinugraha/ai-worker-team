import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyBots } from "@/components/empty-bots";
import { SidebarTrigger } from "@/components/ui/sidebar";

async function ProtectedDashboard() {
  await auth.protect();
  return <EmptyBots />;
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
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      {/* Mobile-only header to toggle sidebar */}
      <header className="md:hidden h-11 w-full border-b border-border bg-background px-4 flex items-center shrink-0 select-none">
        <SidebarTrigger className="size-8 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer" />
        <span className="ml-2 font-medium text-sm text-foreground">
          Genichiro
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <Suspense fallback={<DashboardFallback />}>
          <ProtectedDashboard />
        </Suspense>
      </main>
    </div>
  );
}
