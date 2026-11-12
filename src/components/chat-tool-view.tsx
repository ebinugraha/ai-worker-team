"use client";

import * as React from "react";
import {
  TerminalIcon,
  FileTextIcon,
  FileEditIcon,
  FolderIcon,
  MousePointerClickIcon,
  KeyboardIcon,
  EyeIcon,
  ClockIcon,
  AlertCircleIcon,
  CopyIcon,
  CheckIcon,
  Loader2Icon,
  Maximize2Icon,
  DownloadIcon,
  ZoomInIcon,
  ZoomOutIcon,
  RotateCcwIcon,
  XIcon,
  ArrowRightLeftIcon,
  GlobeIcon,
  BookmarkCheckIcon,
  CheckCircle2Icon,
} from "lucide-react";
import {
  Trace,
  TraceLine,
  TraceIcon,
  TraceTitle,
  TraceCollapsible,
  TraceCollapsibleTrigger,
  TraceCollapsibleContent,
} from "@/components/ui/trace";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { SeedAvatar } from "@/components/seed-avatar";
import { cn } from "@/lib/utils";

export interface ToolPartData {
  type: string;
  toolName?: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

export interface ChatToolViewProps {
  part: ToolPartData;
  isStreaming?: boolean;
}

export function isToolPart(part: { type: string }): part is ToolPartData {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

export function getToolName(part: ToolPartData): string {
  if (part.type === "dynamic-tool" && part.toolName) {
    return part.toolName;
  }
  if (part.type.startsWith("tool-")) {
    return part.type.replace(/^tool-/, "");
  }
  return part.toolName || "unknown";
}

function getCleanFileName(rawPath?: string): string {
  if (!rawPath) return "berkas";
  const trimmed = rawPath.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "." || trimmed === "/home/daytona") {
    return "folder kerja";
  }
  const parts = trimmed.split("/");
  return parts[parts.length - 1] || trimmed;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
      title="Salin teks"
    >
      {copied ? (
        <>
          <CheckIcon className="size-3 text-emerald-500" />
          <span>Tersalin</span>
        </>
      ) : (
        <>
          <CopyIcon className="size-3" />
          <span>Salin</span>
        </>
      )}
    </button>
  );
}

interface BashInput {
  command?: string;
  cwd?: string;
}

interface BashOutput {
  success?: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  output?: string;
  error?: string;
}

