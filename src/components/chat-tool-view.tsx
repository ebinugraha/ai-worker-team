"use client";

import * as React from "react";
import {
  TerminalIcon,
  FileTextIcon,
  FileEditIcon,
  FolderTreeIcon,
  FolderIcon,
  FileIcon,
  MousePointerClickIcon,
  ArrowUpDownIcon,
  MousePointerIcon,
  KeyboardIcon,
  CommandIcon,
  EyeIcon,
  MonitorIcon,
  LayersIcon,
  WrenchIcon,
  CheckIcon,
  CopyIcon,
  Maximize2Icon,
  AlertCircleIcon,
  Loader2Icon,
  ZoomInIcon,
  ZoomOutIcon,
  RotateCcwIcon,
  DownloadIcon,
  XIcon,
  ArrowRightLeftIcon,
  ClockIcon,
  BrainIcon,
  GlobeIcon,
} from "lucide-react";
import {
  Trace,
  TraceLine,
  TraceIcon,
  TraceTitle,
  TraceDescription,
  TraceCollapsible,
  TraceCollapsibleTrigger,
  TraceCollapsibleContent,
} from "@/components/ui/trace";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SeedAvatar } from "@/components/seed-avatar";
import { HighlightedCode } from "@/components/ui/highlighted-code";
import { cn } from "@/lib/utils";

export interface ToolPartPayload {
  type: string;
  toolName?: string;
  state?:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error"
    | string;
  input?: unknown;
  output?: unknown;
}

export interface ChatToolViewProps {
  part: ToolPartPayload;
  isStreaming?: boolean;
}

export function isToolPart(part: unknown): part is ToolPartPayload {
  if (!part || typeof part !== "object") return false;
  const p = part as { type?: unknown };
  if (typeof p.type !== "string") return false;
  return p.type.startsWith("tool-") || p.type === "dynamic-tool";
}

export function getToolName(part: ToolPartPayload): string {
  if (!part) return "";
  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    return part.type.slice(5);
  }
  return part.toolName || "";
}

function CopyButton({
  text,
  showLabel = false,
}: {
  text: string;
  showLabel?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "transition-colors cursor-pointer select-none flex items-center gap-1.5",
        showLabel
          ? "px-2.5 py-1 rounded-lg text-xs font-sans text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70"
          : "p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
      )}
      title={copied ? "Tersalin" : "Salin ke clipboard"}
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-zinc-300" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
      {showLabel && <span>{copied ? "Tersalin" : "Salin"}</span>}
    </button>
  );
}

interface BashInput {
  command?: string;
  cwd?: string;
}

interface BashOutput {
  success?: boolean;
  stdout?: string;
  exitCode?: number;
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
  const command = input?.command || "bash";
  const stdout = output?.stdout || "";
  const fullTextToCopy = stdout ? `${command}\n\n${stdout}` : command;

  return (
    <div className="my-3 w-full rounded-2xl overflow-hidden bg-[#121316] border border-zinc-800/40 shadow-xs select-text">
      {/* Editor Header Bar (Gemini / ChatGPT Style) */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1b1e] border-b border-zinc-800/40 select-none">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 min-w-0">
          <TerminalIcon className="size-3.5 text-zinc-400 shrink-0" />
          <span className="font-semibold">bash</span>
          {input?.cwd && (
            <span className="text-zinc-500 font-sans text-[11px] truncate max-w-xs">
              ({input.cwd})
            </span>
          )}
          {isRunning && (
            <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-sans ml-1.5">
              <Loader2Icon className="size-3 animate-spin text-zinc-400" />
              berjalan...
            </span>
          )}
          {output?.exitCode !== undefined && output.exitCode !== 0 && (
            <span className="text-[11px] text-rose-400 font-mono ml-1.5">
              exit {output.exitCode}
            </span>
          )}
        </div>
        <CopyButton text={fullTextToCopy} showLabel />
      </div>

      {/* Editor Content Surface (Dracula Soft VSCode Palette) */}
      <div className="p-4 font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto text-[#f8f8f2] bg-[#121316]">
        <div className="flex items-start gap-2">
          <span className="text-[#bd93f9] select-none font-semibold">$</span>
          <div className="break-all flex-1 min-w-0">
            <HighlightedCode code={command} language="bash" />
          </div>
        </div>

        {stdout && (
          <pre className="mt-3 pt-3 border-t border-zinc-800/40 text-[#f8f8f2]/90 font-mono text-xs sm:text-[13px] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto select-text scrollbar-thin">
            <HighlightedCode code={stdout} language="ansi" />
          </pre>
        )}

        {output?.error && (
          <div className="mt-3 pt-3 border-t border-rose-950/40 text-[#ff5555] font-mono text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap select-text">
            {output.error}
          </div>
        )}
      </div>
    </div>
  );
}

interface ReadFileInput {
  path?: string;
}

interface ReadFileOutput {
  success?: boolean;
  path?: string;
  content?: string;
  size?: number;
  error?: string;
}

