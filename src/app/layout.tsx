import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";

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
              <main className="flex-1 flex flex-col">{children}</main>
            </Toaster>
          </TooltipProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
