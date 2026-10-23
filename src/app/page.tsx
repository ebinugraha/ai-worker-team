import { Suspense } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

async function ProtectedDashboard() {
  await auth.protect();
  const user = await currentUser();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Welcome, {user?.firstName || user?.fullName || "Team Member"}!
          </CardTitle>
          <Badge variant="default">Authenticated</Badge>
        </div>
        <CardDescription>
          Your session is active and secure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">User ID: </span>
            <code className="text-xs bg-muted px-2 py-1 rounded">{user?.id}</code>
          </div>
          {user?.primaryEmailAddress && (
            <div>
              <span className="font-medium text-muted-foreground">Email: </span>
              <span>{user.primaryEmailAddress.emailAddress}</span>
            </div>
          )}
          {user?.fullName && (
            <div>
              <span className="font-medium text-muted-foreground">Full Name: </span>
              <span>{user.fullName}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardFallback() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-4 w-72 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-3xl">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Worker Team</h1>
          <p className="text-muted-foreground mt-1">
            Protected Dashboard Workspace
          </p>
        </div>

        <Suspense fallback={<DashboardFallback />}>
          <ProtectedDashboard />
        </Suspense>
      </div>
    </div>
  );
}
