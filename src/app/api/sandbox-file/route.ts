import { NextResponse } from "next/server";
import path from "node:path";
import { auth } from "@clerk/nextjs/server";
import { db, bots } from "@/db";
import { eq, and } from "drizzle-orm";
import { ensureSandboxActive } from "@/lib/daytona";

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ts": "text/plain; charset=utf-8",
  ".tsx": "text/plain; charset=utf-8",
  ".js": "text/plain; charset=utf-8",
  ".py": "text/plain; charset=utf-8",
};

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path")?.trim();
    const botId = searchParams.get("botId")?.trim();
    const sandboxIdParam = searchParams.get("sandboxId")?.trim();

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: "Parameter 'path' wajib diisi." },
        { status: 400 }
      );
    }

    // Resolve and verify ownership of the bot / sandbox
    let targetSandboxId: string | null = null;

    if (sandboxIdParam) {
      const [owned] = await db
        .select({ sandboxId: bots.sandboxId })
        .from(bots)
        .where(and(eq(bots.sandboxId, sandboxIdParam), eq(bots.userId, userId)))
        .limit(1);
      targetSandboxId = owned?.sandboxId ?? null;
    } else if (botId) {
      const [owned] = await db
        .select({ sandboxId: bots.sandboxId })
        .from(bots)
        .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
        .limit(1);
      targetSandboxId = owned?.sandboxId ?? null;
    }

    if (!targetSandboxId) {
      return NextResponse.json(
        {
          success: false,
          error: "Sandbox tidak ditemukan atau Anda tidak memiliki akses.",
        },
        { status: 403 }
      );
    }

    const sandbox = await ensureSandboxActive(targetSandboxId);
    const fileBuffer = await sandbox.fs.downloadFile(filePath);
    const fileName = path.basename(filePath) || "download";
    const ext = path.extname(fileName).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileBuffer.length),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (err: unknown) {
    console.error("Failed to download file from sandbox:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Gagal mengunduh berkas dari sandbox.",
      },
      { status: 500 }
    );
  }
}

