/**
 * Client-side utility for compressing images and formatting file metadata.
 * Minimizes payload sizes and LLM token consumption.
 */

export interface CompressedImageResult {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

/**
 * Compresses an image client-side to maximum dimensions and reduced JPEG quality.
 * Reduces 5-10MB screenshots down to ~30-60KB without visible quality loss for vision LLMs.
 */
export async function compressImageClientSide(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    // If SVG or gif, return as-is without canvas re-compression
    if (file.type === "image/svg+xml" || file.type === "image/gif") {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          file,
          dataUrl: e.target?.result as string,
          width: 0,
          height: 0,
          originalSize: file.size,
          compressedSize: file.size,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({
            file,
            dataUrl: e.target?.result as string,
            width,
            height,
            originalSize: file.size,
            compressedSize: file.size,
          });
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const safeName = file.name.replace(/\.[^.]+$/, ".jpg");
              const compressedFile = new File([blob], safeName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve({
                file: compressedFile,
                dataUrl,
                width,
                height,
                originalSize: file.size,
                compressedSize: blob.size,
              });
            } else {
              resolve({
                file,
                dataUrl,
                width,
                height,
                originalSize: file.size,
                compressedSize: file.size,
              });
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
