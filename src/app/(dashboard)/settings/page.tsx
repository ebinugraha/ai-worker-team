import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { getUserSettingsAction, checkAiModelsAction } from "@/action/settings";
import { SettingsView } from "@/components/settings-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "ai-worker-team - Pengaturan Model AI",
  description: "Kelola konfigurasi provider, API key, dan model AI",
};

function SettingsFallback() {
  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 animate-pulse">
      <div className="flex items-center justify-between border-b border-border/60 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-48 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>

      <div className="h-64 w-full rounded-xl border border-border/40 bg-card/40" />
      <div className="h-48 w-full rounded-xl border border-border/40 bg-card/40" />
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
