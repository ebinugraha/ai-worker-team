"use client";

import * as React from "react";
import {
  MonitorIcon,
  Maximize2Icon,
  Loader2Icon,
  RotateCwIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  XIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getBotVncUrlAction } from "@/action/bot";
import { cn } from "@/lib/utils";

export interface DaytonaVncViewerProps {
  sandboxId?: string | null;
  botName?: string;
  initialVncUrl?: string | null;
  className?: string;
  isMobileView?: boolean;
  onClose?: () => void;
}

export function DaytonaVncViewer({
  sandboxId,
  botName = "Chatbot",
  initialVncUrl = null,
  className,
  isMobileView = false,
  onClose,
}: DaytonaVncViewerProps) {
  const [vncUrl, setVncUrl] = React.useState<string | null>(initialVncUrl);
  const [isLoading, setIsLoading] = React.useState<boolean>(!initialVncUrl && Boolean(sandboxId));
  const [isReloading, setIsReloading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  const [isTakeoverMode, setIsTakeoverMode] = React.useState<boolean>(false);
  const [isMobileMinimized, setIsMobileMinimized] = React.useState<boolean>(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  /**
   * Pre-authorizes the Daytona proxy preview warning page.
   * Daytona sets the `daytona-preview-page-accepted=true` cookie on POST /accept-daytona-preview-warning.
   * Calling this before or upon receiving the URL ensures the iframe does not show the warning page.
   */
  const preAuthorizePreviewUrl = React.useCallback(async (targetUrl: string) => {
    try {
      const parsed = new URL(targetUrl);
      const acceptUrl = `${parsed.origin}/accept-daytona-preview-warning?redirect=${encodeURIComponent(targetUrl)}`;
      await fetch(acceptUrl, {
        method: "POST",
        mode: "cors",
        credentials: "include",
      });
    } catch {
      // In case cross-origin fetch is restricted, fallback is gracefully handled
    }
  }, []);

  // Fetch VNC URL from server action
  const fetchVncUrl = React.useCallback(async () => {
    if (!sandboxId) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await getBotVncUrlAction(sandboxId);
      if (result.success && result.data?.vncUrl) {
        const url = result.data.vncUrl;
        await preAuthorizePreviewUrl(url);
        setVncUrl(url);
      } else {
        setError(result.error || "Gagal menghubungkan ke desktop VNC.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memuat VNC."
      );
    } finally {
      setIsLoading(false);
    }
  }, [sandboxId, preAuthorizePreviewUrl]);

  React.useEffect(() => {
    let ignore = false;
    if (!vncUrl && sandboxId) {
      getBotVncUrlAction(sandboxId)
        .then(async (result) => {
          if (ignore) return;
          if (result.success && result.data?.vncUrl) {
            const url = result.data.vncUrl;
            await preAuthorizePreviewUrl(url);
            if (!ignore) {
              setVncUrl(url);
            }
          } else {
            setError(result.error || "Gagal menghubungkan ke desktop VNC.");
          }
          setIsLoading(false);
        })
        .catch((err) => {
          if (ignore) return;
          setError(
            err instanceof Error ? err.message : "Terjadi kesalahan saat memuat VNC."
          );
          setIsLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [vncUrl, sandboxId, preAuthorizePreviewUrl]);

  // Handle reload action
  const handleReload = () => {
    if (error || !vncUrl) {
      fetchVncUrl();
      return;
    }
    setIsReloading(true);
    if (iframeRef.current && vncUrl) {
      iframeRef.current.src = vncUrl;
    }
    setTimeout(() => {
      setIsReloading(false);
    }, 800);
  };

  // Prevent Escape key from closing the dialog when fullscreen is active (critical for VNC UX)
  React.useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isFullscreen]);

  // Focus iframe when entering fullscreen so keyboard input works instantly
  React.useEffect(() => {
    if (isFullscreen && iframeRef.current) {
      const timer = setTimeout(() => {
        iframeRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isFullscreen]);

  return (
    <>
      {/* Base UI Dialog state manager for accessibility and state control */}
      <Dialog
        open={isFullscreen}
        onOpenChange={(nextOpen, eventDetails) => {
          // Prevent dialog from closing on escape key or outside press to protect user UX in VNC
          if (
            !nextOpen &&
            (eventDetails?.reason === "escape-key" ||
              eventDetails?.reason === "outside-press")
          ) {
            return;
          }
          setIsFullscreen(nextOpen);
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{`${botName}'s screen`}</DialogTitle>
        </DialogHeader>
      </Dialog>

      {/* 
        Fullscreen Backdrop Overlay:
        Placed at z-50 to blur background behind the modal dialog.
        The VNC container has z-[60] so it sits ON TOP of this backdrop without being blurred!
        Clicking the backdrop closes fullscreen mode.
      */}
      {isFullscreen && (
        <div
          data-slot="vnc-backdrop"
          aria-hidden="true"
          onClick={() => setIsFullscreen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md animate-in fade-in-0 duration-150 cursor-pointer"
        />
      )}

      {/* 
        Single Persistent Container for VNC:
        When isFullscreen is true: centered floating modal matching 4:3 screen ratio with smooth border-radius.
        When isFullscreen is false: inline within the resizable panel.
        IMPORTANT: The iframe is loaded ONCE and NEVER unmounted or remounted!
      */}
      <div
        className={cn(
          isFullscreen
            ? "fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 md:p-6 pointer-events-none"
            : "relative flex flex-col h-full w-full min-h-0 min-w-0 bg-background overflow-hidden",
          className
        )}
      >
        <div
          className={cn(
            isFullscreen
              ? "pointer-events-auto relative flex flex-col bg-neutral-950 rounded-2xl md:rounded-[22px] shadow-2xl overflow-hidden w-full max-w-[min(94vw,calc((92vh-44px)*4/3))] h-[min(92vh,calc(94vw*3/4+44px))] max-h-[92vh] border-none ring-1 ring-white/10 animate-in fade-in-0 zoom-in-95 duration-150"
              : "flex flex-col h-full w-full min-h-0 min-w-0 overflow-hidden"
          )}
        >
          {/* Fullscreen Header (only visible in fullscreen mode) */}
          {isFullscreen && (
            <header className="h-11 w-full px-4 sm:px-5 bg-neutral-900/90 backdrop-blur-md flex items-center justify-between shrink-0 select-none border-none">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="font-medium text-xs sm:text-sm text-foreground truncate">
                  {`${botName}'s screen`}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/70 px-1.5 py-0.5 rounded-md bg-white/5 select-none hidden sm:inline-block">
                  1024×768
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {vncUrl && (
                  <button
                    type="button"
                    onClick={() => setIsTakeoverMode(!isTakeoverMode)}
                    className={cn(
                      "h-7 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none",
                      isTakeoverMode
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10"
                    )}
                    title={
                      isTakeoverMode
                        ? "Matikan kontrol langsung"
                        : "Kendalikan layar langsung (mouse & keyboard)"
                    }
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full transition-colors",
                        isTakeoverMode ? "bg-emerald-400" : "bg-neutral-500"
                      )}
                    />
                    <span>{isTakeoverMode ? "Kontrol Aktif" : "Kendalikan"}</span>
                  </button>
                )}

                {vncUrl && (
                  <a
                    href={vncUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                    title="Buka langsung di tab baru"
                    aria-label="Buka di tab baru"
                  >
                    <ExternalLinkIcon className="size-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleReload}
                  disabled={isLoading}
                  className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer"
                  title="Muat ulang layar"
                  aria-label="Muat ulang layar"
                >
                  <RotateCwIcon
                    className={cn("size-3.5", isReloading && "animate-spin")}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer ml-0.5"
                  title="Tutup layar penuh (Esc)"
                  aria-label="Tutup"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            </header>
          )}

        {/* Panel Top Bar in inline preview mode: Clean top row matching resizable-screen-vnc.png */}
        {!isFullscreen && !isMobileView && (
          <header className="h-12 w-full px-4 sm:px-6 flex items-center justify-end shrink-0 select-none">
            <button
              type="button"
              onClick={handleReload}
              disabled={isLoading}
              className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="Muat ulang layar"
              aria-label="Muat ulang layar"
            >
              <RotateCwIcon className={cn("size-4", isReloading && "animate-spin")} />
            </button>
          </header>
        )}

        {/* Mobile Dock Top Bar & Minimized Bar */}
        {!isFullscreen && isMobileView && (
          <>
            {/* Minimized slim bar */}
            {isMobileMinimized && (
              <div className="h-11 px-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between select-none">
                <button
                  type="button"
                  onClick={() => setIsMobileMinimized(false)}
                  className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition-opacity cursor-pointer text-left outline-none"
                  title="Tampilkan layar komputer"
                >
                  <MonitorIcon className="size-4 text-zinc-400 shrink-0" />
                  <span className="text-sm font-medium text-zinc-200 truncate">
                    {`${botName}'s screen`}
                  </span>
                  <span className="text-xs text-zinc-500">
                    (diminimalkan)
                  </span>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMinimized(false)}
                    className="size-8 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
                    title="Perluas layar"
                  >
                    <ChevronDownIcon className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsFullscreen(true)}
                    className="size-8 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
                    title="Layar penuh (Fullscreen)"
                  >
                    <Maximize2Icon className="size-4" />
                  </Button>
                  {onClose && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="size-8 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
                      title="Tutup layar"
                    >
                      <XIcon className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Expanded dock header */}
            {!isMobileMinimized && (
              <div className="h-12 px-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MonitorIcon className="size-4 text-zinc-400 shrink-0" />
                  <span className="text-sm font-semibold text-zinc-200 truncate">
                    {`${botName}'s screen`}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {vncUrl && (
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800">
                      <span className="text-xs text-zinc-300 font-medium select-none">
                        Kendalikan
                      </span>
                      <Switch
                        checked={isTakeoverMode}
                        onCheckedChange={(checked) => setIsTakeoverMode(Boolean(checked))}
                        aria-label="Moderate Screen"
                      />
                    </div>
                  )}
                  {vncUrl && (
                    <a
                      href={vncUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Buka tab baru"
                    >
                      <ExternalLinkIcon className="size-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleReload}
                    disabled={isLoading}
                    className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Muat ulang layar"
                  >
                    <RotateCwIcon className={cn("size-4", isReloading && "animate-spin")} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(true)}
                    className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Layar penuh (Fullscreen)"
                  >
                    <Maximize2Icon className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMobileMinimized(true)}
                    className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Minimalkan layar"
                  >
                    <ChevronUpIcon className="size-4" />
                  </button>
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Tutup layar"
                    >
                      <XIcon className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* 
          Body / Preview Area:
          In Fullscreen: fills the modal dialog (flex-1) with edge-to-edge interactive VNC.
          In Panel Preview: renders the monitor card anchored at top + label "{botName}'s screen" + empty bottom space (matching src/references/resizable-screen-vnc.png).
        */}
        <div
          className={cn(
            isFullscreen
              ? "relative flex-1 w-full h-full min-h-0 min-w-0 bg-neutral-950 overflow-hidden flex items-center justify-center"
              : isMobileView
                ? cn(
                    "flex flex-col items-center w-full min-h-0 px-3 py-3",
                    isMobileMinimized && "hidden"
                  )
                : "flex-1 flex flex-col items-center w-full min-h-0 overflow-y-auto px-4 sm:px-6 pt-0 pb-6 bg-background"
          )}
        >
          <div
            className={cn(
              "flex flex-col items-center w-full transition-all",
              isFullscreen ? "h-full flex-1 min-h-0 justify-center" : "justify-start"
            )}
          >
            {/* VNC Screen Thumbnail: Full 4:3 aspect ratio matching 1024x768 Daytona display (no gray pillarbox bars on left/right), borderless, clean with smooth rounded radius */}
            <div
              className={cn(
                "relative transition-all select-none overflow-hidden",
                isFullscreen
                  ? "w-full h-full flex-1 min-h-0 min-w-0 bg-neutral-950 p-0 m-0 rounded-none border-none"
                  : isMobileView
                    ? "w-full max-w-md aspect-[4/3] rounded-xl bg-neutral-950 shadow-sm"
                    : "w-full max-w-xl aspect-[4/3] rounded-[18px] bg-neutral-950 shadow-md cursor-pointer group hover:shadow-lg transition-shadow",
                !isFullscreen && isTakeoverMode && "ring-2 ring-zinc-400"
              )}
              onClick={() => {
                if (!isFullscreen && !isTakeoverMode) setIsFullscreen(true);
              }}
              title={
                !isFullscreen
                  ? isTakeoverMode
                    ? "Kontrol layar aktif: Anda dapat menggerakkan mouse & mengetik langsung"
                    : "Klik untuk membuka layar penuh"
                  : undefined
              }
            >
              {/* 1. Live Iframe when vncUrl is active */}
              {vncUrl && (
                <iframe
                  ref={iframeRef}
                  src={vncUrl}
                  title={`${botName}'s screen`}
                  className={cn(
                    "w-full h-full border-0 bg-neutral-950 block",
                    !isFullscreen && !isTakeoverMode && "pointer-events-none"
                  )}
                  allow="clipboard-read; clipboard-write; fullscreen"
                  tabIndex={isFullscreen || isTakeoverMode ? 0 : -1}
                />
              )}

              {/* 2. Loading State: Virtual desktop mockup with spinner */}
              {isLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#0b5d6f] to-[#0d7688]">
                  {/* Top simulated OS bar */}
                  <div className="absolute top-0 inset-x-0 h-4 bg-white/15 backdrop-blur-xs flex items-center px-2">
                    <div className="size-1.5 rounded-full bg-white/40 mr-1" />
                  </div>
                  {/* Desktop icons preview */}
                  <div className="absolute top-6 left-3 flex flex-col gap-2">
                    <div className="size-2.5 rounded-xs bg-white/30" />
                    <div className="size-2.5 rounded-xs bg-white/30" />
                    <div className="size-2.5 rounded-xs bg-white/30" />
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 text-center">
                    <Loader2Icon className="size-6 text-white animate-spin" />
                    <p className="text-xs font-medium text-white/95">
                      Menyiapkan layar komputer...
                    </p>
                  </div>
                  {/* Bottom dock */}
                  <div className="absolute bottom-2 inset-x-0 flex justify-center">
                    <div className="h-3 w-16 rounded-full bg-black/40 backdrop-blur-xs" />
                  </div>
                </div>
              )}

              {/* 3. Error State cleanly framed inside the screen */}
              {error && !isLoading && !vncUrl && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#121214] text-center p-4">
                  <AlertCircleIcon className="size-6 text-rose-400 mb-0.5" />
                  <p className="text-xs font-semibold text-zinc-200">
                    Layar Tidak Dapat Dimuat
                  </p>
                  <p className="text-[11px] text-zinc-400 max-w-[220px] truncate">
                    {error}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchVncUrl();
                    }}
                    className="mt-1 h-7 px-3 text-xs gap-1.5 rounded-lg border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                  >
                    <RotateCwIcon className="size-3" />
                    Coba Lagi
                  </Button>
                </div>
              )}

              {/* 4. Missing Sandbox ID State cleanly framed inside the screen */}
              {!sandboxId && !isLoading && !vncUrl && !error && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#121214] text-center p-4">
                  <MonitorIcon className="size-7 text-zinc-500 opacity-60 mb-0.5" />
                  <p className="text-xs font-medium text-zinc-200">
                    Sandbox belum aktif
                  </p>
                  <p className="text-[11px] text-zinc-500 max-w-[200px]">
                    Mulai percakapan untuk mengaktifkan komputer virtual bot.
                  </p>
                </div>
              )}

              {/* Click-to-Fullscreen Hover Overlay Hint (only when not in Takeover Mode) */}
              {!isFullscreen && !isMobileView && !isTakeoverMode && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors pointer-events-none">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/90 text-zinc-100 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/10 shadow-md backdrop-blur-xs">
                    <Maximize2Icon className="size-3.5" />
                    <span>Perbesar layar</span>
                  </div>
                </div>
              )}

              {/* Mobile Corner Badge Hint */}
              {!isFullscreen && isMobileView && (
                <div className="absolute bottom-1.5 right-1.5 z-10 bg-black/80 text-[10px] text-zinc-300 px-2 py-0.5 rounded font-mono flex items-center gap-1 border border-zinc-800 pointer-events-none">
                  <Maximize2Icon className="size-2.5" />
                  <span>Fullscreen</span>
                </div>
              )}
            </div>

            {/* Centered Label below screen card in Preview mode */}
            {!isFullscreen && !isMobileView && (
              <>
                <p className="text-xs text-muted-foreground text-center mt-3 font-normal select-none">
                  {`${botName}'s screen`}
                </p>
                <div className="flex-1 w-full" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  </>
);
}

export default DaytonaVncViewer;