function ReadFileToolView({
  input,
  output,
  state,
}: {
  input?: ReadFileInput;
  output?: ReadFileOutput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const hasError = state === "output-error" || (output && output.success === false);
  const path = input?.path || "file";
  const content = output?.content || "";

  return (
    <Trace className="my-1.5 w-full">
      <TraceCollapsible defaultOpen={false}>
        <TraceCollapsibleTrigger>
          <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
            <TraceIcon>
              {isRunning ? (
                <Loader2Icon className="size-3.5 animate-spin text-amber-400" />
              ) : (
                <FileTextIcon className="size-3.5 text-neutral-300" />
              )}
            </TraceIcon>
            <TraceTitle className="text-xs text-neutral-200">
              Read file: <span className="font-mono text-neutral-300">{path}</span>
            </TraceTitle>
            {output?.size !== undefined && (
              <TraceDescription className="text-[10px]">
                {output.size} bytes
              </TraceDescription>
            )}
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="mt-1.5">
          <div className="rounded-xl bg-[#08080a] border border-zinc-800/90 p-2.5 font-mono text-xs overflow-hidden shadow-inner">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-800/60 text-[11px] text-neutral-400">
              <span className="truncate">{path}</span>
              {content && <CopyButton text={content} />}
            </div>
            {content ? (
              <pre className="text-neutral-300 whitespace-pre-wrap select-text max-h-60 overflow-y-auto leading-relaxed">
                {content}
              </pre>
            ) : output?.error ? (
              <div className="text-destructive text-xs">{output.error}</div>
            ) : (
              <div className="text-neutral-500 italic text-[11px]">
                {isRunning ? "Reading file..." : "Empty file."}
              </div>
            )}
          </div>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}

interface WriteFileInput {
  path?: string;
  content?: string;
}

interface WriteFileOutput {
  success?: boolean;
  path?: string;
  bytesWritten?: number;
  error?: string;
}

function WriteFileToolView({
  input,
  output,
  state,
}: {
  input?: WriteFileInput;
  output?: WriteFileOutput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const hasError = state === "output-error" || (output && output.success === false);
  const path = input?.path || "file";
  const content = input?.content || "";

  return (
    <Trace className="my-1.5 w-full">
      <TraceCollapsible defaultOpen={false}>
        <TraceCollapsibleTrigger>
          <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
            <TraceIcon>
              {isRunning ? (
                <Loader2Icon className="size-3.5 animate-spin text-amber-400" />
              ) : (
                <FileEditIcon className="size-3.5 text-neutral-300" />
              )}
            </TraceIcon>
            <TraceTitle className="text-xs text-neutral-200">
              Write file: <span className="font-mono text-neutral-300">{path}</span>
            </TraceTitle>
            {output?.bytesWritten !== undefined && (
              <TraceDescription className="text-[10px]">
                {output.bytesWritten} bytes
              </TraceDescription>
            )}
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="mt-1.5">
          <div className="rounded-xl bg-[#08080a] border border-zinc-800/90 p-2.5 font-mono text-xs overflow-hidden shadow-inner">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-800/60 text-[11px] text-neutral-400">
              <span className="truncate">{path}</span>
              {content && <CopyButton text={content} />}
            </div>
            {content && (
              <pre className="text-neutral-300 whitespace-pre-wrap select-text max-h-60 overflow-y-auto leading-relaxed">
                {content}
              </pre>
            )}
            {output?.error && (
              <div className="text-destructive text-xs mt-1.5">{output.error}</div>
            )}
          </div>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}

interface ListFilesInput {
  path?: string;
  depth?: number;
}

interface ListFilesItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

interface ListFilesOutput {
  success?: boolean;
  path?: string;
  files?: ListFilesItem[];
  error?: string;
}

function ListFilesToolView({
  input,
  output,
  state,
}: {
  input?: ListFilesInput;
  output?: ListFilesOutput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const path = input?.path || ".";
  const files: ListFilesItem[] = output?.files || [];

  return (
    <Trace className="my-1.5 w-full">
      <TraceCollapsible defaultOpen={false}>
        <TraceCollapsibleTrigger>
          <TraceLine status={isRunning ? "running" : undefined}>
            <TraceIcon>
              {isRunning ? (
                <Loader2Icon className="size-3.5 animate-spin text-amber-400" />
              ) : (
                <FolderTreeIcon className="size-3.5 text-neutral-300" />
              )}
            </TraceIcon>
            <TraceTitle className="text-xs text-neutral-200">
              List files in: <span className="font-mono text-neutral-300">{path}</span>
            </TraceTitle>
            {files.length > 0 && (
              <TraceDescription className="text-[10px]">
                {files.length} items
              </TraceDescription>
            )}
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="mt-1.5">
          <div className="rounded-xl bg-[#08080a] border border-zinc-800/90 p-2 font-mono text-xs max-h-56 overflow-y-auto shadow-inner">
            {files.length === 0 ? (
              <div className="p-2 text-neutral-500 italic text-[11px]">
                {isRunning ? "Scanning directory..." : "Directory is empty"}
              </div>
            ) : (
              <div className="divide-y divide-neutral-900">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1 px-1.5 hover:bg-neutral-900/60 rounded transition-colors text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {f.isDirectory ? (
                        <FolderIcon className="size-3 text-amber-400 shrink-0" />
                      ) : (
                        <FileIcon className="size-3 text-neutral-400 shrink-0" />
                      )}
                      <span
                        className={cn(
                          "truncate",
                          f.isDirectory
                            ? "text-neutral-200 font-medium"
                            : "text-neutral-300"
                        )}
                      >
                        {f.name}
                      </span>
                    </div>
                    {!f.isDirectory && (
                      <span className="text-[10px] text-neutral-500 shrink-0 tabular-nums ml-2">
                        {f.size} B
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}

interface MouseClickInput {
  x?: number;
  y?: number;
  button?: string;
  double?: boolean;
}

function MouseClickToolView({
  input,
  state,
}: {
  input?: MouseClickInput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const x = input?.x ?? 0;
  const y = input?.y ?? 0;
  const button = input?.button || "left";
  const double = Boolean(input?.double);

  return (
    <Trace className="my-1 w-full">
      <TraceLine status={isRunning ? "running" : undefined}>
        <TraceIcon>
          <MousePointerClickIcon className="size-3.5 text-neutral-300" />
        </TraceIcon>
        <TraceTitle className="text-xs text-neutral-200">
          {double ? "Double click" : "Click"} ({button}) at ({x}, {y})
        </TraceTitle>
      </TraceLine>
    </Trace>
  );
}

interface MouseScrollInput {
  x?: number;
  y?: number;
  direction?: string;
  amount?: number;
}

function MouseScrollToolView({
  input,
  state,
}: {
  input?: MouseScrollInput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const x = input?.x ?? 0;
  const y = input?.y ?? 0;
  const direction = input?.direction || "down";
  const amount = input?.amount ?? 2;

  return (
    <Trace className="my-1 w-full">
      <TraceLine status={isRunning ? "running" : undefined}>
        <TraceIcon>
          <ArrowUpDownIcon className="size-3.5 text-neutral-300" />
        </TraceIcon>
        <TraceTitle className="text-xs text-neutral-200">
          Scroll {direction} ({amount}) at ({x}, {y})
        </TraceTitle>
      </TraceLine>
    </Trace>
  );
}

interface MouseMoveInput {
  x?: number;
  y?: number;
}

function MouseMoveToolView({
  input,
  state,
}: {
  input?: MouseMoveInput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const x = input?.x ?? 0;
  const y = input?.y ?? 0;

  return (
    <Trace className="my-1 w-full">
      <TraceLine status={isRunning ? "running" : undefined}>
        <TraceIcon>
          <MousePointerIcon className="size-3.5 text-neutral-300" />
        </TraceIcon>
        <TraceTitle className="text-xs text-neutral-200">
          Move cursor to ({x}, {y})
        </TraceTitle>
      </TraceLine>
    </Trace>
  );
}

interface KeyboardTypeInput {
  text?: string;
  delay?: number;
}

function KeyboardTypeToolView({
  input,
  state,
}: {
  input?: KeyboardTypeInput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const text = input?.text || "";

  return (
    <Trace className="my-1 w-full">
      <TraceLine status={isRunning ? "running" : undefined}>
        <TraceIcon>
          <KeyboardIcon className="size-3.5 text-neutral-300" />
        </TraceIcon>
        <TraceTitle className="text-xs text-neutral-200 font-mono">
          Type: &quot;{text.length > 40 ? `${text.slice(0, 37)}...` : text}&quot;
        </TraceTitle>
      </TraceLine>
    </Trace>
  );
}

interface KeyboardPressInput {
  key?: string;
  modifiers?: string[];
}

function KeyboardPressToolView({
  input,
  state,
}: {
  input?: KeyboardPressInput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const key = input?.key || "";
  const modifiers: string[] = input?.modifiers || [];
  const combo = modifiers.length > 0 ? `${modifiers.join(" + ")} + ${key}` : key;

  return (
    <Trace className="my-1 w-full">
      <TraceLine status={isRunning ? "running" : undefined}>
        <TraceIcon>
          <CommandIcon className="size-3.5 text-neutral-300" />
        </TraceIcon>
        <TraceTitle className="text-xs text-neutral-200 font-mono">
          Press key: <span className="font-semibold text-neutral-100">{combo}</span>
        </TraceTitle>
      </TraceLine>
    </Trace>
  );
}

/**
 * ViewScreenToolView:
 * Renders the internal perception trace only.
 * In accordance with instructions:
 * "view screen (untuk agent dapat melihat apa yang ada dichat, jangan pernah di render di chat)"
 * -> NEVER renders the screenshot image in chat!
 */
function ViewScreenToolView({ state }: { state: string }) {
  const isRunning = state === "input-streaming" || state === "input-available";

  return (
    <Trace className="my-1 w-full">
      <TraceLine status={isRunning ? "running" : undefined}>
        <TraceIcon>
          {isRunning ? (
            <Loader2Icon className="size-3.5 animate-spin text-amber-400" />
          ) : (
            <EyeIcon className="size-3.5 text-neutral-300" />
          )}
        </TraceIcon>
        <TraceTitle className="text-xs text-neutral-200">
          {isRunning ? "Viewing screen..." : "Inspected screen"}
        </TraceTitle>
        <TraceDescription className="text-[10px]">
          agent visual perception
        </TraceDescription>
      </TraceLine>
    </Trace>
  );
}

interface ShowScreenInput {
  caption?: string;
}

interface ShowScreenOutput {
  success?: boolean;
  caption?: string;
  screenshot?: string;
  timestamp?: string;
  error?: string;
}

interface ScreenshotViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenshot: string;
  caption?: string;
  timestamp?: string | number | Date;
  badge?: string;
}

function ScreenshotViewerModalContent({
  onClose,
  screenshot,
  caption = "Tangkapan Layar",
  timestamp,
  badge,
}: {
  onClose: () => void;
  screenshot: string;
  caption?: string;
  timestamp?: string | number | Date;
  badge?: string;
}) {
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3, +(prev + 0.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(0.5, +(prev - 0.25).toFixed(2));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleDoubleClick = () => {
    if (zoom !== 1) {
      handleResetZoom();
    } else {
      setZoom(1.75);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = () => {
    if (!screenshot) return;
    const link = document.createElement("a");
    link.href = screenshot.startsWith("data:")
      ? screenshot
      : `data:image/png;base64,${screenshot}`;
    link.download = `${caption.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "screenshot"}-${Date.now()}.png`;
    link.click();
  };

  const imgSrc = screenshot.startsWith("data:")
    ? screenshot
    : `data:image/png;base64,${screenshot}`;

  return (
    <DialogContent
      showCloseButton={false}
      className="w-[96vw] sm:max-w-[95vw] md:max-w-6xl h-[88vh] max-h-[88vh] p-0 gap-0 bg-[#0c0d10] border border-zinc-800/80 text-zinc-100 overflow-hidden flex flex-col rounded-2xl shadow-2xl outline-none"
    >
      {/* Header Bar */}
      <div className="h-13 px-4 sm:px-5 border-b border-zinc-800/70 bg-[#121316]/90 backdrop-blur-md flex items-center justify-between shrink-0 select-none">
        <DialogHeader className="p-0 gap-0 min-w-0">
          <DialogTitle className="text-xs sm:text-[13px] font-sans font-medium text-zinc-200 flex items-center gap-2.5 truncate">
            <div className="size-6 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0 text-zinc-400">
              <MonitorIcon className="size-3.5" />
            </div>
            <span className="truncate">{caption}</span>
            {badge && (
              <span className="px-2 py-0.5 rounded-full bg-zinc-800/90 text-[11px] font-mono text-zinc-300 border border-zinc-700/50 shrink-0">
                {badge}
              </span>
            )}
            {timestamp && (
              <span className="text-zinc-500 font-normal text-xs hidden sm:inline-block shrink-0">
                • {new Date(timestamp).toLocaleTimeString()}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 shrink-0">
          {/* Segmented Zoom Capsule */}
          <div className="flex items-center gap-0.5 bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-1 shadow-xs">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="size-7 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Perkecil zoom"
              aria-label="Perkecil"
            >
              <ZoomOutIcon className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-0.5 text-xs font-mono font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-md cursor-pointer transition-colors"
              title="Reset zoom ke 100%"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="size-7 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Perbesar zoom"
              aria-label="Perbesar"
            >
              <ZoomInIcon className="size-3.5" />
            </button>

            {zoom !== 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="size-7 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 flex items-center justify-center transition-colors cursor-pointer ml-0.5"
                title="Kembali ke ukuran normal (100%)"
                aria-label="Reset Zoom"
              >
                <RotateCcwIcon className="size-3" />
              </button>
            )}
          </div>

          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            className="size-8 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-zinc-800/70 flex items-center justify-center transition-colors cursor-pointer"
            title="Unduh tangkapan layar"
            aria-label="Unduh"
          >
            <DownloadIcon className="size-3.5" />
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-zinc-800/70 flex items-center justify-center transition-colors cursor-pointer ml-0.5"
            title="Tutup pratinjau"
            aria-label="Tutup"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Immersive Viewport Canvas */}
      <div
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={cn(
          "flex-1 w-full h-full min-h-0 bg-[#07080a] flex items-center justify-center p-4 sm:p-6 relative select-none overflow-hidden",
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
          title={
            zoom === 1
              ? "Klik ganda untuk memperbesar (175%)"
              : "Klik ganda untuk reset normal (100%)"
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={caption}
            className="max-w-full max-h-[calc(88vh-5.5rem)] object-contain rounded-xl shadow-2xl border border-zinc-800/60 pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Quick Shortcuts Pill */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-zinc-900/85 backdrop-blur-md border border-zinc-800/80 text-[11px] font-sans text-zinc-400 select-none pointer-events-none shadow-lg flex items-center gap-2">
          <span>Klik ganda untuk perbesar</span>
          <span className="text-zinc-600">•</span>
          <span>Scroll untuk zoom</span>
          {zoom > 1 && (
            <>
              <span className="text-zinc-600">•</span>
              <span>Tarik untuk geser</span>
            </>
          )}
        </div>
      </div>
    </DialogContent>
  );
}

function ScreenshotViewerDialog({
  open,
  onOpenChange,
  screenshot,
  caption = "Tangkapan Layar",
  timestamp,
  badge,
}: ScreenshotViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ScreenshotViewerModalContent
          onClose={() => onOpenChange(false)}
          screenshot={screenshot}
          caption={caption}
          timestamp={timestamp}
          badge={badge}
        />
      )}
    </Dialog>
  );
}

/**
 * ShowScreenToolView:
 * Renders the full screenshot card with preview and zoom dialog.
 * In accordance with instructions:
 * "menampilkan screen / show screen (digunakan saat pengguna bertanya ke agent apa yang ada di layar)"
 */
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
  const caption = output?.caption || input?.caption || "Sandbox Desktop Screen";
  const screenshot = output?.screenshot;

  const handleDownload = () => {
    if (!screenshot) return;
    const link = document.createElement("a");
    link.href = screenshot.startsWith("data:")
      ? screenshot
      : `data:image/png;base64,${screenshot}`;
    link.download = `${caption.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "screenshot"}-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="my-3 w-fit max-w-full">
      {screenshot ? (
        <>
          <div
            onClick={() => setIsOpen(true)}
            className="group relative cursor-zoom-in block overflow-hidden rounded-2xl bg-zinc-950/50 border border-zinc-800/40 hover:border-zinc-700/80 transition-all shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                screenshot.startsWith("data:")
                  ? screenshot
                  : `data:image/png;base64,${screenshot}`
              }
              alt={caption}
              className="max-h-[360px] sm:max-h-[420px] w-auto max-w-full object-contain rounded-2xl block"
            />
            {/* Minimalist floating action buttons on hover */}
            <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/80 backdrop-blur-xs border border-zinc-800/80 shadow-md">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Unduh tangkapan layar"
              >
                <DownloadIcon className="size-3.5" />
              </button>
              <div className="p-1.5 text-zinc-400">
                <Maximize2Icon className="size-3.5" />
              </div>
            </div>
          </div>

          <ScreenshotViewerDialog
            open={isOpen}
            onOpenChange={setIsOpen}
            screenshot={screenshot}
            caption={caption}
            timestamp={output?.timestamp}
          />
        </>
      ) : isRunning ? (
        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-zinc-900/40 text-xs font-mono text-zinc-400 w-fit">
          <Loader2Icon className="size-3.5 animate-spin text-zinc-400" />
          <span>Mengambil tangkapan layar...</span>
        </div>
      ) : output?.error ? (
        <div className="rounded-xl bg-rose-950/20 border border-rose-800/40 p-3 text-xs text-rose-400 font-mono">
          error: {output.error}
        </div>
      ) : null}
    </div>
  );
}

interface DisplayItem {
  width: number;
  height: number;
  id?: number;
}

interface GetDisplayInfoOutput {
  success?: boolean;
  displays?: DisplayItem[];
  error?: string;
}

function GetDisplayInfoToolView({
  output,
  state,
}: {
  output?: GetDisplayInfoOutput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const displays = output?.displays || [];
  const primary = displays[0];

  return (
    <Trace className="my-1 w-full">
      <TraceLine status={isRunning ? "running" : undefined}>
        <TraceIcon>
          <LayersIcon className="size-3.5 text-neutral-300" />
        </TraceIcon>
        <TraceTitle className="text-xs text-neutral-200">
          Display details:{" "}
          {primary ? (
            <span className="font-mono text-neutral-100">
              {primary.width}x{primary.height}
            </span>
          ) : (
            "1024x768"
          )}
        </TraceTitle>
      </TraceLine>
    </Trace>
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
    output?.targetBot?.name || input?.targetBotName || "Rekan Tim";
  const targetJob = output?.targetBot?.job;
  const targetAvatar = output?.targetBot?.avatar;
  const reason = output?.reason || input?.reason;

  return (
    <div className="my-2.5 w-full rounded-xl border border-blue-500/30 bg-blue-950/20 p-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            {isRunning ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <ArrowRightLeftIcon className="size-3.5" />
            )}
          </div>
          <span className="text-xs font-medium text-neutral-200 truncate">
            {isRunning
              ? `Mengalihkan tugas ke ${targetName}...`
              : hasError
              ? `Pengalihan tugas gagal`
              : `Tugas dialihkan ke ${targetName}`}
          </span>
        </div>

        {targetName && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 shrink-0">
            {targetAvatar && (
              <SeedAvatar
                seed={targetAvatar}
                size={14}
                className="rounded-full shrink-0"
              />
            )}
            <span className="text-[11px] font-medium text-blue-300">
              {targetName}
            </span>
            {targetJob && (
              <span className="text-[10px] text-blue-400/80 hidden sm:inline">
                ({targetJob})
              </span>
            )}
          </div>
        )}
      </div>

      {reason && (
        <div className="mt-2 text-xs text-neutral-300 bg-neutral-900/70 rounded-lg p-2.5 border border-neutral-800/70">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-0.5">
            Alasan Pengalihan:
          </span>
          <p className="leading-relaxed text-neutral-200">{reason}</p>
        </div>
      )}

      {output?.error && (
        <p className="mt-1.5 text-xs text-red-400 font-mono">
          {output.error}
        </p>
      )}
    </div>
  );
}

function GenericToolView({
  toolName,
  input,
  output,
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
    <Trace className="my-1.5 w-full">
      <TraceCollapsible defaultOpen={false}>
        <TraceCollapsibleTrigger>
          <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
            <TraceIcon>
              {isRunning ? (
                <Loader2Icon className="size-3.5 animate-spin text-amber-400" />
              ) : (
                <WrenchIcon className="size-3.5 text-neutral-300" />
              )}
            </TraceIcon>
            <TraceTitle className="text-xs font-mono text-neutral-200">
              tool: {toolName}
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="mt-1.5">
          <div className="rounded-xl bg-[#08080a] border border-zinc-800/90 p-3 font-mono text-xs space-y-2 shadow-inner">
            {input !== undefined && (
              <div>
                <span className="text-neutral-500 text-[10px]">input:</span>
                <pre className="text-neutral-300 whitespace-pre-wrap select-text max-h-36 overflow-y-auto">
                  {JSON.stringify(input, null, 2)}
                </pre>
              </div>
            )}
            {output !== undefined && (
              <div>
                <span className="text-neutral-500 text-[10px]">output:</span>
                <pre className="text-neutral-300 whitespace-pre-wrap select-text max-h-36 overflow-y-auto">
                  {JSON.stringify(output, null, 2)}
                </pre>
              </div>
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
  maxDepth?: number;
}

interface FileSystemUnifiedOutput {
  success?: boolean;
  action?: string;
  path?: string;
  content?: string;
  entries?: Array<{ name: string; isDirectory?: boolean; size?: number }>;
  size?: number;
  bytesWritten?: number;
  error?: string;
}

function FileSystemUnifiedToolView({
  input,
  output,
  state,
}: {
  input?: FileSystemUnifiedInput;
  output?: FileSystemUnifiedOutput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const hasError = state === "output-error" || (output && output.success === false);
  const action = (output?.action || input?.action || "read").toLowerCase();
  const path = output?.path || input?.path || "workspace";
  const actionLabel =
    action === "write"
      ? "WRITE"
      : action === "edit"
      ? "EDIT"
      : action === "list"
      ? "LIST"
      : "READ";
  const [isOpen, setIsOpen] = React.useState(
    hasError || Boolean(output?.content) || Boolean(input?.oldContent)
  );

  return (
    <Trace className="my-1 w-full">
      <TraceCollapsible open={isOpen} onOpenChange={setIsOpen}>
        <TraceCollapsibleTrigger>
          <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
            <TraceIcon>
              {isRunning ? (
                <Loader2Icon className="size-4 animate-spin text-zinc-400" />
              ) : hasError ? (
                <AlertCircleIcon className="size-3.5 text-rose-400" />
              ) : action === "write" || action === "edit" ? (
                <FileEditIcon className="size-3.5 text-zinc-300" />
              ) : action === "list" ? (
                <FolderTreeIcon className="size-3.5 text-zinc-300" />
              ) : (
                <FileTextIcon className="size-3.5 text-zinc-300" />
              )}
            </TraceIcon>
            <TraceTitle className="font-mono text-xs sm:text-sm text-zinc-100 font-medium">
              <span className="text-zinc-400 font-semibold mr-1.5">file_system</span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-200 font-mono mr-1.5">{actionLabel}</span>
              <span className="text-zinc-200">{path}</span>
            </TraceTitle>
            {output?.size !== undefined && (
              <TraceDescription className="text-xs font-mono">
                {output.size} bytes
              </TraceDescription>
            )}
            {output?.bytesWritten !== undefined && (
              <TraceDescription className="text-xs font-mono">
                {output.bytesWritten} bytes
              </TraceDescription>
            )}
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="mt-1.5">
          <div className="rounded-xl bg-[#08080a] border border-zinc-800/90 p-3 font-mono text-xs overflow-hidden shadow-inner">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800/80 text-xs text-zinc-400">
              <span className="truncate">{path}</span>
              {output?.content && <CopyButton text={output.content} />}
            </div>
            {action === "edit" || input?.oldContent || input?.newContent ? (
              <div className="space-y-2 text-xs">
                {input?.oldContent && (
                  <div>
                    <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider block mb-0.5">
                      - Target Span (Replaced):
                    </span>
                    <pre className="text-rose-300/90 bg-rose-950/20 p-2 rounded-lg border border-rose-900/30 whitespace-pre-wrap select-text max-h-36 overflow-y-auto leading-relaxed">
                      {input.oldContent}
                    </pre>
                  </div>
                )}
                {input?.newContent && (
                  <div>
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block mb-0.5">
                      + Replacement Span:
                    </span>
                    <pre className="text-emerald-300/90 bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/30 whitespace-pre-wrap select-text max-h-36 overflow-y-auto leading-relaxed">
                      {input.newContent}
                    </pre>
                  </div>
                )}
                {output?.error && (
                  <div className="text-rose-400 text-xs mt-1">{output.error}</div>
                )}
                {output?.success && (
                  <div className="text-zinc-400 italic text-[11px] mt-1">
                    File patched surgically.
                  </div>
                )}
              </div>
            ) : output?.content ? (
              <pre className="text-zinc-300 whitespace-pre-wrap select-text max-h-60 overflow-y-auto leading-relaxed">
                {output.content}
              </pre>
            ) : input?.content ? (
              <pre className="text-zinc-300 whitespace-pre-wrap select-text max-h-60 overflow-y-auto leading-relaxed">
                {input.content}
              </pre>
            ) : output?.entries && output.entries.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {output.entries.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-zinc-300 text-[11px]">
                    {entry.isDirectory ? (
                      <FolderIcon className="size-3 text-amber-400 shrink-0" />
                    ) : (
                      <FileIcon className="size-3 text-zinc-400 shrink-0" />
                    )}
                    <span>{entry.name}</span>
                    {entry.size !== undefined && (
                      <span className="text-zinc-600 ml-auto font-mono text-[10px]">{entry.size} B</span>
                    )}
                  </div>
                ))}
              </div>
            ) : output?.error ? (
              <div className="text-rose-400 text-xs">{output.error}</div>
            ) : (
              <div className="text-zinc-500 italic text-[11px]">
                {isRunning ? "Executing filesystem operation..." : "Done."}
              </div>
            )}
          </div>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}

interface SaveMemoryInput {
  category?: "user_profile" | "architecture" | "task_directive" | "learned_playbook";
  title?: string;
  content?: string;
}

interface SaveMemoryOutput {
  success?: boolean;
  category?: string;
  title?: string;
  message?: string;
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
  const hasError = state === "output-error" || (output && output.success === false);
  const category = output?.category || input?.category || "learned_playbook";
  const title = output?.title || input?.title || "Knowledge";
  const content = input?.content || output?.message;
  const [isOpen, setIsOpen] = React.useState(hasError || Boolean(content));

  const categoryLabels: Record<string, string> = {
    user_profile: "USER PROFILE",
    architecture: "ARCHITECTURE",
    task_directive: "DIRECTIVE",
    learned_playbook: "PLAYBOOK",
  };

  return (
    <Trace className="my-1 w-full">
      <TraceCollapsible open={isOpen} onOpenChange={setIsOpen}>
        <TraceCollapsibleTrigger>
          <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
            <TraceIcon>
              {isRunning ? (
                <Loader2Icon className="size-4 animate-spin text-zinc-400" />
              ) : hasError ? (
                <AlertCircleIcon className="size-3.5 text-rose-400" />
              ) : (
                <BrainIcon className="size-3.5 text-violet-400" />
              )}
            </TraceIcon>
            <TraceTitle className="font-mono text-xs sm:text-sm text-zinc-100 font-medium">
              <span className="text-zinc-400 font-semibold mr-1.5">save_memory</span>
              <span className="px-2 py-0.5 rounded bg-violet-950/60 border border-violet-800/40 text-[11px] text-violet-300 font-mono mr-1.5">
                {categoryLabels[category] || "LEARNED"}
              </span>
              <span className="text-zinc-200">{title}</span>
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="mt-1.5">
          <div className="rounded-xl bg-[#08080a] border border-zinc-800/90 p-3 font-mono text-xs overflow-hidden shadow-inner">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800/80 text-xs text-zinc-400">
              <span className="truncate">MEMORY.md &bull; {title}</span>
              {content && <CopyButton text={content} />}
            </div>
            {hasError ? (
              <p className="text-rose-400">{output?.error || "Failed to record memory."}</p>
            ) : content ? (
              <pre className="text-zinc-300 whitespace-pre-wrap select-text max-h-60 overflow-y-auto leading-relaxed">
                {content}
              </pre>
            ) : (
              <p className="text-zinc-500 italic">Saved to persistent memory buffer.</p>
            )}
          </div>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}

interface FetchUrlInput {
  url?: string;
  format?: string;
  maxLength?: number;
}

interface FetchUrlOutput {
  success?: boolean;
  status?: number;
  statusText?: string;
  url?: string;
  contentType?: string;
  length?: number;
  truncated?: boolean;
  content?: string;
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
  const hasError = state === "output-error" || (output && output.success === false);
  const url = output?.url || input?.url || "https://...";
  const [isOpen, setIsOpen] = React.useState(hasError || Boolean(output?.content));

  let hostname = url;
  try {
    hostname = new URL(url).hostname;
  } catch {}

  return (
    <Trace className="my-1 w-full">
      <TraceCollapsible open={isOpen} onOpenChange={setIsOpen}>
        <TraceCollapsibleTrigger>
          <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
            <TraceIcon>
              {isRunning ? (
                <Loader2Icon className="size-4 animate-spin text-zinc-400" />
              ) : hasError ? (
                <AlertCircleIcon className="size-3.5 text-rose-400" />
              ) : (
                <GlobeIcon className="size-3.5 text-cyan-400" />
              )}
            </TraceIcon>
            <TraceTitle className="font-mono text-xs sm:text-sm text-zinc-100 font-medium">
              <span className="text-zinc-400 font-semibold mr-1.5">fetch_url</span>
              <span className="text-zinc-200 truncate max-w-xs">{hostname}</span>
            </TraceTitle>
            {output?.status !== undefined && (
              <TraceDescription className="text-xs font-mono">
                HTTP {output.status}
              </TraceDescription>
            )}
            {output?.length !== undefined && (
              <TraceDescription className="text-xs font-mono">
                {output.length} chars
              </TraceDescription>
            )}
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="mt-1.5">
          <div className="rounded-xl bg-[#08080a] border border-zinc-800/90 p-3 font-mono text-xs overflow-hidden shadow-inner">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800/80 text-xs text-zinc-400">
              <span className="truncate">{url}</span>
              {output?.content && <CopyButton text={output.content} />}
            </div>
            {hasError ? (
              <p className="text-rose-400">{output?.error || "Failed to fetch URL."}</p>
            ) : output?.content ? (
              <pre className="text-zinc-300 whitespace-pre-wrap select-text max-h-60 overflow-y-auto leading-relaxed">
                {output.content}
              </pre>
            ) : null}
          </div>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}

interface ComputerUseUnifiedInput {
  action?: string;
  x?: number;
  y?: number;
  text?: string;
  key?: string;
  direction?: string;
  amount?: number;
  seconds?: number;
}

interface ComputerUseUnifiedOutput {
  success?: boolean;
  action?: string;
  x?: number;
  y?: number;
  screenshot?: string;
  note?: string;
  error?: string;
}

function ComputerUseUnifiedToolView({
  input,
  output,
  state,
}: {
  input?: ComputerUseUnifiedInput;
  output?: ComputerUseUnifiedOutput;
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const hasError = state === "output-error" || (output && output.success === false);
  const action = (output?.action || input?.action || "action").toUpperCase();
  const x = output?.x ?? input?.x;
  const y = output?.y ?? input?.y;
  const text = input?.text;
  const key = input?.key;
  const screenshot = output?.screenshot;
  const [isOpen, setIsOpen] = React.useState(false);
  const [isZoomOpen, setIsZoomOpen] = React.useState(false);

  return (
    <Trace className="my-1 w-full">
      <TraceCollapsible open={isOpen} onOpenChange={setIsOpen}>
        <TraceCollapsibleTrigger>
          <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
            <TraceIcon>
              {isRunning ? (
                <Loader2Icon className="size-4 animate-spin text-zinc-400" />
              ) : hasError ? (
                <AlertCircleIcon className="size-3.5 text-rose-400" />
              ) : (
                <MousePointerClickIcon className="size-3.5 text-zinc-300" />
              )}
            </TraceIcon>
            <TraceTitle className="font-mono text-xs sm:text-sm text-zinc-100 font-medium">
              <span className="text-zinc-400 font-semibold mr-1.5">computer_use</span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-200 font-mono mr-1.5">{action}</span>
              {x !== undefined && y !== undefined ? (
                <span className="text-zinc-300 font-mono tabular-nums">({x}, {y})</span>
              ) : text ? (
                <span className="text-zinc-200 font-mono truncate max-w-[200px]">&quot;{text}&quot;</span>
              ) : key ? (
                <span className="text-zinc-200 font-mono">[{key}]</span>
              ) : null}
            </TraceTitle>
            {screenshot && (
              <TraceDescription className="text-xs font-mono text-zinc-400">
                screenshot
              </TraceDescription>
            )}
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="mt-1.5">
          <div className="rounded-xl bg-[#08080a] border border-zinc-800/90 p-3 font-mono text-xs space-y-2.5 shadow-inner">
            {output?.note && (
              <div className="text-xs text-zinc-300 font-sans">{output.note}</div>
            )}
            {output?.error && (
              <div className="text-rose-400 text-xs">{output.error}</div>
            )}
            {screenshot && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="font-sans">Visual Screen Feedback (0-1000 Grid & Click Marker):</span>
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer font-sans"
                  >
                    <Maximize2Icon className="size-3" />
                    <span>Perbesar</span>
                  </button>
                </div>
                <div
                  onClick={() => setIsZoomOpen(true)}
                  className="group relative cursor-zoom-in overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-950/50 aspect-video max-w-sm flex items-center justify-center hover:border-zinc-700 transition-all shadow-xs"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${screenshot}`}
                    alt="VNC Screen Action"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-zinc-950/80 border border-zinc-800 text-zinc-400">
                    <Maximize2Icon className="size-3.5" />
                  </div>
                </div>

                <ScreenshotViewerDialog
                  open={isZoomOpen}
                  onOpenChange={setIsZoomOpen}
                  screenshot={screenshot}
                  caption="VNC Screen Action"
                  badge={`${action}${x !== undefined && y !== undefined ? ` (${x}, ${y})` : text ? ` "${text}"` : key ? ` [${key}]` : ""}`}
                />
              </div>
            )}
          </div>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}

export function FinishTaskToolView() {
  return null;
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
  input,
  output,
  state,
}: {
  input?: WaitInput;
  output?: WaitOutput;
  state?: string;
}) {
  const duration = output?.duration ?? input?.duration ?? 5;
  const reason =
    output?.reason || input?.reason || "Menunggu proses atau layar...";
  const isRunning = state === "input-streaming" || state === "input-available";

  return (
    <Trace className="my-2">
      <TraceLine status={isRunning ? "running" : undefined}>
        <TraceIcon>
          <ClockIcon
            className={cn(
              "size-4",
              isRunning ? "animate-spin text-zinc-400" : "text-zinc-400"
            )}
          />
        </TraceIcon>
        <TraceTitle className="text-sm sm:text-base font-semibold text-zinc-200">
          {isRunning
            ? `Menunggu ${duration} detik...`
            : `Selesai Menunggu (${duration}s)`}
        </TraceTitle>
        <TraceDescription className="text-xs sm:text-sm text-zinc-400 truncate max-w-[320px]">
          {reason}
        </TraceDescription>
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
    case "editFile":
    case "patchFile":
      return (
        <FileSystemUnifiedToolView
          input={input as FileSystemUnifiedInput}
          output={output as FileSystemUnifiedOutput}
          state={state}
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
    case "readFile":
      return (
        <ReadFileToolView
          input={input as ReadFileInput}
          output={output as ReadFileOutput}
          state={state}
        />
      );
    case "writeFile":
      return (
        <WriteFileToolView
          input={input as WriteFileInput}
          output={output as WriteFileOutput}
          state={state}
        />
      );
    case "listFiles":
      return (
        <ListFilesToolView
          input={input as ListFilesInput}
          output={output as ListFilesOutput}
          state={state}
        />
      );
    case "mouseClick":
      return (
        <MouseClickToolView input={input as MouseClickInput} state={state} />
      );
    case "mouseScroll":
      return (
        <MouseScrollToolView input={input as MouseScrollInput} state={state} />
      );
    case "mouseMove":
      return <MouseMoveToolView input={input as MouseMoveInput} state={state} />;
    case "keyboardType":
      return (
        <KeyboardTypeToolView input={input as KeyboardTypeInput} state={state} />
      );
    case "keyboardPress":
      return (
        <KeyboardPressToolView
          input={input as KeyboardPressInput}
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
    case "viewScreen":
      return <ViewScreenToolView state={state} />;
    case "showScreen":
      return (
        <ShowScreenToolView
          input={input as ShowScreenInput}
          output={output as ShowScreenOutput}
          state={state}
        />
      );
    case "getDisplayInfo":
      return (
        <GetDisplayInfoToolView
          output={output as GetDisplayInfoOutput}
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
