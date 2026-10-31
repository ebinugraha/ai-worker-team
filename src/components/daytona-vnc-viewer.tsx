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
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
          <div className="h-11 px-4 border-b border-border bg-card/60 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <MonitorIcon className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">
                {`${botName}'s screen`}
              </span>
              {vncUrl && (
                <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 py-0 border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                  Live
                </Badge>
              )}
              <span className="text-xs text-muted-foreground/70 hidden sm:inline-block">
                1024 × 768
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {vncUrl && (
                <a
                  href={vncUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon-sm" }),
                    "size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  )}
                  title="Buka langsung di tab baru"
                  aria-label="Buka di tab baru"
                >
                  <ExternalLinkIcon className="size-4" />
                </a>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleReload}
                disabled={isLoading}
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                title="Muat ulang layar VNC"
                aria-label="Muat ulang layar"
              >
                <RotateCwIcon className={cn("size-4", isReloading && "animate-spin")} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="h-8 text-xs px-3 gap-1.5 cursor-pointer rounded-lg ml-1"
                title="Keluar dari mode layar penuh"
              >
                <Minimize2Icon className="size-3.5" />
                <span className="hidden sm:inline">Keluar Layar Penuh</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsFullscreen(false)}
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                title="Tutup dialog"
                aria-label="Tutup"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Panel Top Bar in inline preview mode (matching src/references/resizable-screen-vnc.png) */}
        {!isFullscreen && !isMobileView && (
          <div className="h-11 px-4 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2">
              <MonitorIcon className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Screen</span>
            </div>
            <div className="flex items-center gap-1">
              {vncUrl && (
                <a
                  href={vncUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon-sm" }),
                    "size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                  )}
                  title="Buka langsung di tab baru"
                  aria-label="Buka di tab baru"
                >
                  <ExternalLinkIcon className="size-4" />
                </a>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleReload}
                disabled={isLoading}
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                title="Muat ulang layar VNC"
                aria-label="Muat ulang layar"
              >
                <RotateCwIcon className={cn("size-4", isReloading && "animate-spin")} />
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Dock Top Bar & Minimized Bar */}
        {!isFullscreen && isMobileView && (
          <>
            {/* Minimized slim bar */}
            {isMobileMinimized && (
              <div className="h-9 px-3 bg-muted/30 border-b border-border flex items-center justify-between select-none">
                <button
                  type="button"
                  onClick={() => setIsMobileMinimized(false)}
                  className="flex items-center gap-2 min-w-0 hover:opacity-85 transition-opacity cursor-pointer text-left outline-none"
                  title="Tampilkan layar VNC"
                >
                  <MonitorIcon className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-foreground truncate">
                    {botName}&apos;s screen
                  </span>
                  {vncUrl && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 border-emerald-500/40 text-emerald-400 bg-emerald-500/10 shrink-0">
                      <span className="size-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                      Live
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">
                    (diminimalkan)
                  </span>
                </button>

                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setIsMobileMinimized(false)}
                    className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Perluas layar"
                  >
                    <ChevronDownIcon className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setIsFullscreen(true)}
                    className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Layar penuh (Fullscreen)"
                  >
                    <Maximize2Icon className="size-3.5" />
                  </Button>
                  {onClose && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={onClose}
                      className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Tutup monitor"
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Expanded dock header */}
            {!isMobileMinimized && (
              <div className="h-8 px-3 border-b border-border/50 bg-muted/20 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2 min-w-0">
                  <MonitorIcon className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-foreground truncate">
                    {botName}&apos;s screen
                  </span>
                  {vncUrl && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 border-emerald-500/40 text-emerald-400 bg-emerald-500/10 shrink-0">
                      <span className="size-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                      Live
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  {vncUrl && (
                    <a
                      href={vncUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon-xs" }),
                        "size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                      )}
                      title="Buka tab baru"
                    >
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleReload}
                    disabled={isLoading}
                    className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Muat ulang layar"
                  >
                    <RotateCwIcon className={cn("size-3.5", isReloading && "animate-spin")} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setIsFullscreen(true)}
                    className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Layar penuh (Fullscreen)"
                  >
                    <Maximize2Icon className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setIsMobileMinimized(true)}
                    className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Minimalkan layar"
                  >
                    <ChevronUpIcon className="size-3.5" />
                  </Button>
                  {onClose && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={onClose}
                      className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Tutup monitor"
                    >
                      <XIcon className="size-3.5" />
                    </Button>
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
                    "flex flex-col items-center w-full min-h-0 px-2.5 py-2",
                    isMobileMinimized && "hidden"
                  )
                : "flex-1 flex flex-col w-full min-h-0 overflow-y-auto px-4 sm:px-6 pt-1 pb-4"
          )}
        >
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 p-6 sm:p-8 text-center text-muted-foreground my-auto">
              <Loader2Icon className="size-7 sm:size-8 animate-spin text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Menghubungkan ke Sandbox Daytona...
                </p>
                <p className="text-xs text-muted-foreground">
                  Memulai server grafis VNC dan sesi desktop.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 p-6 sm:p-8 text-center my-auto max-w-sm mx-auto">
              <AlertCircleIcon className="size-7 sm:size-8 text-destructive" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">
                  Koneksi VNC Gagal
                </p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchVncUrl}
                className="mt-2 h-8 text-xs gap-1.5 cursor-pointer rounded-lg"
              >
                <RotateCwIcon className="size-3.5" />
                Coba Lagi
              </Button>
            </div>
          )}

          {/* 
            Persistent VNC View:
            Always keeps the EXACT SAME <iframe> DOM node mounted whether previewing or fullscreen!
          */}
          {vncUrl && !isLoading && (
            <div
              className={cn(
                "flex flex-col items-center w-full transition-all",
                isFullscreen ? "h-full flex-1 min-h-0" : ""
              )}
            >
              {/* Card Container (in preview) vs Edge-to-edge frame (in fullscreen) */}
              <div
                className={cn(
                  "relative transition-all select-none",
                  isFullscreen
                    ? "w-full h-full flex-1 min-h-0 min-w-0 bg-neutral-950 p-0 m-0"
                    : isMobileView
                      ? "w-full max-w-md rounded-xl border border-border/80 bg-[#1b1b1e] p-1.5 shadow-sm hover:border-neutral-600 cursor-pointer group"
                      : "w-full max-w-xl rounded-xl border border-border/80 bg-[#1b1b1e] p-2.5 sm:p-3 shadow-sm hover:border-neutral-600 cursor-pointer group"
                )}
                onClick={() => {
                  if (!isFullscreen) setIsFullscreen(true);
                }}
                title={!isFullscreen ? "Klik untuk membuka layar penuh (Fullscreen)" : undefined}
              >
                {/* Screen Display Frame */}
                <div
                  className={cn(
                    "relative w-full overflow-hidden bg-neutral-950",
                    isFullscreen
                      ? "h-full flex-1 min-h-0"
                      : isMobileView
                        ? "aspect-[16/10] max-h-[220px] rounded-lg border border-black/50"
                        : "aspect-[16/10] rounded-lg border border-black/50"
                  )}
                >
                  {/* Single Persistent Iframe */}
                  <iframe
                    ref={iframeRef}
                    src={vncUrl}
                    title={`${botName}'s screen`}
                    className={cn(
                      "w-full h-full border-0 bg-neutral-950 block",
                      !isFullscreen && "pointer-events-none"
                    )}
                    allow="clipboard-read; clipboard-write; fullscreen"
                    tabIndex={isFullscreen ? 0 : -1}
                  />

                  {/* Click-to-Fullscreen Hover Overlay Hint in Desktop Preview Mode */}
                  {!isFullscreen && !isMobileView && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/95 text-white text-xs px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-xl border border-neutral-700/80">
                        <Maximize2Icon className="size-3.5" />
                        <span>Klik untuk Layar Penuh</span>
                      </div>
                    </div>
                  )}

                  {/* Mobile Corner Badge Hint */}
                  {!isFullscreen && isMobileView && (
                    <div className="absolute bottom-1.5 right-1.5 z-10 bg-black/75 backdrop-blur-xs text-[10px] text-neutral-200 px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/10 pointer-events-none">
                      <Maximize2Icon className="size-2.5" />
                      <span>Ketuk Layar Penuh</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Centered Label below screen card in Desktop Preview mode */}
              {!isFullscreen && !isMobileView && (
                <>
                  <p className="text-xs text-muted-foreground text-center mt-2.5 font-normal select-none">
                    {`${botName}'s screen`}
                  </p>
                  <div className="flex-1 w-full" />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default DaytonaVncViewer;
