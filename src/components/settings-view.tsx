"use client";

import * as React from "react";
import {
  saveUserSettingsAction,
  checkAiModelsAction,
  testAiPromptAction,
  type UserSettingsData,
} from "@/action/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  CheckIcon,
  RefreshCwIcon,
  ServerIcon,
  SparklesIcon,
  EyeIcon,
  EyeOffIcon,
  SendIcon,
  LayersIcon,
  SearchIcon,
  ShieldCheckIcon,
  CpuIcon,
  RotateCcwIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  BotIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PresetProvider {
  name: string;
  description: string;
  baseUrl: string;
  defaultModel: string;
}

const PRESET_PROVIDERS: PresetProvider[] = [
  {
    name: "OMO API Call",
    description: "GLM, Gemini, DeepSeek, & Kimi endpoint",
    baseUrl: "https://omoapicall.web.id/v1",
    defaultModel: "glm-5.3-flashh",
  },
  {
    name: "9router (Local)",
    description: "Local high-performance router",
    baseUrl: "http://100.74.237.58:20128/v1",
    defaultModel: "my-combo-9router",
  },
  {
    name: "OpenAI",
    description: "Official OpenAI API endpoint",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  {
    name: "OpenRouter",
    description: "Universal unified multi-model router",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-sonnet",
  },
];

interface SettingsViewProps {
  initialSettings: UserSettingsData;
  initialModels?: string[];
}

export function SettingsView({ initialSettings, initialModels = [] }: SettingsViewProps) {
  const [baseUrl, setBaseUrl] = React.useState(initialSettings.aiBaseUrl);
  const [apiKey, setApiKey] = React.useState(initialSettings.aiApiKey);
  const [model, setModel] = React.useState(initialSettings.aiModel);
  const [showApiKey, setShowApiKey] = React.useState(false);

  // Status and save states
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveFeedback, setSaveFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Model checking states
  const [isCheckingModels, setIsCheckingModels] = React.useState(false);
  const [modelFilter, setModelFilter] = React.useState("");
  const [fetchedModels, setFetchedModels] = React.useState<string[]>(initialModels);
  const [checkResult, setCheckResult] = React.useState<{
    success: boolean;
    latencyMs?: number;
    message: string;
  } | null>(
    initialModels.length > 0
      ? {
          success: true,
          message: `Ditemukan ${initialModels.length} model aktif dari endpoint.`,
        }
      : null
  );

  // Model prompt test states
  const [testPrompt, setTestPrompt] = React.useState(
    "Halo! Konfirmasi model apa yang kamu gunakan dan siap membantu apa?"
  );
  const [isTestingPrompt, setIsTestingPrompt] = React.useState(false);
  const [testResponse, setTestResponse] = React.useState<{
    success: boolean;
    reply?: string;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  const handleCheckModels = React.useCallback(
    async (urlToCheck = baseUrl, keyToCheck = apiKey) => {
      if (!urlToCheck.trim()) return;

      setIsCheckingModels(true);
      setCheckResult(null);

      try {
        const res = await checkAiModelsAction({
          aiBaseUrl: urlToCheck,
          aiApiKey: keyToCheck,
        });

        if (res.success && res.data) {
          setFetchedModels(res.data.models);
          setCheckResult({
            success: true,
            latencyMs: res.data.latencyMs,
            message: res.message || `Ditemukan ${res.data.models.length} model.`,
          });
        } else {
          setCheckResult({
            success: false,
            message: res.error || "Gagal memeriksa model dari endpoint.",
          });
        }
      } catch (err: unknown) {
        setCheckResult({
          success: false,
          message: err instanceof Error ? err.message : "Terjadi kesalahan.",
        });
      } finally {
        setIsCheckingModels(false);
      }
    },
    [baseUrl, apiKey]
  );

  const handleApplyPreset = (preset: PresetProvider) => {
    setBaseUrl(preset.baseUrl);
    setModel(preset.defaultModel);
    setSaveFeedback(null);
    handleCheckModels(preset.baseUrl, apiKey);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveFeedback(null);

    try {
      const res = await saveUserSettingsAction({
        aiBaseUrl: baseUrl,
        aiApiKey: apiKey,
        aiModel: model,
      });

      if (res.success) {
        setSaveFeedback({
          type: "success",
          message: res.message || "Pengaturan AI berhasil disimpan!",
        });
      } else {
        setSaveFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan pengaturan.",
        });
      }
    } catch (err: unknown) {
      setSaveFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan sistem.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setBaseUrl(initialSettings.aiBaseUrl);
    setApiKey(initialSettings.aiApiKey);
    setModel(initialSettings.aiModel);
    setSaveFeedback({
      type: "success",
      message: "Form dikembalikan ke nilai default konfigurasi awal.",
    });
  };

  const handleRunPromptTest = async () => {
    if (!baseUrl.trim() || !model.trim()) return;

    setIsTestingPrompt(true);
    setTestResponse(null);

    try {
      const res = await testAiPromptAction({
        aiBaseUrl: baseUrl,
        aiApiKey: apiKey,
        aiModel: model,
        prompt: testPrompt,
      });

      if (res.success && res.data) {
        setTestResponse({
          success: true,
          reply: res.data.reply,
          latencyMs: res.data.latencyMs,
        });
      } else {
        setTestResponse({
          success: false,
          error: res.error || "Gagal mendapatkan respon dari model.",
        });
      }
    } catch (err: unknown) {
      setTestResponse({
        success: false,
        error: err instanceof Error ? err.message : "Terjadi kesalahan uji coba.",
      });
    } finally {
      setIsTestingPrompt(false);
    }
  };

  // Filtered model list
  const filteredModels = React.useMemo(() => {
    if (!modelFilter.trim()) return fetchedModels;
    const q = modelFilter.toLowerCase();
    return fetchedModels.filter((m) => m.toLowerCase().includes(q));
  }, [fetchedModels, modelFilter]);

  // Model categories for quick filter
  const categoryFilters = React.useMemo(() => {
    const list = ["Semua"];
    if (fetchedModels.some((m) => /glm/i.test(m))) list.push("GLM");
    if (fetchedModels.some((m) => /deepseek/i.test(m))) list.push("DeepSeek");
    if (fetchedModels.some((m) => /gemini/i.test(m))) list.push("Gemini");
    if (fetchedModels.some((m) => /kimi/i.test(m))) list.push("Kimi");
    if (fetchedModels.some((m) => /minimax/i.test(m))) list.push("MiniMax");
    if (fetchedModels.some((m) => /gpt|openai/i.test(m))) list.push("OpenAI");
    if (fetchedModels.some((m) => /claude/i.test(m))) list.push("Claude");
    return list;
  }, [fetchedModels]);

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 overflow-y-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <SidebarTrigger className="md:hidden size-8 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer" />
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BotIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                Pengaturan Model & Agent AI
              </h1>
              <p className="text-sm text-muted-foreground">
                Kustomisasi provider, API key, dan model AI yang digunakan oleh seluruh agen workspace Anda.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={initialSettings.isConfigured ? "default" : "secondary"}
            className="h-7 px-3 text-xs gap-1.5"
          >
            <ShieldCheckIcon className="size-3.5" />
            {initialSettings.isConfigured ? "Custom Terpasang" : "Default Mode"}
          </Badge>
          <Badge variant="outline" className="h-7 px-3 text-xs gap-1.5 border-border/60">
            <CpuIcon className="size-3.5 text-primary" />
            Model Aktif: <span className="font-mono text-foreground">{model}</span>
          </Badge>
        </div>
      </div>

      {/* Preset providers selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground flex items-center gap-2">
            <LayersIcon className="size-4 text-primary" />
            Pilih Provider Cepat (Preset)
          </span>
          <span className="text-xs text-muted-foreground">
            Klik salah satu untuk otomatis mengisi endpoint & default model
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESET_PROVIDERS.map((preset) => {
            const isSelected = baseUrl === preset.baseUrl;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={cn(
                  "flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer outline-none select-none",
                  isSelected
                    ? "bg-primary/10 border-primary text-foreground shadow-xs ring-1 ring-primary/40"
                    : "bg-card border-border/60 hover:bg-accent/60 hover:border-border text-foreground"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium text-sm">{preset.name}</span>
                  {isSelected && <CheckIcon className="size-4 text-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {preset.description}
                </p>
                <div className="mt-2 text-[11px] font-mono text-muted-foreground/80 truncate">
                  {preset.defaultModel}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <Card className="bg-card border-border/60 shadow-xs">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ServerIcon className="size-4 text-primary" />
              Kredensial & Endpoint API
            </CardTitle>
            <CardDescription>
              Endpoint OpenAI-compatible (v1/chat/completions dan v1/models).
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Base URL */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center justify-between">
                <span>Base URL Provider</span>
                <span className="text-xs text-muted-foreground">Wajib berakhiran /v1</span>
              </label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://omoapicall.web.id/v1"
                required
                className="font-mono text-sm"
              />
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">API Key / Token</label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-... atau omop-..."
                  className="font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  title={showApiKey ? "Sembunyikan API Key" : "Tampilkan API Key"}
                >
                  {showApiKey ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Model Name Input + Check Button */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Nama Model Yang Digunakan
                </label>
                <span className="text-xs text-muted-foreground">
                  Pilih dari badge di bawah atau ketik manual
                </span>
              </div>

              <div className="flex gap-2">
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="glm-5.3-flashh"
                  required
                  className="font-mono text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCheckModels()}
                  disabled={isCheckingModels || !baseUrl.trim()}
                  className="shrink-0 gap-1.5"
                >
                  <RefreshCwIcon
                    className={cn("size-3.5", isCheckingModels && "animate-spin")}
                  />
                  {isCheckingModels ? "Mengecek..." : "Cek Model"}
                </Button>
              </div>
            </div>

            {/* Check models feedback banner */}
            {checkResult && (
              <div
                className={cn(
                  "p-3 rounded-lg text-xs flex items-start gap-2.5 transition-all",
                  checkResult.success
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                )}
              >
                {checkResult.success ? (
                  <CheckCircle2Icon className="size-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-medium">
                    {checkResult.success ? "Koneksi Berhasil" : "Koneksi Bermasalah"}
                    {checkResult.latencyMs !== undefined && (
                      <span className="ml-2 font-mono text-[11px] opacity-80">
                        ⚡ {checkResult.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 leading-relaxed">{checkResult.message}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Badges Explorer */}
        <Card className="bg-card border-border/60 shadow-xs">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <SparklesIcon className="size-4 text-primary" />
                  Daftar Model Tersedia (Klik Badge untuk Memilih)
                </CardTitle>
                <CardDescription>
                  Klik salah satu badge model untuk langsung menggunakannya sebagai model aktif.
                </CardDescription>
              </div>

              {fetchedModels.length > 0 && (
                <Badge variant="secondary" className="w-fit">
                  {fetchedModels.length} Model Ditemukan
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {fetchedModels.length > 0 ? (
              <>
                {/* Search & Category filter */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      value={modelFilter}
                      onChange={(e) => setModelFilter(e.target.value)}
                      placeholder="Cari nama model..."
                      className="pl-8 text-xs h-8"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {categoryFilters.map((cat) => {
                      const isActive =
                        cat === "Semua" ? !modelFilter : modelFilter.toLowerCase() === cat.toLowerCase();
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setModelFilter(cat === "Semua" ? "" : cat)}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-full transition-colors cursor-pointer shrink-0",
                            isActive
                              ? "bg-primary text-primary-foreground font-medium"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          )}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Badges container */}
                <div className="flex flex-wrap gap-2 pt-2 max-h-72 overflow-y-auto pr-1 border border-border/40 rounded-xl p-3 bg-background/50">
                  {filteredModels.length > 0 ? (
                    filteredModels.map((m) => {
                      const isSelected = model === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setModel(m)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border outline-none select-none",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/40 font-semibold"
                              : "bg-card text-foreground border-border/60 hover:bg-accent hover:border-border"
                          )}
                        >
                          {isSelected ? (
                            <CheckIcon className="size-3.5 text-primary-foreground shrink-0" />
                          ) : (
                            <CpuIcon className="size-3 text-muted-foreground shrink-0" />
                          )}
                          <span>{m}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="w-full py-6 text-center text-xs text-muted-foreground">
                      Tidak ada model yang cocok dengan kata kunci &quot;{modelFilter}&quot;.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 px-4 border border-dashed border-border/80 rounded-xl bg-background/30 space-y-3">
                <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                  <LayersIcon className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Belum ada model yang dimuat
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Klik tombol &quot;Cek Model&quot; di atas untuk mengambil daftar model resmi yang didukung oleh endpoint API Anda.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCheckModels()}
                  disabled={isCheckingModels || !baseUrl.trim()}
                  className="gap-1.5"
                >
                  <RefreshCwIcon className={cn("size-3.5", isCheckingModels && "animate-spin")} />
                  {isCheckingModels ? "Mengecek Model..." : "Muat Model Sekarang"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Test Playground */}
        <Card className="bg-card border-border/60 shadow-xs">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <SendIcon className="size-4 text-primary" />
              Uji Coba Respon Model (Testing Langsung)
            </CardTitle>
            <CardDescription>
              Kirim prompt uji coba untuk memastikan model yang Anda pilih merespons dengan benar tanpa error 502/401.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Pesan Uji Coba</label>
              <div className="flex gap-2">
                <Input
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Ketik prompt test..."
                  className="text-sm"
                />
                <Button
                  type="button"
                  onClick={handleRunPromptTest}
                  disabled={isTestingPrompt || !baseUrl.trim() || !model.trim()}
                  className="shrink-0 gap-1.5"
                >
                  <SendIcon className={cn("size-3.5", isTestingPrompt && "animate-pulse")} />
                  {isTestingPrompt ? "Menguji..." : "Kirim Uji Coba"}
                </Button>
              </div>
            </div>

            {/* Test response bubble */}
            {testResponse && (
              <div
                className={cn(
                  "p-4 rounded-xl text-xs space-y-2 border transition-all",
                  testResponse.success
                    ? "bg-secondary/40 border-border/60 text-foreground"
                    : "bg-destructive/10 border-destructive/20 text-destructive"
                )}
              >
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1.5">
                    {testResponse.success ? (
                      <CheckCircle2Icon className="size-3.5 text-emerald-400" />
                    ) : (
                      <AlertCircleIcon className="size-3.5 text-destructive" />
                    )}
                    {testResponse.success
                      ? `Respon dari [${model}]`
                      : "Uji Coba Gagal"}
                  </span>
                  {testResponse.latencyMs !== undefined && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Latency: {testResponse.latencyMs}ms
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-background/60 border border-border/40 font-mono text-[12px] leading-relaxed whitespace-pre-wrap select-text">
                  {testResponse.success ? testResponse.reply : testResponse.error}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback message banner */}
        {saveFeedback && (
          <div
            className={cn(
              "p-3 rounded-xl text-sm flex items-center gap-2.5 transition-all",
              saveFeedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            )}
          >
            {saveFeedback.type === "success" ? (
              <CheckCircle2Icon className="size-4 shrink-0" />
            ) : (
              <AlertCircleIcon className="size-4 shrink-0" />
            )}
            <span>{saveFeedback.message}</span>
          </div>
        )}

        {/* Footer Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetToDefault}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcwIcon className="size-3.5" />
            Kembalikan ke Default (.env)
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="submit"
              disabled={isSaving}
              className="gap-2 w-full sm:w-auto px-6"
            >
              <CheckIcon className="size-4" />
              {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
