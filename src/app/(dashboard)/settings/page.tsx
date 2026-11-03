import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { getUserSettingsAction, checkAiModelsAction } from "@/action/settings";
import { SettingsView } from "@/components/settings-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Genichiro - Pengaturan Model AI",
  description: "Kelola konfigurasi provider, API key, dan model AI",
};

function SettingsFallback() {
  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background animate-pulse">
      <header className="h-13 shrink-0 flex items-center justify-between px-4 sm:px-6 md:px-8 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Skeleton className="size-7 rounded-md" />
          <div className="h-4 w-px bg-border/60" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <Skeleton className="h-8 w-18 rounded-full" />
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full flex flex-col md:flex-row min-h-full">
          <div className="w-full md:w-56 lg:w-60 shrink-0 p-4 sm:p-6 md:py-8 md:pl-8 md:pr-4 flex md:flex-col gap-2">
            <Skeleton className="h-8 w-24 md:w-full rounded-full" />
            <Skeleton className="h-8 w-24 md:w-full rounded-full" />
            <Skeleton className="h-8 w-28 md:w-full rounded-full" />
            <Skeleton className="h-8 w-24 md:w-full rounded-full" />
          </div>

          <div className="flex-1 min-w-0 p-4 sm:p-6 md:py-8 md:px-8 lg:px-12 md:border-l md:border-border/30 max-w-2xl space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-3.5 w-80 rounded" />
            </div>

            <div className="divide-y divide-border/30">
              <div className="py-4 flex justify-between items-center">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-8 w-56 rounded-lg" />
              </div>
              <div className="py-4 flex justify-between items-center">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-8 w-64 rounded-lg" />
              </div>
              <div className="py-4 flex justify-between items-center">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-8 w-64 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function AsyncSettingsContent() {
  await auth.protect();
  const result = await getUserSettingsAction();

  const initialSettings =
    result.success && result.data
      ? result.data
      : {
          aiBaseUrl:
            process.env.AI_BASE_URL ||
            process.env.NINE_ROUTER_BASE_URL ||
            "https://omoapicall.web.id/v1",
          aiApiKey:
            process.env.AI_API_KEY || process.env.NINE_ROUTER_API_KEY || "",
          aiModel: process.env.AI_MODEL || "glm-5.3-flashh",
          temperature: "0.2",
          maxTokens: 8192,
          maxAutoContinues: 10,
          autoMemory: true,
          syntaxTheme: "dracula-soft",
          terminalDensity: "editor",
          isConfigured: false,
        };

  let initialModels: string[] = [];
  try {
    const modelsResult = await checkAiModelsAction({
      aiBaseUrl: initialSettings.aiBaseUrl,
      aiApiKey: initialSettings.aiApiKey,
    });
    if (modelsResult.success && modelsResult.data) {
      initialModels = modelsResult.data.models;
    }
  } catch {
    // Graceful fallback if offline
  }

  return (
    <SettingsView
      initialSettings={initialSettings}
      initialModels={initialModels}
    />
  );
}

export default function SettingsPage() {
  return (
    <main className="flex-1 flex flex-col min-w-0 h-svh max-h-svh overflow-hidden bg-background">
      <Suspense fallback={<SettingsFallback />}>
        <AsyncSettingsContent />
      </Suspense>
    </main>
  );
}
