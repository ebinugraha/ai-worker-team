import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyBots } from "@/components/empty-bots";

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
    <main className="flex-1 flex flex-col items-center justify-center p-6">
      <Suspense fallback={<DashboardFallback />}>
        <ProtectedDashboard />
      </Suspense>
    </main>
  );
}