function BashToolView({
  input,
  output,
  state,
}: {
  input?: BashInput;
  output?: BashOutput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const hasError =
    state === "output-error" ||
    (output && output.success === false && (output.exitCode ?? 0) !== 0);

  const rawOutput =
    output?.output ||
    [output?.stdout, output?.stderr, output?.error]
      .filter(Boolean)
      .join("\n")
      .trim();

  const hasDetails = Boolean(input?.command || rawOutput);

  if (!hasDetails) {
    return (
      <Trace className="my-1 w-full">
        <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
          <TraceIcon>
            {isRunning ? (
              <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
            ) : hasError ? (
              <AlertCircleIcon className="size-3.5 text-destructive" />
            ) : (
              <TerminalIcon className="size-3.5 text-muted-foreground" />
            )}
          </TraceIcon>
          <TraceTitle className="text-xs sm:text-[13px] font-sans text-muted-foreground">
            {isRunning
              ? "Menjalankan perintah di komputer..."
              : hasError
              ? "Kendala saat menjalankan perintah"
              : "Menjalankan perintah di komputer"}
          </TraceTitle>
        </TraceLine>
      </Trace>
    );
  }

  return (
    <Trace className="my-1 w-full">
      <TraceCollapsible defaultOpen={false}>
        <TraceCollapsibleTrigger>
          <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
            <TraceIcon>
              {isRunning ? (
                <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
              ) : hasError ? (
                <AlertCircleIcon className="size-3.5 text-destructive" />
              ) : (
                <TerminalIcon className="size-3.5 text-muted-foreground" />
              )}
            </TraceIcon>
            <TraceTitle className="text-xs sm:text-[13px] font-sans text-muted-foreground">
              {isRunning
                ? "Menjalankan perintah di komputer..."
                : hasError
                ? "Perintah selesai dengan catatan"
                : "Menjalankan perintah di komputer"}
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="mt-1.5">
          <div className="rounded-xl bg-muted/30 border border-border/60 p-3 text-xs space-y-2 overflow-hidden">
            {input?.command && (
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/50">
                <span className="text-muted-foreground truncate">
                  Perintah: <span className="text-foreground">{input.command}</span>
                </span>
                <CopyButton text={input.command} />
              </div>
            )}
            {rawOutput ? (
              <pre className="text-muted-foreground whitespace-pre-wrap break-words select-text max-h-48 overflow-y-auto leading-relaxed font-sans">
                {rawOutput}
              </pre>
            ) : (
              <p className="text-muted-foreground">
                {isRunning ? "Sedang memproses..." : "Selesai dijalankan."}
              </p>
            )}
          </div>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}

interface FileSystemUnifiedInput {
  action?: "read" | "write" | "edit" | "list";
  path?: string;
  content?: string;
  oldContent?: string;
  newContent?: string;
}

interface FileSystemUnifiedOutput {
  success?: boolean;
  action?: string;
  path?: string;
  content?: string;
  entries?: Array<{ name: string; isDirectory?: boolean; size?: number }>;
  error?: string;
}

function FileSystemUnifiedToolView({
  input,
  output,
  state,
  forcedAction,
}: {
  input?: FileSystemUnifiedInput;
  output?: FileSystemUnifiedOutput;
  state: string;
  forcedAction?: "read" | "write" | "edit" | "list";
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const hasError =
    state === "output-error" || (output && output.success === false);
  const action = (
    forcedAction ||
    output?.action ||
    input?.action ||
    "read"
  ).toLowerCase();
  const rawPath = output?.path || input?.path;
  const cleanName = getCleanFileName(rawPath);

  const getLabel = () => {
    if (action === "write") {
      return isRunning
        ? `Menyimpan dokumen ${cleanName}...`
        : `Menyimpan dokumen ${cleanName}`;
    }
    if (action === "edit") {
      return isRunning
        ? `Memperbarui dokumen ${cleanName}...`
        : `Memperbarui dokumen ${cleanName}`;
    }
    if (action === "list") {
      return isRunning
        ? `Melihat isi ${cleanName}...`
        : `Melihat daftar berkas di ${cleanName}`;
    }
    return isRunning
      ? `Membaca dokumen ${cleanName}...`
      : `Membaca dokumen ${cleanName}`;
  };

  const previewText = output?.content || input?.newContent || input?.content;
  const entries = output?.entries;
  const hasExpandableContent =
    Boolean(previewText) ||
    Boolean(entries && entries.length > 0) ||
    Boolean(output?.error);

  const renderIcon = () => {
    if (isRunning) {
      return <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />;
    }
    if (hasError) {
      return <AlertCircleIcon className="size-3.5 text-destructive" />;
    }
    if (action === "write" || action === "edit") {
      return <FileEditIcon className="size-3.5 text-muted-foreground" />;
    }
    if (action === "list") {
      return <FolderIcon className="size-3.5 text-muted-foreground" />;
    }
    return <FileTextIcon className="size-3.5 text-muted-foreground" />;
  };

  if (!hasExpandableContent) {
    return (
      <Trace className="my-1 w-full">
        <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
          <TraceIcon>{renderIcon()}</TraceIcon>
          <TraceTitle className="text-xs sm:text-[13px] font-sans text-muted-foreground">
            {getLabel()}
          </TraceTitle>
        </TraceLine>
      </Trace>
    );
  }

  return (
    <Trace className="my-1 w-full">
      <TraceCollapsible defaultOpen={false}>
        <TraceCollapsibleTrigger>
          <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
            <TraceIcon>{renderIcon()}</TraceIcon>
            <TraceTitle className="text-xs sm:text-[13px] font-sans text-muted-foreground">
              {getLabel()}
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="mt-1.5">
          <div className="rounded-xl bg-muted/30 border border-border/60 p-3 text-xs overflow-hidden space-y-2">
            {previewText && (
              <>
                <div className="flex items-center justify-between pb-1.5 border-b border-border/50 text-muted-foreground">
                  <span className="truncate font-medium text-foreground">
                    {cleanName}
                  </span>
                  <CopyButton text={previewText} />
                </div>
                <pre className="text-muted-foreground whitespace-pre-wrap break-words select-text max-h-56 overflow-y-auto leading-relaxed font-sans">
                  {previewText}
                </pre>
              </>
            )}
            {entries && entries.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {entries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs text-muted-foreground py-0.5"
                  >
                    {entry.isDirectory ? (
                      <FolderIcon className="size-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <FileTextIcon className="size-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">{entry.name}</span>
                  </div>
                ))}
              </div>
            )}
            {output?.error && (
              <p className="text-destructive text-xs">{output.error}</p>
            )}
          </div>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}

interface SaveMemoryInput {
  title?: string;
  content?: string;
}

interface SaveMemoryOutput {
  success?: boolean;
  title?: string;
  error?: string;
}

function SaveMemoryToolView({
  input,
  output,
  state,
}: {
  input?: SaveMemoryInput;
  output?: SaveMemoryOutput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const hasError =
    state === "output-error" || (output && output.success === false);
  const title = output?.title || input?.title;

  return (
    <Trace className="my-1 w-full">
      <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
        <TraceIcon>
          {isRunning ? (
            <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
          ) : hasError ? (
            <AlertCircleIcon className="size-3.5 text-destructive" />
          ) : (
            <BookmarkCheckIcon className="size-3.5 text-muted-foreground" />
          )}
        </TraceIcon>
        <TraceTitle className="text-xs sm:text-[13px] font-sans text-muted-foreground">
          {isRunning
            ? "Menyimpan catatan ke ingatan..."
            : hasError
            ? "Gagal menyimpan catatan"
            : title
            ? `Mencatat ke ingatan: ${title}`
            : "Mencatat informasi penting ke ingatan"}
        </TraceTitle>
      </TraceLine>
    </Trace>
  );
}

interface FetchUrlInput {
  url?: string;
}

interface FetchUrlOutput {
  success?: boolean;
  url?: string;
  error?: string;
}

function FetchUrlToolView({
  input,
  output,
  state,
}: {
  input?: FetchUrlInput;
  output?: FetchUrlOutput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const hasError =
    state === "output-error" || (output && output.success === false);
  const rawUrl = output?.url || input?.url || "";

  let hostname = "situs web";
  if (rawUrl) {
    try {
      hostname = new URL(rawUrl).hostname.replace(/^www\./, "");
    } catch {
      hostname = rawUrl;
    }
  }

  return (
    <Trace className="my-1 w-full">
      <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
        <TraceIcon>
          {isRunning ? (
            <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
          ) : hasError ? (
            <AlertCircleIcon className="size-3.5 text-destructive" />
          ) : (
            <GlobeIcon className="size-3.5 text-muted-foreground" />
          )}
        </TraceIcon>
        <TraceTitle className="text-xs sm:text-[13px] font-sans text-muted-foreground">
          {isRunning
            ? `Membuka halaman ${hostname}...`
            : hasError
            ? `Tidak dapat membuka ${hostname}`
            : `Membaca informasi dari ${hostname}`}
        </TraceTitle>
      </TraceLine>
    </Trace>
  );
}

interface ComputerUseUnifiedInput {
  action?: string;
  text?: string;
  key?: string;
  direction?: string;
  seconds?: number;
}

interface ComputerUseUnifiedOutput {
  success?: boolean;
  action?: string;
  error?: string;
}

function ComputerUseUnifiedToolView({
  input,
  output,
  state,
  forcedAction,
}: {
  input?: ComputerUseUnifiedInput;
  output?: ComputerUseUnifiedOutput;
  state: string;
  forcedAction?: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const hasError =
    state === "output-error" || (output && output.success === false);
  const action = (
    forcedAction ||
    output?.action ||
    input?.action ||
    "click"
  ).toLowerCase();

  const getDescription = () => {
    if (action.includes("type")) {
      const sample = input?.text
        ? input.text.length > 28
          ? `${input.text.slice(0, 28)}...`
          : input.text
        : "";
      return isRunning
        ? sample
          ? `Mengetik "${sample}" di layar...`
          : "Mengetik pada layar..."
        : sample
        ? `Mengetik "${sample}" di layar`
        : "Mengetik pada layar";
    }
    if (action.includes("key")) {
      return isRunning
        ? "Menekan tombol papan ketik..."
        : "Menekan tombol papan ketik";
    }
    if (action.includes("scroll")) {
      return isRunning
        ? "Menggulir tampilan layar..."
        : "Menggulir tampilan layar";
    }
    if (action.includes("move") || action.includes("drag")) {
      return isRunning
        ? "Menggerakkan kursor di layar..."
        : "Menggerakkan kursor di layar";
    }
    if (action.includes("screenshot") || action.includes("view") || action.includes("display")) {
      return isRunning
        ? "Melihat tampilan layar komputer..."
        : "Melihat tampilan layar komputer";
    }
    if (action.includes("wait")) {
      return isRunning ? "Menunggu tampilan siap..." : "Menunggu tampilan siap";
    }
    return isRunning
      ? "Mengklik pada layar komputer..."
      : "Mengklik pada layar komputer";
  };

  const renderIcon = () => {
    if (isRunning) {
      return <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />;
    }
    if (hasError) {
      return <AlertCircleIcon className="size-3.5 text-destructive" />;
    }
    if (action.includes("type") || action.includes("key")) {
      return <KeyboardIcon className="size-3.5 text-muted-foreground" />;
    }
    if (action.includes("screenshot") || action.includes("view") || action.includes("display")) {
      return <EyeIcon className="size-3.5 text-muted-foreground" />;
    }
    return <MousePointerClickIcon className="size-3.5 text-muted-foreground" />;
  };

  return (
    <Trace className="my-1 w-full">
      <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
        <TraceIcon>{renderIcon()}</TraceIcon>
        <TraceTitle className="text-xs sm:text-[13px] font-sans text-muted-foreground">
          {getDescription()}
        </TraceTitle>
      </TraceLine>
    </Trace>
  );
}

interface ShowScreenInput {
  caption?: string;
}

interface ShowScreenOutput {
  success?: boolean;
  screenshot?: string;
  caption?: string;
  timestamp?: string;
  error?: string;
}

interface ScreenshotViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenshot: string;
  caption?: string;
}

function ScreenshotViewerModalContent({
  onClose,
  screenshot,
  caption = "Tampilan Layar",
}: {
  onClose: () => void;
  screenshot: string;
  caption?: string;
}) {
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(z - 0.25, 0.5);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleDoubleClick = () => {
    if (zoom > 1) {
      handleResetZoom();
    } else {
      setZoom(1.75);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(z + 0.15, 3));
    } else {
      setZoom((z) => {
        const next = Math.max(z - 0.15, 0.5);
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const imgSrc = screenshot.startsWith("data:")
    ? screenshot
    : `data:image/png;base64,${screenshot}`;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imgSrc;
    link.download = `${caption.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "layar"}-${Date.now()}.png`;
    link.click();
  };

  return (
    <DialogContent
      showCloseButton={false}
      className="!max-w-[92vw] !w-[1140px] !h-[86vh] !max-h-[86vh] p-0 gap-0 overflow-hidden bg-background border border-border rounded-2xl shadow-2xl flex flex-col select-none outline-none"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-card shrink-0">
        <DialogTitle className="text-sm font-medium text-foreground truncate">
          {caption}
        </DialogTitle>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-muted/50 border border-border/60 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
              title="Perkecil"
            >
              <ZoomOutIcon className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 h-7 text-xs font-medium text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer min-w-[48px] text-center"
              title="Ukuran normal"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
              title="Perbesar"
            >
              <ZoomInIcon className="size-3.5" />
            </button>

            {zoom !== 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
                title="Reset"
              >
                <RotateCcwIcon className="size-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 flex items-center justify-center transition-colors cursor-pointer"
            title="Unduh gambar"
          >
            <DownloadIcon className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 flex items-center justify-center transition-colors cursor-pointer"
            title="Tutup"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      </div>

      <div
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={cn(
          "flex-1 w-full h-full min-h-0 bg-black/90 flex items-center justify-center p-4 sm:p-6 relative select-none overflow-hidden",
          zoom > 1
            ? isDragging
              ? "cursor-grabbing"
              : "cursor-grab"
            : "cursor-zoom-in"
        )}
      >
        <div
          onDoubleClick={handleDoubleClick}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
          className="relative max-w-full max-h-full flex items-center justify-center pointer-events-auto"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={caption}
            className="max-w-full max-h-[calc(86vh-5rem)] object-contain rounded-xl shadow-2xl pointer-events-none"
            draggable={false}
          />
        </div>
      </div>
    </DialogContent>
  );
}

function ScreenshotViewerDialog({
  open,
  onOpenChange,
  screenshot,
  caption = "Tampilan Layar",
}: ScreenshotViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ScreenshotViewerModalContent
          onClose={() => onOpenChange(false)}
          screenshot={screenshot}
          caption={caption}
        />
      )}
    </Dialog>
  );
}

function ShowScreenToolView({
  input,
  output,
  state,
}: {
  input?: ShowScreenInput;
  output?: ShowScreenOutput;
  state: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const isRunning = state === "input-streaming" || state === "input-available";
  const caption = output?.caption || input?.caption || "Tampilan Layar Komputer";
  const screenshot = output?.screenshot;

  const handleDownload = () => {
    if (!screenshot) return;
    const link = document.createElement("a");
    link.href = screenshot.startsWith("data:")
      ? screenshot
      : `data:image/png;base64,${screenshot}`;
    link.download = `layar-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="my-2.5 w-fit max-w-full">
      {screenshot ? (
        <>
          <div
            onClick={() => setIsOpen(true)}
            className="group relative cursor-zoom-in block overflow-hidden rounded-2xl bg-muted/30 border border-border/60 hover:border-border transition-all shadow-xs"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                screenshot.startsWith("data:")
                  ? screenshot
                  : `data:image/png;base64,${screenshot}`
              }
              alt={caption}
              className="max-h-[340px] sm:max-h-[400px] w-auto max-w-full object-contain rounded-2xl block"
            />
            <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 p-1 rounded-xl bg-background/85 backdrop-blur-xs border border-border/70 shadow-sm">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Unduh gambar"
              >
                <DownloadIcon className="size-3.5" />
              </button>
              <div className="p-1.5 text-muted-foreground">
                <Maximize2Icon className="size-3.5" />
              </div>
            </div>
          </div>

          <ScreenshotViewerDialog
            open={isOpen}
            onOpenChange={setIsOpen}
            screenshot={screenshot}
            caption={caption}
          />
        </>
      ) : isRunning ? (
        <Trace className="my-1 w-full">
          <TraceLine status="running">
            <TraceIcon>
              <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
            </TraceIcon>
            <TraceTitle className="text-xs sm:text-[13px] font-sans text-muted-foreground">
              Mengambil tampilan layar...
            </TraceTitle>
          </TraceLine>
        </Trace>
      ) : output?.error ? (
        <p className="text-xs text-destructive">{output.error}</p>
      ) : null}
    </div>
  );
}

export interface HandoffInput {
  targetBotName?: string;
  reason?: string;
}

export interface HandoffOutput {
  success?: boolean;
  handedOff?: boolean;
  targetBot?: {
    id: string;
    name: string;
    avatar?: string;
    job: string;
  };
  reason?: string;
  message?: string;
  error?: string;
}

function HandoffToolView({
  input,
  output,
  state,
}: {
  input?: HandoffInput;
  output?: HandoffOutput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const hasError = state === "output-error" || output?.success === false;
  const targetName =
    output?.targetBot?.name || input?.targetBotName || "rekan tim";
  const targetAvatar = output?.targetBot?.avatar;
  const reason = output?.reason || input?.reason;

  return (
    <div className="my-2 w-full rounded-xl border border-border/60 bg-muted/25 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isRunning ? (
            <Loader2Icon className="size-3.5 animate-spin text-muted-foreground shrink-0" />
          ) : (
            <ArrowRightLeftIcon className="size-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs sm:text-[13px] font-medium text-foreground truncate">
            {isRunning
              ? `Mengalihkan tugas ke ${targetName}...`
              : hasError
              ? "Gagal mengalihkan tugas"
              : `Tugas dilanjutkan oleh ${targetName}`}
          </span>
        </div>

        {targetName && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background border border-border/60 shrink-0">
            {targetAvatar && (
              <SeedAvatar
                seed={targetAvatar}
                size={14}
                className="rounded-full shrink-0"
              />
            )}
            <span className="text-xs font-medium text-foreground">
              {targetName}
            </span>
          </div>
        )}
      </div>

      {reason && (
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
          {reason}
        </p>
      )}
    </div>
  );
}

export interface WaitInput {
  duration?: number;
  reason?: string;
}

export interface WaitOutput {
  success: boolean;
  duration?: number;
  reason?: string;
}

export function WaitToolView({
  state,
}: {
  input?: WaitInput;
  output?: WaitOutput;
  state?: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";

  return (
    <Trace className="my-1">
      <TraceLine status={isRunning ? "running" : undefined}>
        <TraceIcon>
          <ClockIcon
            className={cn(
              "size-3.5 text-muted-foreground",
              isRunning && "animate-spin"
            )}
          />
        </TraceIcon>
        <TraceTitle className="text-xs sm:text-[13px] font-sans text-muted-foreground">
          {isRunning ? "Menunggu sejenak..." : "Selesai menunggu"}
        </TraceTitle>
      </TraceLine>
    </Trace>
  );
}

function GenericToolView({
  state,
}: {
  toolName: string;
  input?: unknown;
  output?: unknown;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const hasError = state === "output-error";

  return (
    <Trace className="my-1 w-full">
      <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
        <TraceIcon>
          {isRunning ? (
            <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
          ) : hasError ? (
            <AlertCircleIcon className="size-3.5 text-destructive" />
          ) : (
            <CheckCircle2Icon className="size-3.5 text-muted-foreground" />
          )}
        </TraceIcon>
        <TraceTitle className="text-xs sm:text-[13px] font-sans text-muted-foreground">
          {isRunning ? "Memproses langkah..." : "Langkah selesai"}
        </TraceTitle>
      </TraceLine>
    </Trace>
  );
}

export function ChatToolView({ part }: ChatToolViewProps) {
  const toolName = getToolName(part);
  const input = part.input;
  const output = part.output;
  const state = part.state || "";

  switch (toolName) {
    case "bash_exec":
    case "bash":
      return (
        <BashToolView
          input={input as BashInput}
          output={output as BashOutput}
          state={state}
        />
      );
    case "file_system":
      return (
        <FileSystemUnifiedToolView
          input={input as FileSystemUnifiedInput}
          output={output as FileSystemUnifiedOutput}
          state={state}
        />
      );
    case "readFile":
      return (
        <FileSystemUnifiedToolView
          input={input as FileSystemUnifiedInput}
          output={output as FileSystemUnifiedOutput}
          state={state}
          forcedAction="read"
        />
      );
    case "writeFile":
      return (
        <FileSystemUnifiedToolView
          input={input as FileSystemUnifiedInput}
          output={output as FileSystemUnifiedOutput}
          state={state}
          forcedAction="write"
        />
      );
    case "editFile":
    case "patchFile":
      return (
        <FileSystemUnifiedToolView
          input={input as FileSystemUnifiedInput}
          output={output as FileSystemUnifiedOutput}
          state={state}
          forcedAction="edit"
        />
      );
    case "listFiles":
      return (
        <FileSystemUnifiedToolView
          input={input as FileSystemUnifiedInput}
          output={output as FileSystemUnifiedOutput}
          state={state}
          forcedAction="list"
        />
      );
    case "save_memory":
    case "saveMemory":
    case "remember":
      return (
        <SaveMemoryToolView
          input={input as SaveMemoryInput}
          output={output as SaveMemoryOutput}
          state={state}
        />
      );
    case "fetch_url":
    case "fetchUrl":
    case "webFetch":
      return (
        <FetchUrlToolView
          input={input as FetchUrlInput}
          output={output as FetchUrlOutput}
          state={state}
        />
      );
    case "computer_use":
      return (
        <ComputerUseUnifiedToolView
          input={input as ComputerUseUnifiedInput}
          output={output as ComputerUseUnifiedOutput}
          state={state}
        />
      );
    case "mouseClick":
      return (
        <ComputerUseUnifiedToolView
          input={input as ComputerUseUnifiedInput}
          output={output as ComputerUseUnifiedOutput}
          state={state}
          forcedAction="click"
        />
      );
    case "mouseScroll":
      return (
        <ComputerUseUnifiedToolView
          input={input as ComputerUseUnifiedInput}
          output={output as ComputerUseUnifiedOutput}
          state={state}
          forcedAction="scroll"
        />
      );
    case "mouseMove":
      return (
        <ComputerUseUnifiedToolView
          input={input as ComputerUseUnifiedInput}
          output={output as ComputerUseUnifiedOutput}
          state={state}
          forcedAction="move"
        />
      );
    case "keyboardType":
      return (
        <ComputerUseUnifiedToolView
          input={input as ComputerUseUnifiedInput}
          output={output as ComputerUseUnifiedOutput}
          state={state}
          forcedAction="type"
        />
      );
    case "keyboardPress":
      return (
        <ComputerUseUnifiedToolView
          input={input as ComputerUseUnifiedInput}
          output={output as ComputerUseUnifiedOutput}
          state={state}
          forcedAction="key"
        />
      );
    case "viewScreen":
    case "getDisplayInfo":
      return (
        <ComputerUseUnifiedToolView
          input={input as ComputerUseUnifiedInput}
          output={output as ComputerUseUnifiedOutput}
          state={state}
          forcedAction="view"
        />
      );
    case "finish_task":
      return null;
    case "handoff":
    case "handoffTool":
      return (
        <HandoffToolView
          input={input as HandoffInput}
          output={output as HandoffOutput}
          state={state}
        />
      );
    case "wait":
    case "waitTool":
      return (
        <WaitToolView
          input={input as WaitInput}
          output={output as WaitOutput}
          state={state}
        />
      );
    case "showScreen":
      return (
        <ShowScreenToolView
          input={input as ShowScreenInput}
          output={output as ShowScreenOutput}
          state={state}
        />
      );
    default:
      return (
        <GenericToolView
          toolName={toolName}
          input={input}
          output={output}
          state={state}
        />
      );
  }
}
