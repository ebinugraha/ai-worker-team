"use client";

import * as React from "react";
import {
  FolderArchiveIcon,
  ImageIcon,
  FileCodeIcon,
  FileTextIcon,
  FileIcon,
  XIcon,
  UploadCloudIcon,
  DownloadIcon,
  EyeIcon,
  ZoomInIcon,
  ZoomOutIcon,
  RotateCcwIcon,
} from "lucide-react";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFileSize } from "@/lib/attachment-utils";
import { cn } from "@/lib/utils";

export interface PendingAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  isImage: boolean;
  isZip: boolean;
  previewUrl?: string; // object URL or data URL
  width?: number;
  height?: number;
  uploadStatus?: "idle" | "uploading" | "done" | "error";
  error?: string;
}

export interface StoredAttachmentMeta {
  id?: string;
  name: string;
  size: number | string;
  type: "image" | "zip" | "code" | "file";
  url: string;
  sandboxPath?: string;
  extractedPath?: string;
  fileCount?: number;
}

/**
 * Returns icon and category for a file name and MIME type
 */
export function getFileTypeCategory(fileName: string, mimeType: string): {
  type: "image" | "zip" | "code" | "file";
  icon: React.ElementType;
} {
  const lowerName = fileName.toLowerCase();
  if (
    mimeType.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(lowerName)
  ) {
    return { type: "image", icon: ImageIcon };
  }
  if (
    mimeType.includes("zip") ||
    lowerName.endsWith(".zip") ||
    mimeType === "application/x-zip-compressed"
  ) {
    return { type: "zip", icon: FolderArchiveIcon };
  }
  if (
    /\.(ts|tsx|js|jsx|json|py|html|css|scss|sql|sh|rs|go|c|cpp|php)$/i.test(
      lowerName
    )
  ) {
    return { type: "code", icon: FileCodeIcon };
  }
  if (/\.(txt|md|doc|docx|pdf|csv|rtf)$/i.test(lowerName)) {
    return { type: "file", icon: FileTextIcon };
  }
  return { type: "file", icon: FileIcon };
}

/**
 * Clean thumbnails strip rendered right above composer textarea without distracting banners
 */
