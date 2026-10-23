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

async function AuthStatusCard() {
  const { isAuthenticated, userId } = await auth();
  const user = isAuthenticated ? await currentUser() : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Authentication Status</CardTitle>
          {isAuthenticated ? (
            <Badge variant="default">Signed In</Badge>
          ) : (
            <Badge variant="secondary">Signed Out</Badge>
          )}
        </div>
        <CardDescription>
          {isAuthenticated
            ? "You are authenticated and your session is active."
            : "You are browsing as a guest. Sign in to access your team workspace."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAuthenticated ? (
          <div className="flex flex-col gap-2 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">User ID: </span>
              <code className="text-xs bg-muted px-2 py-1 rounded">{userId}</code>
            </div>
            {user?.primaryEmailAddress && (
              <div>
                <span className="font-medium text-muted-foreground">Email: </span>
                <span>{user.primaryEmailAddress.emailAddress}</span>
              </div>
            )}
            {user?.fullName && (
              <div>
                <span className="font-medium text-muted-foreground">Name: </span>
                <span>{user.fullName}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click &quot;Sign In&quot; or &quot;Sign Up&quot; on the top right to test the Clerk authentication modal.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AuthStatusFallback() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-4 w-72 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-full" />
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
            Authentication with Clerk and UI components from shadcn/ui.
          </p>
        </div>

        <Suspense fallback={<AuthStatusFallback />}>
          <AuthStatusCard />
        </Suspense>
      </div>
    </div>
  );
}
