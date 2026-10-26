import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  processAttachmentBuffer,
  processAttachmentUpload,
} from "@/lib/attachment-handler";

export const maxDuration = 120; // 2 minutes timeout for large 50-100MB uploads

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 1. Direct binary streaming mode via headers (supports files > 20MB without multipart parsing overhead)
    const rawFileName = req.headers.get("x-filename");
    if (rawFileName) {
      const originalName = decodeURIComponent(rawFileName);
      const botId = req.headers.get("x-bot-id") || null;
      const mimeType =
        req.headers.get("content-type") || "application/octet-stream";

      const arrayBuf = await req.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      if (buffer.length === 0) {
        return NextResponse.json(
          { success: false, error: "Empty file body provided" },
          { status: 400 }
        );
      }

      const result = await processAttachmentBuffer({
        buffer,
        originalName,
        mimeType,
        botId,
      });
      return NextResponse.json(result);
    }

    // 2. Fallback: multipart/form-data parsing
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const botId = formData.get("botId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const result = await processAttachmentUpload(file, botId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("API /api/upload error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to upload file via /api/upload",
      },
      { status: 500 }
    );
  }
}
