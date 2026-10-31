"use client";

import * as React from "react";
import {
  MonitorIcon,
  Maximize2Icon,
  Minimize2Icon,
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

  if (!sandboxId) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full w-full p-6 text-center text-muted-foreground", className)}>
        <MonitorIcon className="size-10 mb-2 opacity-40" />
        <p className="text-sm font-medium">Sandbox Daytona belum terkonfigurasi</p>
        <p className="text-xs text-muted-foreground/80 mt-1 max-w-xs">
          Bot ini tidak memiliki ID sandbox aktif untuk menampilkan sesi VNC.
        </p>
      </div>
    );
  }

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
      */}
      {isFullscreen && (
        <div
          data-slot="vnc-backdrop"
          aria-hidden="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-150"
        />
      )}

      {/* 
        Single Persistent Container for VNC:
        When isFullscreen is true, it expands to a fixed fullscreen modal at z-[60] (above backdrop).
        When isFullscreen is false, it stays inline within the resizable panel.
        IMPORTANT: The iframe is loaded ONCE and NEVER unmounted or remounted!
      */}
      <div
        className={cn(
          isFullscreen
            ? "fixed inset-2 sm:inset-4 md:inset-6 z-[60] flex flex-col bg-background rounded-xl border border-border shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
            : "relative flex flex-col h-full w-full min-h-0 min-w-0 bg-background overflow-hidden",
          className
        )}
      >
        {/* Fullscreen Header (only visible in fullscreen mode) */}
        {isFullscreen && (
          <div className="h-14 px-4 sm:px-6 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-3 min-w-0">
              <MonitorIcon className="size-5 text-zinc-400 shrink-0" />
              <span className="font-semibold text-base sm:text-lg text-zinc-100 truncate">
                
              </span>
            </div>

            <div className="flex items-center gap-3">
              {vncUrl && (
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <span className="text-xs sm:text-sm text-zinc-300 font-medium select-none">
                    Kendalikan layar
                  </span>
                  <Switch
                    checked={isTakeoverMode}
                    onCheckedChange={(checked) => setIsTakeoverMode(Boolean(checked))}
                    aria-label="Kendalikan layar"
                  />
                </div>
              )}
              {vncUrl && (
                <a
                  href={vncUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                  title="Buka langsung di tab baru"
                  aria-label="Buka di tab baru"
                >
                  <ExternalLinkIcon className="size-4" />
                </a>
              )}
              <button
                type="button"
                onClick={handleReload}
                disabled={isLoading}
                className="size-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Muat ulang layar"
                aria-label="Muat ulang layar"
              >
                <RotateCwIcon className={cn("size-4", isReloading && "animate-spin")} />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="size-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Keluar dari layar penuh"
              >
                <Minimize2Icon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="size-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Tutup dialog"
                aria-label="Tutup"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* Panel Top Bar in inline preview mode */}
        {!isFullscreen && !isMobileView && (
          <div className="h-14 px-4 sm:px-6 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-3 min-w-0">
              <MonitorIcon className="size-5 text-zinc-400 shrink-0" />
              <span className="font-semibold text-base sm:text-lg text-zinc-100 truncate">
                
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {vncUrl && (
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <span className="text-xs sm:text-sm text-zinc-300 font-medium select-none">
                    Kendalikan layar
                  </span>
                  <Switch
                    checked={isTakeoverMode}
                    onCheckedChange={(checked) => setIsTakeoverMode(Boolean(checked))}
                    aria-label="Kendalikan layar"
                  />
                </div>
              )}
              {vncUrl && (
                <a
                  href={vncUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                  title="Buka langsung di tab baru"
                  aria-label="Buka di tab baru"
                >
                  <ExternalLinkIcon className="size-4" />
                </a>
              )}
              <button
                type="button"
                onClick={handleReload}
                disabled={isLoading}
                className="size-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Muat ulang layar"
                aria-label="Muat ulang layar"
              >
                <RotateCwIcon className={cn("size-4", isReloading && "animate-spin")} />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="size-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Layar penuh (Fullscreen)"
              >
                <Maximize2Icon className="size-4" />
              </button>
            </div>
          </div>
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
                        aria-label="Kendalikan layar"
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
          In Panel Preview: renders the monitor card + label "{botName}'s screen" + empty bottom space.
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
                : "flex-1 flex flex-col w-full h-full min-h-0 p-4 sm:p-6 bg-background"
          )}
        >
          {/* Simple Friendly Loading State */}
          {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto w-full">
              <div className="flex flex-col items-center gap-3.5 max-w-sm">
                <Loader2Icon className="size-8 animate-spin text-zinc-400" />
                <p className="text-base sm:text-lg text-zinc-100 font-semibold">
                  Sedang menyiapkan layar komputer...
                </p>
                <p className="text-sm text-zinc-400">
                  Mohon tunggu sebentar, layar kerja akan segera tampil otomatis.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto max-w-md mx-auto">
              <AlertCircleIcon className="size-8 sm:size-10 text-rose-500 mb-3" />
              <div className="space-y-1.5">
                <p className="text-base font-semibold text-rose-400">
                  Layar Tidak Dapat Dimuat
                </p>
                <p className="text-sm text-zinc-400">{error}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={fetchVncUrl}
                className="mt-4 h-9 px-4 text-sm gap-2 cursor-pointer rounded-lg border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
              >
                <RotateCwIcon className="size-4" />
                Coba Lagi
              </Button>
            </div>
          )}

          {/* Persistent VNC View */}
          {vncUrl && !isLoading && (
            <div
              className={cn(
                "flex flex-col items-center w-full h-full flex-1 min-h-0",
                isFullscreen ? "h-full flex-1 min-h-0" : ""
              )}
            >
              <div
                className={cn(
                  "relative transition-all select-none w-full h-full flex-1 min-h-0",
                  isTakeoverMode
                    ? "border-2 border-zinc-400 rounded-xl overflow-hidden bg-black shadow-lg"
                    : "border border-zinc-800 rounded-xl overflow-hidden bg-black"
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
                {/* Screen Display Frame */}
                <div className="relative w-full h-full overflow-hidden bg-black flex-1 min-h-0">
                  {/* Single Persistent Iframe */}
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

                  {/* Click-to-Fullscreen Hover Overlay Hint (only when not in Takeover Mode) */}
                  {!isFullscreen && !isMobileView && !isTakeoverMode && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors cursor-pointer group">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/90 text-zinc-100 text-sm px-4 py-2 rounded-lg flex items-center gap-2 border border-zinc-700 shadow-lg">
                        <Maximize2Icon className="size-4" />
                        <span>Klik untuk perbesar layar</span>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default DaytonaVncViewer;
