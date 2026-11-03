"use client";

import * as React from "react";
import {
  saveUserSettingsAction,
  checkAiModelsAction,
  testModelConnection,
  runSystemDiagnosticsAction,
  getSandboxMemoryPreviewAction,
  type UserSettingsData,
  type DiagnosticItem,
} from "@/action/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { EyeIcon, EyeOffIcon, Loader2Icon, CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PresetProvider {
  name: string;
  baseUrl: string;
  defaultModel: string;
}

const PRESET_PROVIDERS: PresetProvider[] = [
  {
    name: "OMO API Call",
    baseUrl: "https://omoapicall.web.id/v1",
    defaultModel: "glm-5.3-flashh",
  },
  {
    name: "9router (Lokal)",
    baseUrl: "http://100.74.237.58:20128/v1",
    defaultModel: "my-combo-9router",
  },
  {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-sonnet",
  },
];

type SettingsTab = "models" | "runtime" | "appearance" | "diagnostics";

interface SettingsViewProps {
  initialSettings: UserSettingsData;
  initialModels?: string[];
}

export function SettingsView({ initialSettings, initialModels = [] }: SettingsViewProps) {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("models");

  // Core Form State
  const [baseUrl, setBaseUrl] = React.useState(initialSettings.aiBaseUrl);
  const [apiKey, setApiKey] = React.useState(initialSettings.aiApiKey);
  const [model, setModel] = React.useState(initialSettings.aiModel);
  const [temperature, setTemperature] = React.useState(initialSettings.temperature || "0.2");
  const [maxTokens, setMaxTokens] = React.useState(initialSettings.maxTokens || 8192);
  const [maxAutoContinues, setMaxAutoContinues] = React.useState(initialSettings.maxAutoContinues || 10);
  const [autoMemory, setAutoMemory] = React.useState(initialSettings.autoMemory ?? true);
  const [syntaxTheme, setSyntaxTheme] = React.useState(initialSettings.syntaxTheme || "dracula-soft");
  const [terminalDensity, setTerminalDensity] = React.useState(initialSettings.terminalDensity || "editor");
  const [showApiKey, setShowApiKey] = React.useState(false);

  // Status and save states
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveFeedback, setSaveFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Model checking states
  const [isCheckingModels, setIsCheckingModels] = React.useState(false);
  const [fetchedModels, setFetchedModels] = React.useState<string[]>(initialModels);
  const [checkStatus, setCheckStatus] = React.useState<string | null>(
    initialModels.length > 0 ? `${initialModels.length} model terdeteksi` : null
  );

  // Connection testing state
  const [isTestingConnection, setIsTestingConnection] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    success: boolean;
    latencyMs?: number;
    message: string;
  } | null>(null);

  // Diagnostics state
  const [isDiagnosing, setIsDiagnosing] = React.useState(false);
  const [diagnostics, setDiagnostics] = React.useState<DiagnosticItem[]>([]);

  // Sandbox Memory preview state
  const [isLoadingMemory, setIsLoadingMemory] = React.useState(false);
  const [memoryContent, setMemoryContent] = React.useState<string | null>(null);
  const [hasCopiedMemory, setHasCopiedMemory] = React.useState(false);

  // Match active preset
  const selectedPreset = React.useMemo(() => {
    return PRESET_PROVIDERS.find((p) => p.baseUrl === baseUrl)?.name || "custom";
  }, [baseUrl]);

  const handleSelectPreset = (presetName: string) => {
    if (presetName === "custom") return;
    const found = PRESET_PROVIDERS.find((p) => p.name === presetName);
    if (found) {
      setBaseUrl(found.baseUrl);
      setModel(found.defaultModel);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      const res = await saveUserSettingsAction({
        aiBaseUrl: baseUrl,
        aiApiKey: apiKey,
        aiModel: model,
        temperature,
        maxTokens,
        maxAutoContinues,
        autoMemory,
        syntaxTheme,
        terminalDensity,
      });

      if (res.success) {
        setSaveFeedback({
          type: "success",
          message: "Pengaturan tersimpan",
        });
        setTimeout(() => setSaveFeedback(null), 3500);
      } else {
        setSaveFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan pengaturan",
        });
      }
    } catch {
      setSaveFeedback({
        type: "error",
        message: "Terjadi kesalahan saat menyimpan",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckModels = async () => {
    setIsCheckingModels(true);
    setCheckStatus(null);
    try {
      const res = await checkAiModelsAction({
        aiBaseUrl: baseUrl,
        aiApiKey: apiKey,
      });
      if (res.success && res.data) {
        setFetchedModels(res.data.models);
        setCheckStatus(`${res.data.models.length} model terdeteksi`);
      } else {
        setCheckStatus(res.error || "Gagal memindai model");
      }
    } catch {
      setCheckStatus("Gagal menghubungi endpoint");
    } finally {
      setIsCheckingModels(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testModelConnection({
        aiBaseUrl: baseUrl,
        aiApiKey: apiKey,
        aiModel: model,
      });
      if (res.success && res.data) {
        setTestResult({
          success: true,
          latencyMs: res.data.latencyMs,
          message: `Terhubung (${res.data.latencyMs} ms) · Tool calling ${res.data.supportsToolCalling ? "didukung" : "tidak aktif"}`,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || "Gagal menghubungi model",
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: "Terjadi kesalahan saat menguji sambungan",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setIsDiagnosing(true);
    try {
      const res = await runSystemDiagnosticsAction({
        aiBaseUrl: baseUrl,
        aiApiKey: apiKey,
      });
      if (res.success && res.data) {
        setDiagnostics(res.data.items);
      }
    } catch {
      // Diagnostic failure handled
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleLoadMemory = async () => {
    setIsLoadingMemory(true);
    try {
      const res = await getSandboxMemoryPreviewAction();
      if (res.success && res.data) {
        setMemoryContent(res.data.content);
      } else {
        setMemoryContent(res.error || "Belum ada berkas MEMORY.md yang tersimpan di sandbox.");
      }
    } catch {
      setMemoryContent("Gagal mengambil data memori.");
    } finally {
      setIsLoadingMemory(false);
    }
  };

  const handleCopyMemory = () => {
    if (!memoryContent) return;
    navigator.clipboard.writeText(memoryContent);
    setHasCopiedMemory(true);
    setTimeout(() => setHasCopiedMemory(false), 2000);
  };

  const navItems: { id: SettingsTab; label: string }[] = [
    { id: "models", label: "Model & API" },
    { id: "runtime", label: "Perilaku Agen" },
    { id: "appearance", label: "Memori & Tampilan" },
    { id: "diagnostics", label: "Status Sistem" },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background">
      {/* Gemini-Style Quiet Top Header */}
      <header className="h-13 shrink-0 flex items-center justify-between px-4 sm:px-6 md:px-8 border-b border-border/40 bg-background">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="h-4 w-px bg-border/60" />
          <h1 className="text-sm font-normal text-foreground">Pengaturan</h1>
        </div>

        <div className="flex items-center gap-3">
          {saveFeedback && (
            <span
              className={cn(
                "text-xs transition-opacity duration-200",
                saveFeedback.type === "success" ? "text-muted-foreground" : "text-destructive"
              )}
            >
              {saveFeedback.message}
            </span>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 px-4 text-xs font-normal rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                Menyimpan
              </>
            ) : (
              "Simpan"
            )}
          </Button>
        </div>
      </header>

      {/* Main Container: Left-Aligned Menu & Content Side-by-Side (Gemini Standard) */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full flex flex-col md:flex-row min-h-full">
          {/* Left Category Menu: Anchored on the left */}
          <aside className="w-full md:w-56 lg:w-60 shrink-0 p-4 sm:p-6 md:py-8 md:pl-8 md:pr-4">
            {/* Mobile Horizontal Pill Scroll */}
            <div className="flex md:hidden gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      if (item.id === "diagnostics" && diagnostics.length === 0) {
                        handleRunDiagnostics();
                      }
                    }}
                    className={cn(
                      "px-3.5 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-secondary text-secondary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Desktop Vertical Pill List */}
            <nav aria-label="Menu Pengaturan" className="hidden md:flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      if (item.id === "diagnostics" && diagnostics.length === 0) {
                        handleRunDiagnostics();
                      }
                    }}
                    className={cn(
                      "w-full text-left px-3.5 py-2 rounded-full text-xs sm:text-sm transition-colors",
                      isActive
                        ? "bg-secondary text-secondary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30 font-normal"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right Content Area: Aligned beside menu, sharing top guideline */}
          <main className="flex-1 min-w-0 p-4 sm:p-6 md:py-8 md:px-8 lg:px-12 md:border-l md:border-border/30 max-w-2xl">
            {/* TAB 1: MODEL & API */}
            {activeTab === "models" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-normal text-foreground">Model & Kredensial AI</h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Atur penyedia layanan, alamat endpoint, dan model AI yang digunakan tim asisten.
                  </p>
                </div>

                <div className="divide-y divide-border/30">
                  {/* Preset Provider */}
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 max-w-sm">
                      <label htmlFor="preset-select" className="text-sm font-normal text-foreground">
                        Penyedia Cepat
                      </label>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Pilih konfigurasi siap pakai dari penyedia yang sering digunakan.
                      </p>
                    </div>
                    <NativeSelect
                      id="preset-select"
                      value={selectedPreset}
                      onChange={(e) => handleSelectPreset(e.target.value)}
                      className="w-full sm:w-60"
                    >
                      {PRESET_PROVIDERS.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                      <option value="custom">Kustom (Manual)</option>
                    </NativeSelect>
                  </div>

                  {/* Base URL */}
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 max-w-sm">
                      <label htmlFor="base-url-input" className="text-sm font-normal text-foreground">
                        Base URL
                      </label>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Alamat URL endpoint API kompatibel OpenAI (diakhiri /v1).
                      </p>
                    </div>
                    <Input
                      id="base-url-input"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className="w-full sm:w-64 h-8.5 font-mono text-xs rounded-lg border-border/50 bg-muted/20"
                    />
                  </div>

                  {/* API Key */}
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 max-w-sm">
                      <label htmlFor="api-key-input" className="text-sm font-normal text-foreground">
                        Kunci API
                      </label>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Kunci autentikasi endpoint. Disimpan terenkripsi di database.
                      </p>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Input
                        id="api-key-input"
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Masukkan kunci API..."
                        className="w-full h-8.5 pr-8 font-mono text-xs rounded-lg border-border/50 bg-muted/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        title={showApiKey ? "Sembunyikan" : "Tampilkan"}
                      >
                        {showApiKey ? (
                          <EyeOffIcon className="size-3.5" />
                        ) : (
                          <EyeIcon className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Active Model */}
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 max-w-sm">
                      <label htmlFor="active-model-input" className="text-sm font-normal text-foreground">
                        Model Aktif
                      </label>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Identifier model bahasa yang dipanggil saat percakapan berlangsung.
                      </p>
                    </div>
                    <div className="w-full sm:w-64 space-y-1.5">
                      <Input
                        id="active-model-input"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="glm-5.3-flashh"
                        className="w-full h-8.5 font-mono text-xs rounded-lg border-border/50 bg-muted/20"
                      />
                      {fetchedModels.length > 0 && (
                        <NativeSelect
                          value={fetchedModels.includes(model) ? model : ""}
                          onChange={(e) => {
                            if (e.target.value) setModel(e.target.value);
                          }}
                          className="w-full text-xs"
                        >
                          <option value="">Pilih dari {fetchedModels.length} model terdeteksi...</option>
                          {fetchedModels.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    </div>
                  </div>

                  {/* Connection Verification */}
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 max-w-sm">
                      <span className="text-sm font-normal text-foreground">
                        Pemeriksaan Koneksi
                      </span>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Uji responsivitas endpoint dan ketersediaan daftar model bahasa.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCheckModels}
                        disabled={isCheckingModels || !baseUrl}
                        className="h-8 text-xs rounded-full font-normal border-border/50 bg-transparent hover:bg-muted/30"
                      >
                        {isCheckingModels ? (
                          <Loader2Icon className="size-3 mr-1 animate-spin" />
                        ) : null}
                        Pindai Model
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestConnection}
                        disabled={isTestingConnection || !baseUrl || !model}
                        className="h-8 text-xs rounded-full font-normal border-border/50 bg-transparent hover:bg-muted/30"
                      >
                        {isTestingConnection ? (
                          <Loader2Icon className="size-3 mr-1 animate-spin" />
                        ) : null}
                        Uji Sambungan
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Status Info Row */}
                {(checkStatus || testResult) && (
                  <div className="text-xs text-muted-foreground pt-2 flex flex-col gap-1 border-t border-border/30">
                    {checkStatus && <p>Daftar Model: {checkStatus}</p>}
                    {testResult && (
                      <p className={testResult.success ? "text-foreground" : "text-destructive"}>
                        Hasil Uji: {testResult.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PERILAKU AGEN */}
            {activeTab === "runtime" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-normal text-foreground">Perilaku & Runtime Agen</h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Kendali tingkat kreativitas model, batas token output, dan anggaran putaran berpikir otomatis.
                  </p>
                </div>

                <div className="divide-y divide-border/30">
                  {/* Temperature */}
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 max-w-sm">
                      <label htmlFor="temp-select" className="text-sm font-normal text-foreground">
                        Temperatur
                      </label>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Tingkat variasi output. Nilai rendah lebih konsisten dan presisi untuk kode.
                      </p>
                    </div>
                    <NativeSelect
                      id="temp-select"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="w-full sm:w-56"
                    >
                      <option value="0.0">0.0 — Presisi Ketat (Koding)</option>
                      <option value="0.2">0.2 — Seimbang (Standar Agen)</option>
                      <option value="0.7">0.7 — Kreatif (Penulisan Bebas)</option>
                      <option value="1.0">1.0 — Eksperimental</option>
                    </NativeSelect>
                  </div>

                  {/* Max Tokens */}
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 max-w-sm">
                      <label htmlFor="max-tokens-select" className="text-sm font-normal text-foreground">
                        Batas Output Token
                      </label>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Batas maksimum panjang jawaban yang diproduksi agen dalam satu giliran.
                      </p>
                    </div>
                    <NativeSelect
                      id="max-tokens-select"
                      value={String(maxTokens)}
                      onChange={(e) => setMaxTokens(Number(e.target.value))}
                      className="w-full sm:w-56"
                    >
                      <option value="4096">4,096 Token</option>
                      <option value="8192">8,192 Token (Standar)</option>
                      <option value="16384">16,384 Token</option>
                      <option value="32768">32,768 Token</option>
                    </NativeSelect>
                  </div>

                  {/* Max Auto Continues */}
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 max-w-sm">
                      <label htmlFor="max-turns-select" className="text-sm font-normal text-foreground">
                        Batas Putaran Otomatis
                      </label>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Maksimum putaran agen berpikir dan memanggil alat secara mandiri sebelum jeda.
                      </p>
                    </div>
                    <NativeSelect
                      id="max-turns-select"
                      value={String(maxAutoContinues)}
                      onChange={(e) => setMaxAutoContinues(Number(e.target.value))}
                      className="w-full sm:w-56"
                    >
                      <option value="5">5 Putaran (Hemat)</option>
                      <option value="10">10 Putaran (Standar)</option>
                      <option value="15">15 Putaran (Tugas Kompleks)</option>
                      <option value="20">20 Putaran (Maksimum)</option>
                    </NativeSelect>
                  </div>

                  {/* Auto Memory */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <span className="text-sm font-normal text-foreground">
                        Perekaman Memori Mandiri
                      </span>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Izinkan agen mencatat aturan, preferensi pengguna, dan temuan penting ke MEMORY.md.
                      </p>
                    </div>
                    <Switch
                      checked={autoMemory}
                      onCheckedChange={(checked) => setAutoMemory(checked)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MEMORI & TAMPILAN */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-normal text-foreground">Tampilan & Memori</h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Atur tema penyorotan sintaks kode dan tinjau catatan memori jangka panjang agen.
                  </p>
                </div>

                <div className="divide-y divide-border/30">
                  {/* Syntax Theme */}
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 max-w-sm">
                      <label htmlFor="theme-select" className="text-sm font-normal text-foreground">
                        Tema Pewarnaan Kode
                      </label>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Skema tema penyorot sintaks Shiki pada blok kode markdown dan terminal.
                      </p>
                    </div>
                    <NativeSelect
                      id="theme-select"
                      value={syntaxTheme}
                      onChange={(e) => setSyntaxTheme(e.target.value)}
                      className="w-full sm:w-56"
                    >
                      <option value="dracula-soft">Dracula Soft</option>
                      <option value="github-dark">GitHub Dark</option>
                      <option value="one-dark-pro">One Dark Pro</option>
                      <option value="vitesse-dark">Vitesse Dark</option>
                    </NativeSelect>
                  </div>

                  {/* Terminal Density */}
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 max-w-sm">
                      <label htmlFor="density-select" className="text-sm font-normal text-foreground">
                        Kerapatan Terminal
                      </label>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Format visual tampilan riwayat eksekusi shell terminal agen.
                      </p>
                    </div>
                    <NativeSelect
                      id="density-select"
                      value={terminalDensity}
                      onChange={(e) => setTerminalDensity(e.target.value)}
                      className="w-full sm:w-56"
                    >
                      <option value="editor">Editor Lengkap (Nomor Baris)</option>
                      <option value="compact">Ringkas (Minimalis)</option>
                    </NativeSelect>
                  </div>

                  {/* Memory Inspector Section */}
                  <div className="py-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5 max-w-sm">
                        <span className="text-sm font-normal text-foreground">
                          Catatan Memori Jangka Panjang (MEMORY.md)
                        </span>
                        <p className="text-xs text-muted-foreground leading-normal">
                          Isi berkas memori sandbox yang dibaca agen pada setiap awal percakapan.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {memoryContent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyMemory}
                            className="h-8 text-xs rounded-full font-normal text-muted-foreground hover:text-foreground"
                          >
                            {hasCopiedMemory ? (
                              <>
                                <CheckIcon className="size-3 mr-1 text-foreground" />
                                Tersalin
                              </>
                            ) : (
                              <>
                                <CopyIcon className="size-3 mr-1" />
                                Salin
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLoadMemory}
                          disabled={isLoadingMemory}
                          className="h-8 text-xs rounded-full font-normal border-border/50 bg-transparent hover:bg-muted/30"
                        >
                          {isLoadingMemory ? (
                            <Loader2Icon className="size-3 mr-1 animate-spin" />
                          ) : null}
                          Muat Catatan
                        </Button>
                      </div>
                    </div>

                    {memoryContent && (
                      <pre className="p-3.5 bg-muted/20 border border-border/40 rounded-xl text-xs font-mono text-muted-foreground leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap select-text">
                        {memoryContent}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: STATUS SISTEM */}
            {activeTab === "diagnostics" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-normal text-foreground">Status Infrastruktur Sistem</h2>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Pemeriksaan kesehatan konektivitas database, AI gateway, sandbox, dan second brain.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRunDiagnostics}
                    disabled={isDiagnosing}
                    className="h-8 text-xs rounded-full font-normal border-border/50 bg-transparent hover:bg-muted/30 shrink-0"
                  >
                    {isDiagnosing ? (
                      <Loader2Icon className="size-3 mr-1.5 animate-spin" />
                    ) : null}
                    Periksa Ulang
                  </Button>
                </div>

                <div className="divide-y divide-border/30">
                  {diagnostics.length === 0 && !isDiagnosing ? (
                    <p className="py-8 text-xs text-muted-foreground">
                      Klik tombol &quot;Periksa Ulang&quot; untuk menjalankan diagnostik kesehatan layanan.
                    </p>
                  ) : (
                    diagnostics.map((diag) => {
                      const isHealthy = diag.status === "operational";
                      return (
                        <div
                          key={diag.name}
                          className="py-3.5 flex items-center justify-between gap-4"
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-normal text-foreground">{diag.name}</p>
                            <p className="text-xs text-muted-foreground leading-normal">{diag.detail}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                isHealthy ? "bg-muted-foreground" : "bg-destructive"
                              )}
                            />
                            <span className="text-xs text-muted-foreground font-normal">
                              {isHealthy ? "Normal" : "Kendala"}
                              {diag.latencyMs !== undefined ? ` · ${diag.latencyMs} ms` : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
