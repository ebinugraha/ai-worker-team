"use client";

import * as React from "react";
import {
  saveUserSettingsAction,
  checkAiModelsAction,
  testAiPromptAction,
  testModelConnection,
  type UserSettingsData,
} from "@/action/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  CheckIcon,
  RefreshCwIcon,
  ServerIcon,
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
  WrenchIcon,
  TerminalIcon,
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

  // Model connection & tool calling test states
  const [isTestingModel, setIsTestingModel] = React.useState(false);
  const [testModelResult, setTestModelResult] = React.useState<{
    success: boolean;
    supportsToolCalling?: boolean;
    latencyMs?: number;
    message: string;
    toolCallSample?: string;
  } | null>(null);

  const handleTestModel = async () => {
    if (!baseUrl.trim() || !model.trim()) return;
    setIsTestingModel(true);
    setTestModelResult(null);

    try {
      const res = await testModelConnection({
        aiBaseUrl: baseUrl,
        aiApiKey: apiKey,
        aiModel: model,
      });

      if (res.success && res.data) {
        setTestModelResult({
          success: true,
          supportsToolCalling: res.data.supportsToolCalling,
          latencyMs: res.data.latencyMs,
          message: res.data.message,
          toolCallSample: res.data.toolCallSample,
        });
      } else {
        setTestModelResult({
          success: false,
          supportsToolCalling: false,
          message: res.error || "Gagal menguji model.",
        });
      }
    } catch (err: unknown) {
      setTestModelResult({
        success: false,
        supportsToolCalling: false,
        message:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat menguji model.",
      });
    } finally {
      setIsTestingModel(false);
    }
  };

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
    <div className="flex-1 w-full max-w-7xl mx-auto p-6 sm:p-8 md:p-10 space-y-8 overflow-y-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <SidebarTrigger className="md:hidden size-8 -ml-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer" />
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-0.5">
              <span>workspace</span>
              <span>/</span>
              <span className="text-zinc-300">settings</span>
              <span>/</span>
              <span className="text-zinc-100 font-semibold">models</span>
            </div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-100">
              AI Model & Provider Configuration
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
            <ShieldCheckIcon className="size-3.5 text-emerald-400" />
            <span>{initialSettings.isConfigured ? "Custom Provider" : "Default Mode"}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
            <CpuIcon className="size-3.5 text-zinc-300" />
            <span className="truncate max-w-[150px]">{model}</span>
          </div>
        </div>
      </div>

      {/* Preset Quick Select Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
            <LayersIcon className="size-3.5 text-zinc-400" />
            Provider Presets
          </span>
          <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
            Click to auto-populate endpoint & default model
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {PRESET_PROVIDERS.map((preset) => {
            const isSelected = baseUrl === preset.baseUrl;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={cn(
                  "flex flex-col text-left p-3 rounded-md border transition-colors cursor-pointer outline-none select-none",
                  isSelected
                    ? "bg-zinc-900 border-zinc-500 text-zinc-100 ring-1 ring-zinc-500"
                    : "bg-zinc-950/60 border-zinc-800 hover:bg-zinc-900/50 hover:border-zinc-700 text-zinc-300"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-xs text-zinc-200">{preset.name}</span>
                  {isSelected && <CheckIcon className="size-3.5 text-emerald-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
                  {preset.description}
                </p>
                <div className="mt-2 text-[10px] font-mono text-zinc-400 truncate">
                  {preset.defaultModel}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-Column Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Connection (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <form onSubmit={handleSave} className="space-y-5">
            <Card className="bg-[#121215] border border-zinc-800 rounded-md shadow-xs">
              <CardHeader className="border-b border-zinc-800/80 px-4 py-3">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <ServerIcon className="size-3.5 text-zinc-400" />
                  API Credentials & Routing
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  OpenAI-compatible HTTP endpoint specifications (/v1/chat/completions).
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Base URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-zinc-300">Base URL</label>
                    <span className="font-mono text-[11px] text-zinc-500">Must end in /v1</span>
                  </div>
                  <Input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://omoapicall.web.id/v1"
                    required
                    className="font-mono text-xs h-8 bg-zinc-950 border-zinc-800 focus:border-zinc-600 rounded-md"
                  />
                </div>

                {/* API Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">API Key / Auth Bearer</label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-... or omop-..."
                      className="font-mono text-xs h-8 bg-zinc-950 border-zinc-800 focus:border-zinc-600 rounded-md pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                      title={showApiKey ? "Hide API Key" : "Show API Key"}
                    >
                      {showApiKey ? (
                        <EyeOffIcon className="size-3.5" />
                      ) : (
                        <EyeIcon className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Model Selection & Check */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-zinc-300">Active Model Name</label>
                    <span className="font-mono text-[11px] text-zinc-500">
                      Exact identifier
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="glm-5.3-flashh"
                      required
                      className="font-mono text-xs h-8 bg-zinc-950 border-zinc-800 focus:border-zinc-600 rounded-md flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCheckModels()}
                      disabled={isCheckingModels || !baseUrl.trim()}
                      className="h-8 px-3 text-xs font-mono border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-md shrink-0 gap-1.5"
                    >
                      <RefreshCwIcon
                        className={cn("size-3", isCheckingModels && "animate-spin")}
                      />
                      {isCheckingModels ? "Querying..." : "Scan Models"}
                    </Button>
                  </div>
                </div>

                {/* Check models feedback banner */}
                {checkResult && (
                  <div
                    className={cn(
                      "p-3 rounded-md text-xs font-mono flex items-start gap-2.5 border transition-all",
                      checkResult.success
                        ? "bg-emerald-950/20 text-emerald-300 border-emerald-500/30"
                        : "bg-rose-950/20 text-rose-300 border-rose-500/30"
                    )}
                  >
                    {checkResult.success ? (
                      <CheckCircle2Icon className="size-4 shrink-0 mt-0.5 text-emerald-400" />
                    ) : (
                      <AlertCircleIcon className="size-4 shrink-0 mt-0.5 text-rose-400" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold flex items-center justify-between">
                        <span>{checkResult.success ? "Endpoint Online" : "Connection Error"}</span>
                        {checkResult.latencyMs !== undefined && (
                          <span className="tabular-nums text-[11px] opacity-80">
                            {checkResult.latencyMs}ms
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] opacity-90 leading-relaxed font-sans">
                        {checkResult.message}
                      </div>
                    </div>
                  </div>
                )}

                {/* Model Connection & Tool Calling Test Banner */}
                {testModelResult && (
                  <div
                    className={cn(
                      "p-3 rounded-md text-xs font-mono space-y-2 border transition-all",
                      testModelResult.success
                        ? testModelResult.supportsToolCalling
                          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                          : "bg-amber-950/20 border-amber-500/30 text-amber-300"
                        : "bg-rose-950/20 border-rose-500/30 text-rose-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {testModelResult.success ? (
                          testModelResult.supportsToolCalling ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              ✓ TOOL CALLING VERIFIED
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/40">
                              ! PROMPT-ONLY MODE
                            </span>
                          )
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            ✕ TEST FAILED
                          </span>
                        )}
                        <span className="font-semibold text-zinc-200">
                          [{model}]
                        </span>
                      </div>
                      {testModelResult.latencyMs !== undefined && (
                        <span className="tabular-nums text-[11px] text-zinc-400">
                          {testModelResult.latencyMs}ms
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      {testModelResult.message}
                    </p>

                    {testModelResult.toolCallSample && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">
                          Sample Tool Call Payload:
                        </span>
                        <pre className="p-2 rounded bg-black border border-zinc-800 font-mono text-[11px] overflow-x-auto text-zinc-300">
                          {testModelResult.toolCallSample}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Save feedback banner */}
                {saveFeedback && (
                  <div
                    className={cn(
                      "p-3 rounded-md text-xs font-mono flex items-center gap-2.5 border transition-all",
                      saveFeedback.type === "success"
                        ? "bg-emerald-950/20 text-emerald-300 border-emerald-500/30"
                        : "bg-rose-950/20 text-rose-300 border-rose-500/30"
                    )}
                  >
                    {saveFeedback.type === "success" ? (
                      <CheckCircle2Icon className="size-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircleIcon className="size-4 shrink-0 text-rose-400" />
                    )}
                    <span>{saveFeedback.message}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetToDefault}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md gap-1.5"
              >
                <RotateCcwIcon className="size-3" />
                Reset Defaults
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestModel}
                  disabled={isTestingModel || !baseUrl.trim() || !model.trim()}
                  className="h-8 text-xs font-mono gap-1.5 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-md cursor-pointer flex-1 sm:flex-initial"
                >
                  <WrenchIcon
                    className={cn("size-3.5 text-amber-400", isTestingModel && "animate-spin")}
                  />
                  {isTestingModel ? "Testing Tool..." : "Verify Model"}
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  className="h-8 px-4 text-xs font-mono font-medium gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 border border-zinc-200 rounded-md shadow-xs cursor-pointer flex-1 sm:flex-initial"
                >
                  <CheckIcon className="size-3.5" />
                  {isSaving ? "Saving..." : "Save Config"}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Model Explorer & Live Prompt Probe (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Model Catalog Card */}
          <Card className="bg-[#121215] border border-zinc-800 rounded-md shadow-xs">
            <CardHeader className="border-b border-zinc-800/80 px-4 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <CpuIcon className="size-3.5 text-zinc-400" />
                  Detected Models
                </CardTitle>
                {fetchedModels.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 tabular-nums">
                    {fetchedModels.length} available
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {fetchedModels.length > 0 ? (
                <>
                  <div className="relative">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-zinc-500" />
                    <Input
                      value={modelFilter}
                      onChange={(e) => setModelFilter(e.target.value)}
                      placeholder="Filter model identifiers..."
                      className="pl-8 text-xs font-mono h-7 bg-zinc-950 border-zinc-800 focus:border-zinc-600 rounded-md"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {categoryFilters.map((cat) => {
                      const isActive =
                        cat === "Semua" ? !modelFilter : modelFilter.toLowerCase() === cat.toLowerCase();
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setModelFilter(cat === "Semua" ? "" : cat)}
                          className={cn(
                            "text-[10px] font-mono px-2 py-0.5 rounded transition-colors cursor-pointer shrink-0 border",
                            isActive
                              ? "bg-zinc-100 text-zinc-950 font-semibold border-zinc-200"
                              : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                          )}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Badges container */}
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-56 overflow-y-auto pr-1 border border-zinc-800/60 rounded-md p-2 bg-zinc-950/60">
                    {filteredModels.length > 0 ? (
                      filteredModels.map((m) => {
                        const isSelected = model === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setModel(m)}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer border select-none",
                              isSelected
                                ? "bg-zinc-100 text-zinc-950 border-zinc-200 font-semibold shadow-2xs"
                                : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white"
                            )}
                          >
                            {isSelected ? (
                              <CheckIcon className="size-3 text-zinc-950 shrink-0" />
                            ) : (
                              <CpuIcon className="size-3 text-zinc-500 shrink-0" />
                            )}
                            <span className="truncate max-w-[190px]">{m}</span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="w-full py-4 text-center text-xs font-mono text-zinc-500">
                        No models matching &quot;{modelFilter}&quot;
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 px-3 border border-dashed border-zinc-800 rounded-md bg-zinc-950/30 space-y-2">
                  <TerminalIcon className="size-5 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400 font-mono">
                    No models cached yet.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCheckModels()}
                    disabled={isCheckingModels || !baseUrl.trim()}
                    className="h-7 text-xs font-mono border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-md"
                  >
                    <RefreshCwIcon className={cn("size-3", isCheckingModels && "animate-spin")} />
                    {isCheckingModels ? "Scanning..." : "Scan Models Now"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Prompt Probe Card */}
          <Card className="bg-[#121215] border border-zinc-800 rounded-md shadow-xs">
            <CardHeader className="border-b border-zinc-800/80 px-4 py-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <SendIcon className="size-3.5 text-zinc-400" />
                Live Prompt Verification
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Input
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Test prompt string..."
                  className="text-xs font-mono h-8 bg-zinc-950 border-zinc-800 focus:border-zinc-600 rounded-md"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleRunPromptTest}
                  disabled={isTestingPrompt || !baseUrl.trim() || !model.trim()}
                  className="w-full h-7 text-xs font-mono border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-md gap-1.5"
                >
                  <SendIcon className={cn("size-3", isTestingPrompt && "animate-pulse")} />
                  {isTestingPrompt ? "Executing Probe..." : "Send Test Probe"}
                </Button>
              </div>

              {testResponse && (
                <div
                  className={cn(
                    "p-3 rounded-md text-xs space-y-1.5 border transition-all font-mono",
                    testResponse.success
                      ? "bg-zinc-950 border-zinc-800 text-zinc-300"
                      : "bg-rose-950/20 border-rose-500/30 text-rose-300"
                  )}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5">
                      {testResponse.success ? (
                        <CheckCircle2Icon className="size-3 text-emerald-400" />
                      ) : (
                        <AlertCircleIcon className="size-3 text-rose-400" />
                      )}
                      <span>{testResponse.success ? `Response [${model}]` : "Probe Failed"}</span>
                    </span>
                    {testResponse.latencyMs !== undefined && (
                      <span className="text-zinc-500 tabular-nums">
                        {testResponse.latencyMs}ms
                      </span>
                    )}
                  </div>

                  <div className="p-2 rounded bg-black border border-zinc-800/80 text-[11px] leading-relaxed whitespace-pre-wrap select-text max-h-48 overflow-y-auto">
                    {testResponse.success ? testResponse.reply : testResponse.error}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