export function ComposerAttachmentStrip({
  attachments,
  onRemove,
  disabled,
}: {
  attachments: PendingAttachment[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin select-none">
      {attachments.map((att) => {
        const { icon: FileTypeIcon } = getFileTypeCategory(att.name, att.type);

        return (
          <div
            key={att.id}
            className="relative group shrink-0 transition-transform duration-150"
          >
            {att.isImage && att.previewUrl ? (
              // Image thumbnail preview (ChatGPT/Gemini style)
              <div className="relative size-14 rounded-xl overflow-hidden border border-neutral-700/80 bg-neutral-950 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.previewUrl}
                  alt={att.name}
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors" />
                <div className="absolute bottom-0 inset-x-0 bg-neutral-950/85 text-[9px] text-neutral-300 px-1 py-0.5 truncate text-center font-mono">
                  {formatFileSize(att.size)}
                </div>
              </div>
            ) : (
              // Non-image file pill (ZIP, Code, Document)
              <div
                className={cn(
                  "flex items-center gap-2 h-14 px-3 rounded-xl border bg-neutral-950/90 shadow-sm max-w-[220px]",
                  att.isZip
                    ? "border-amber-600/40 text-amber-200"
                    : "border-neutral-700/80 text-neutral-200"
                )}
              >
                <div
                  className={cn(
                    "size-8 rounded-lg flex items-center justify-center shrink-0",
                    att.isZip
                      ? "bg-amber-950/70 text-amber-400 border border-amber-800/50"
                      : "bg-neutral-800/90 text-neutral-300 border border-neutral-700/50"
                  )}
                >
                  <FileTypeIcon className="size-4" />
                </div>
                <div className="flex flex-col min-w-0 flex-1 leading-tight">
                  <span className="text-xs font-medium text-neutral-200 truncate">
                    {att.name}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono mt-0.5">
                    {att.isZip ? "ZIP Archive • " : ""}
                    {formatFileSize(att.size)}
                  </span>
                </div>
              </div>
            )}

            {/* Remove button (X) */}
            <button
              type="button"
              onClick={() => onRemove(att.id)}
              disabled={disabled}
              className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-neutral-800 hover:bg-rose-950 hover:text-rose-300 text-neutral-300 flex items-center justify-center border border-neutral-600 shadow-md transition-all cursor-pointer z-10"
              title={`Hapus ${att.name}`}
            >
              <XIcon className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Drag and drop visual overlay on the chat window
 */
export function ChatDropzoneOverlay({ isDragging }: { isDragging: boolean }) {
  if (!isDragging) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none p-4 flex items-center justify-center bg-neutral-950/70 backdrop-blur-xs transition-all">
      <div className="w-full h-full max-w-xl max-h-72 border-2 border-dashed border-primary/70 rounded-3xl bg-neutral-900/90 flex flex-col items-center justify-center gap-3 p-6 text-center shadow-2xl animate-in fade-in-50 zoom-in-95">
        <div className="size-16 rounded-2xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shadow-inner">
          <UploadCloudIcon className="size-8 animate-bounce" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-neutral-100">
            Lepaskan file di sini untuk mengunggah
          </h3>
          <p className="text-xs text-neutral-400 max-w-xs">
            Mendukung file ZIP (diekstrak ke Sandbox), Gambar/Screenshot,
            Dokumen, dan Kode.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Parse attachments JSON tag: <!--attachments:[...]--> and strips any internal
 * prompt context tags so user chat bubbles never show unwanted metadata.
 */
export function extractAttachmentsFromText(text: string): {
  cleanText: string;
  attachments: StoredAttachmentMeta[];
} {
  const match = text.match(/<!--attachments:(.*?)-->/);
  let parsed: StoredAttachmentMeta[] = [];
  if (match) {
    try {
      parsed = JSON.parse(match[1]) as StoredAttachmentMeta[];
    } catch {
      // ignore
    }
  }

  // Strip both <!--attachments:...--> AND any [LAMPIRAN PENGGUNA] metadata blocks
  let cleanText = text
    .replace(/<!--attachments:[\s\S]*?-->/g, "")
    .replace(/\[LAMPIRAN PENGGUNA\][\s\S]*?(?=<!--attachments:|$)/g, "")
    .replace(/^\[LAMPIRAN PENGGUNA\][\s\S]*$/gm, "")
    .replace(/🖼️ Gambar \/ Screenshot:[^\n]*/g, "")
    .replace(/📦 File Arsip ZIP:[^\n]*/g, "")
    .replace(/📄 File:[^\n]*/g, "")
    .replace(/^- Tersimpan di Sandbox:[^\n]*/gm, "")
    .replace(/^- Diekstrak ke direktori:[^\n]*/gm, "")
    .replace(/^- File dalam arsip:[^\n]*/gm, "")
    .trim();

  // If text was only the fallback prompt when sending images without caption, omit completely
  if (cleanText === "Tolong periksa dan analisis lampiran yang saya kirimkan.") {
    cleanText = "";
  }

  return { cleanText, attachments: parsed };
}

/**
 * Interactive Image Lightbox with Zoom In, Zoom Out, Reset, and Large Viewport
 */
function ImageLightboxModal({
  item,
  onClose,
}: {
  item: StoredAttachmentMeta | null;
  onClose: () => void;
}) {
  const [scale, setScale] = React.useState(1.0);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(Math.round((prev + 0.25) * 100) / 100, 4.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(Math.round((prev - 0.25) * 100) / 100, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaY) > 0) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  if (!item) return null;

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[96vw] w-[96vw] h-[93vh] max-h-[93vh] p-0 bg-neutral-950/98 border border-neutral-800 text-neutral-100 flex flex-col rounded-2xl shadow-2xl overflow-hidden focus:outline-none">
        <DialogHeader className="px-4 py-2.5 border-b border-neutral-800/80 flex flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ImageIcon className="size-4 text-neutral-400 shrink-0" />
            <DialogTitle className="text-xs sm:text-sm font-medium text-neutral-200 truncate max-w-[280px] sm:max-w-md">
              {item.name}
            </DialogTitle>
            <span className="text-[11px] text-neutral-500 font-mono hidden sm:inline">
              ({typeof item.size === "number" ? formatFileSize(item.size) : item.size})
            </span>
          </div>

          {/* Interactive Zoom & Download Controls */}
          <div className="flex items-center gap-1.5 pr-8">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOutIcon className="size-4" />
            </button>

            <span className="text-xs font-mono px-2 py-1 bg-neutral-900 border border-neutral-800/80 rounded-md text-neutral-300 select-none min-w-[50px] text-center">
              {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 4.0}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomInIcon className="size-4" />
            </button>

            {scale !== 1.0 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs transition-colors cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcwIcon className="size-3" />
                <span>Reset</span>
              </button>
            )}

            <a
              href={item.url}
              download={item.name}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer ml-1"
              title="Unduh Gambar"
            >
              <DownloadIcon className="size-4" />
            </a>
          </div>
        </DialogHeader>

        {/* Viewport for large image preview with zoom scale */}
        <div
          onWheel={handleWheel}
          className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-4 sm:p-6 bg-neutral-950/90 relative select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt={item.name}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center center",
              transition: "transform 0.12s ease-out",
            }}
            className="max-h-[82vh] max-w-full w-auto object-contain rounded-lg shadow-xl"
            draggable={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Render attachments inside user chat bubble or bot response
 */
export function MessageAttachmentsView({
  attachments,
}: {
  attachments: StoredAttachmentMeta[];
}) {
  const [activeImage, setActiveImage] = React.useState<StoredAttachmentMeta | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-3 my-2">
        {attachments.map((att, idx) => {
          const { icon: FileTypeIcon } = getFileTypeCategory(
            att.name,
            att.type === "image"
              ? "image/png"
              : att.type === "zip"
              ? "application/zip"
              : "text/plain"
          );

          if (att.type === "image") {
            return (
              <div
                key={idx}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-neutral-700/80 bg-neutral-950/90 shadow-md transition-all hover:border-neutral-500 hover:shadow-lg"
                onClick={() => setActiveImage(att)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.url}
                  alt={att.name}
                  className="h-40 sm:h-52 w-64 sm:w-80 object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="size-9 rounded-full bg-neutral-900/90 text-white flex items-center justify-center shadow-lg border border-neutral-700/70">
                    <EyeIcon className="size-4" />
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-neutral-950/90 px-2.5 py-1.5 flex items-center justify-between text-[11px] text-neutral-300 border-t border-neutral-800/80">
                  <span className="truncate max-w-[140px] font-medium">
                    {att.name}
                  </span>
                  <span className="font-mono text-neutral-400 text-[10px]">
                    {typeof att.size === "number"
                      ? formatFileSize(att.size)
                      : att.size}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <Attachment
              key={idx}
              size="sm"
              className={cn(
                "bg-neutral-950/80 border text-neutral-200 shadow-sm",
                att.type === "zip"
                  ? "border-amber-600/40 hover:border-amber-500"
                  : "border-neutral-700/80 hover:border-neutral-600"
              )}
            >
              <AttachmentMedia
                className={cn(
                  att.type === "zip"
                    ? "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                    : "bg-neutral-800/80 text-neutral-300 border border-neutral-700/50"
                )}
              >
                <FileTypeIcon className="size-4" />
              </AttachmentMedia>
              <AttachmentContent className="pr-2">
                <AttachmentTitle className="text-xs text-neutral-200 max-w-[140px] truncate">
                  {att.name}
                </AttachmentTitle>
                <AttachmentDescription className="text-[10px] text-neutral-400 font-mono">
                  {att.type === "zip"
                    ? `ZIP Archive • ${
                        typeof att.size === "number"
                          ? formatFileSize(att.size)
                          : att.size
                      }`
                    : typeof att.size === "number"
                    ? formatFileSize(att.size)
                    : att.size}
                  {att.fileCount ? ` • ${att.fileCount} files` : ""}
                </AttachmentDescription>
              </AttachmentContent>
              <a
                href={att.url}
                download={att.name}
                target="_blank"
                rel="noreferrer"
                className="size-7 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 flex items-center justify-center transition-colors shrink-0 ml-1"
                title={`Unduh ${att.name}`}
              >
                <DownloadIcon className="size-3.5" />
              </a>
            </Attachment>
          );
        })}
      </div>

      {/* Interactive Lightbox Modal with Zoom Controls */}
      <ImageLightboxModal
        key={activeImage?.url || "lightbox"}
        item={activeImage}
        onClose={() => setActiveImage(null)}
      />
    </>
  );
}
