import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Button } from "@/components/ui/button";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ai-worker-team",
  description: "AI Worker Team",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <TooltipProvider>
            <Toaster>
              <header className="border-b px-6 py-3 flex items-center justify-between">
                <div className="font-semibold text-base">ai-worker-team</div>
                <div className="flex items-center gap-2">
                  <Suspense fallback={<div className="h-8 w-20" />}>
                    <Show when="signed-out">
                      <SignInButton mode="modal">
                        <Button variant="ghost" size="sm">
                          Sign In
                        </Button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <Button size="sm">Sign Up</Button>
                      </SignUpButton>
                    </Show>
                    <Show when="signed-in">
                      <UserButton />
                    </Show>
                  </Suspense>
                </div>
              </header>
              <main className="flex-1">{children}</main>
            </Toaster>
          </TooltipProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
