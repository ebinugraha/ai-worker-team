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
  CheckCircle2Icon,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SeedAvatar } from "@/components/seed-avatar";
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

function CopyButton({ text }: { text: string }) {
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
      className="p-1 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
      title={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-emerald-400" />
      ) : (
        <CopyIcon className="size-3.5" />
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
  const hasError = state === "output-error" || (output && output.exitCode !== 0);
  const command = input?.command || "bash";
  const stdout = output?.stdout || "";
  const shouldAutoOpen = hasError || Boolean(stdout);
  const [userToggled, setUserToggled] = React.useState<boolean | null>(null);
  const isOpen = userToggled ?? shouldAutoOpen;

  return (
    <Trace className="my-1.5 w-full">
      <TraceCollapsible open={isOpen} onOpenChange={setUserToggled}>
        <TraceCollapsibleTrigger>
          <TraceLine status={isRunning ? "running" : hasError ? "error" : undefined}>
            <TraceIcon>
              {isRunning ? (
                <Loader2Icon className="size-4 animate-spin text-zinc-400" />
              ) : hasError ? (
                <AlertCircleIcon className="size-4 text-destructive" />
              ) : (
                <TerminalIcon className="size-4 text-neutral-300" />
              )}
            </TraceIcon>
            <TraceTitle className="font-mono text-sm sm:text-base text-zinc-100 font-medium">
              $ {command.length > 55 ? `${command.slice(0, 52)}...` : command}
            </TraceTitle>
            {output?.exitCode !== undefined && (
              <TraceDescription
                className={cn(
                  "text-xs px-2 py-0.5 rounded-sm font-mono",
                  output.exitCode === 0
                    ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
                    : "bg-destructive/20 text-destructive border border-destructive/40"
                )}
              >
                exit {output.exitCode}
              </TraceDescription>
            )}
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="mt-1.5 space-y-2">
          {input?.cwd && (
            <div className="text-xs sm:text-sm text-neutral-300 font-mono">
              cwd: <span className="text-neutral-200">{input.cwd}</span>
            </div>
          )}
          <div className="rounded-lg bg-neutral-950 border border-neutral-800/80 p-3 font-mono text-xs sm:text-sm overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-800/60 text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <TerminalIcon className="size-3 text-neutral-400" />
                terminal
              </span>
              <CopyButton text={stdout || command} />
            </div>
            <div className="text-emerald-400 select-all">$ {command}</div>
            {stdout && (
              <pre className="mt-2 text-neutral-300 whitespace-pre-wrap select-text max-h-60 overflow-y-auto leading-relaxed">
                {stdout}
              </pre>
            )}
            {output?.error && (
              <div className="mt-2 text-destructive text-xs select-text">
                {output.error}
              </div>
            )}
          </div>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
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
          <div className="rounded-lg bg-neutral-950 border border-neutral-800/80 p-2.5 font-mono text-xs overflow-hidden">
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
          <div className="rounded-lg bg-neutral-950 border border-neutral-800/80 p-2.5 font-mono text-xs overflow-hidden">
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
          <div className="rounded-lg bg-neutral-950 border border-neutral-800/80 p-2 font-mono text-xs max-h-56 overflow-y-auto">
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
  const [zoom, setZoom] = React.useState(1);
  const isRunning = state === "input-streaming" || state === "input-available";
  const caption = output?.caption || input?.caption || "Sandbox Desktop Screen";
  const screenshot = output?.screenshot;

  const closeDialog = () => {
    setIsOpen(false);
    setZoom(1);
  };

  const handleOpenChange = (next: boolean) => {
    setIsOpen(next);
    if (!next) {
      setZoom(1);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3, +(prev + 0.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, +(prev - 0.25).toFixed(2)));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleDoubleClick = () => {
    setZoom((prev) => (prev === 1 ? 1.75 : 1));
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  const handleDownload = () => {
    if (!screenshot) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${screenshot}`;
    link.download = `${caption.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "screenshot"}-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="my-2 w-full max-w-xl rounded-xl border border-neutral-800 bg-neutral-950 p-3 shadow-md space-y-2">
      <div className="flex items-center justify-between text-xs text-neutral-300">
        <div className="flex items-center gap-2 font-medium">
          <MonitorIcon className="size-4 text-sky-400" />
          <span>{caption}</span>
        </div>
        {isRunning ? (
          <span className="flex items-center gap-1.5 text-[11px] text-amber-400 font-mono">
            <Loader2Icon className="size-3 animate-spin" />
            capturing...
          </span>
        ) : (
          <span className="text-[10px] text-neutral-500 font-mono">
            {output?.timestamp ? new Date(output.timestamp).toLocaleTimeString() : "Live"}
          </span>
        )}
      </div>

      {screenshot ? (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger className="group relative cursor-pointer overflow-hidden rounded-lg border border-neutral-800 bg-black aspect-video flex items-center justify-center w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt={caption}
              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.01]"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs text-white">
              <Maximize2Icon className="size-4" />
              <span>Click to expand</span>
            </div>
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            className="w-[95vw] sm:max-w-[95vw] md:max-w-6xl h-[88vh] max-h-[88vh] p-0 gap-0 bg-neutral-950 border-neutral-800 text-neutral-100 overflow-hidden flex flex-col rounded-2xl shadow-2xl"
          >
            {/* Header with Title and Zoom / Download / Close controls */}
            <div className="h-12 px-4 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between shrink-0 select-none">
              <DialogHeader className="p-0 gap-0">
                <DialogTitle className="text-sm font-medium flex items-center gap-2 text-neutral-200">
                  <MonitorIcon className="size-4 text-sky-400" />
                  <span>{caption}</span>
                  {output?.timestamp && (
                    <span className="text-xs text-neutral-500 font-mono font-normal ml-1 hidden sm:inline-block">
                      {new Date(output.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-1.5">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    className="size-7 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer disabled:opacity-30"
                    title="Perkecil / Zoom Out (Ctrl + Scroll Down)"
                    aria-label="Zoom Out"
                  >
                    <ZoomOutIcon className="size-3.5" />
                  </Button>

                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="px-2 py-0.5 text-xs font-mono font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 rounded cursor-pointer transition-colors"
                    title="Klik untuk reset zoom ke 100%"
                  >
                    {Math.round(zoom * 100)}%
                  </button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    className="size-7 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer disabled:opacity-30"
                    title="Perbesar / Zoom In (Ctrl + Scroll Up)"
                    aria-label="Zoom In"
                  >
                    <ZoomInIcon className="size-3.5" />
                  </Button>

                  {zoom !== 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={handleResetZoom}
                      className="size-7 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer ml-0.5"
                      title="Reset Zoom ke 100%"
                      aria-label="Reset Zoom"
                    >
                      <RotateCcwIcon className="size-3" />
                    </Button>
                  )}
                </div>

                {/* Download screenshot */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleDownload}
                  className="size-8 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
                  title="Unduh tangkapan layar"
                  aria-label="Unduh"
                >
                  <DownloadIcon className="size-4" />
                </Button>

                {/* Close dialog */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={closeDialog}
                  className="size-8 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer ml-1"
                  title="Tutup pratinjau"
                  aria-label="Tutup"
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            </div>

            {/* Immersive Viewport with Zoom and Scroll Pan */}
            <div
              onWheel={handleWheel}
              className="flex-1 w-full h-full min-h-0 overflow-auto bg-neutral-950 flex items-center justify-center p-4 relative select-none"
            >
              <div
                onDoubleClick={handleDoubleClick}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                }}
                className={cn(
                  "relative max-w-full max-h-full flex items-center justify-center transition-transform",
                  zoom > 1 ? "cursor-zoom-out" : "cursor-zoom-in"
                )}
                title={zoom === 1 ? "Klik ganda untuk memperbesar" : "Klik ganda untuk reset 100%"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${screenshot}`}
                  alt={caption}
                  className="max-w-full max-h-[calc(88vh-5.5rem)] object-contain rounded-lg shadow-2xl border border-neutral-800/80 pointer-events-none"
                  draggable={false}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : isRunning ? (
        <div className="aspect-video w-full rounded-lg bg-neutral-900 border border-neutral-800 animate-pulse flex flex-col items-center justify-center text-xs text-neutral-500 gap-2">
          <Loader2Icon className="size-5 animate-spin text-neutral-400" />
          <span>Taking screen capture...</span>
        </div>
      ) : output?.error ? (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
          Failed to capture screen: {output.error}
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
          <div className="rounded-lg bg-neutral-950 border border-neutral-800/80 p-2 font-mono text-xs space-y-2">
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
  action?: "read" | "write" | "list";
  path?: string;
  content?: string;
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
  const actionLabel = action === "write" ? "WRITE" : action === "list" ? "LIST" : "READ";
  const [isOpen, setIsOpen] = React.useState(hasError || Boolean(output?.content));

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
              ) : action === "write" ? (
                <FileEditIcon className="size-3.5 text-zinc-300" />
              ) : action === "list" ? (
                <FolderTreeIcon className="size-3.5 text-zinc-300" />
              ) : (
                <FileTextIcon className="size-3.5 text-zinc-300" />
              )}
            </TraceIcon>
            <TraceTitle className="font-mono text-sm sm:text-base text-zinc-100 font-medium">
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
          <div className="rounded-md bg-[#050505] border border-zinc-800/80 p-3 font-mono text-xs sm:text-sm overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800/80 text-xs text-zinc-400">
              <span className="truncate">{path}</span>
              {output?.content && <CopyButton text={output.content} />}
            </div>
            {output?.content ? (
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
            <TraceTitle className="font-mono text-sm sm:text-base text-zinc-100 font-medium">
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
          <div className="rounded-md bg-[#050505] border border-zinc-800/80 p-3 font-mono text-xs sm:text-sm space-y-2">
            {output?.note && (
              <div className="text-xs text-zinc-300">{output.note}</div>
            )}
            {output?.error && (
              <div className="text-rose-400 text-xs sm:text-sm">{output.error}</div>
            )}
            {screenshot && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Visual Screen Feedback (0-1000 Grid & Click Marker):</span>
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    <Maximize2Icon className="size-3" />
                    <span>Expand</span>
                  </button>
                </div>
                <div
                  onClick={() => setIsZoomOpen(true)}
                  className="relative cursor-pointer overflow-hidden rounded border border-zinc-800 bg-black aspect-video max-w-sm flex items-center justify-center group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${screenshot}`}
                    alt="VNC Screen Action"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs text-white">
                    <Maximize2Icon className="size-3.5" />
                    <span>Perbesar Layar</span>
                  </div>
                </div>

                <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
                  <DialogContent className="max-w-4xl p-2 bg-[#050505] border border-zinc-800 text-zinc-200">
                    <DialogHeader className="p-2 border-b border-zinc-800">
                      <DialogTitle className="text-xs font-mono">
                        VNC Screen Capture — {action} {x !== undefined ? `(${x}, ${y})` : ""}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="p-2 flex items-center justify-center bg-black rounded">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${screenshot}`}
                        alt="Fullsize VNC Screen"
                        className="max-h-[75vh] w-auto object-contain"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}

export function FinishTaskToolView({
  input,
  output,
  state,
}: {
  input?: { summary?: string };
  output?: { summary?: string };
  state: string;
}) {
  const isRunning = state === "input-streaming" || state === "input-available";
  const summary =
    output?.summary || input?.summary || "Seluruh instruksi berhasil diselesaikan.";

  return (
    <div className="w-full max-w-full min-w-0 my-3 rounded-xl bg-zinc-900 border border-zinc-800 p-4 sm:p-5 text-sm text-zinc-200">
      <div className="flex items-start gap-3.5 min-w-0">
        {isRunning ? (
          <Loader2Icon className="size-5 animate-spin text-zinc-400 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2Icon className="size-5 text-zinc-300 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-semibold text-zinc-100 text-sm sm:text-base shrink-0">
              Tugas Selesai
            </span>
            <span className="text-xs text-zinc-400">
              {isRunning ? "sedang menyelesaikan..." : "berhasil"}
            </span>
          </div>
          <div className="text-zinc-200 text-sm sm:text-base font-sans leading-relaxed break-words whitespace-pre-wrap select-text">
            {summary}
          </div>
        </div>
      </div>
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
      return (
        <FileSystemUnifiedToolView
          input={input as FileSystemUnifiedInput}
          output={output as FileSystemUnifiedOutput}
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
      return (
        <FinishTaskToolView
          input={input as { summary?: string }}
          output={output as { summary?: string }}
          state={state}
        />
      );
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
