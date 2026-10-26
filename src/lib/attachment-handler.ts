import { promises as fs } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { db, bots, chatMembers } from "@/db";
import { eq } from "drizzle-orm";
import { getDaytonaClient } from "@/lib/daytona";

export interface UploadedAttachmentResult {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  isImage: boolean;
  isZip: boolean;
  isPdf?: boolean;
  fileCount?: number;
  fileList?: string[];
  sandboxPath?: string;
  extractedPath?: string;
  previewText?: string;
  imageOcrText?: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function processAttachmentBuffer({
  buffer,
  originalName,
  mimeType,
  botId,
}: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  botId: string | null;
}): Promise<ActionResult<UploadedAttachmentResult>> {
  try {
    const isImage = mimeType.startsWith("image/");
    const isZip =
      mimeType.includes("zip") ||
      originalName.toLowerCase().endsWith(".zip") ||
      mimeType === "application/x-zip-compressed";
    const isPdf =
      mimeType === "application/pdf" ||
      originalName.toLowerCase().endsWith(".pdf");

    // Ensure uploads directory exists in public folder
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate safe unique filename
    const timestamp = Date.now();
    const cleanBase = originalName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-60);
    const uniqueFileName = `${timestamp}-${cleanBase}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    // Save to disk
    await fs.writeFile(filePath, buffer);
    const publicUrl = `/uploads/${uniqueFileName}`;

    let fileCount: number | undefined;
    let fileList: string[] | undefined;
    let previewText: string | undefined;
    let imageOcrText: string | undefined;
    let sandboxPath: string | undefined;
    let extractedPath: string | undefined;

    // 1. Handle PDF Documents: extract full readable text via pdf-parse
    if (isPdf) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PDFParse } = require("pdf-parse");
        const parser = new PDFParse({ data: buffer });
        const res = await parser.getText();
        await parser.destroy();
        const extracted = res.text?.trim();
        if (extracted) {
          // Provide up to 25,000 characters of clean text for AI comprehension
          previewText = extracted.slice(0, 25000);
        }
      } catch (pdfErr) {
        console.warn("Failed to parse PDF document:", pdfErr);
      }
    }

    // 2. Handle Text / Code / Markdown / CSV / JSON files: read text content
    const isTextFile =
      mimeType.startsWith("text/") ||
      mimeType.includes("json") ||
      mimeType.includes("javascript") ||
      mimeType.includes("typescript") ||
      /\.(txt|md|py|js|ts|tsx|jsx|json|yaml|yml|csv|html|css|sql|sh|env)$/i.test(
        originalName
      );

    if (isTextFile && !isPdf && buffer.length < 2000000) {
      try {
        const raw = buffer.toString("utf-8");
        previewText = raw.slice(0, 25000);
      } catch {
        // ignore encoding errors
      }
    }

    // 3. Handle Images / Screenshots: provide metadata
    if (isImage) {
      // Basic image metadata is handled without spawning external node worker threads
    }

    // 4. Handle ZIP files: inspect archive contents with JSZip
    if (isZip) {
      try {
        const zip = await JSZip.loadAsync(buffer);
        const allEntries = Object.keys(zip.files).filter(
          (name) => !name.startsWith("__MACOSX/") && !name.endsWith(".DS_Store")
        );
        fileCount = allEntries.length;
        fileList = allEntries.slice(0, 35);

        // Check if there is a README or package.json to read as preview
        const readmeKey = allEntries.find((k) =>
          /^readme\.md$/i.test(path.basename(k))
        );
        if (readmeKey) {
          const readmeText = await zip.file(readmeKey)?.async("string");
          if (readmeText) {
            previewText = `[README dari ${readmeKey}]:\n${readmeText.slice(0, 4000)}`;
          }
        }
      } catch (zipErr) {
        console.warn("Failed to inspect zip entries with JSZip:", zipErr);
      }
    }

    // 5. If a botId is provided, upload directly to the bot's Daytona sandbox
    if (botId) {
      try {
        let targetSandboxId: string | null = null;

        // Check if botId is directly a bot ID
        const [bot] = await db
          .select({
            id: bots.id,
            sandboxId: bots.sandboxId,
          })
          .from(bots)
          .where(eq(bots.id, botId))
          .limit(1);

        if (bot?.sandboxId) {
          targetSandboxId = bot.sandboxId;
        } else {
          // If botId is a group chatId, find any member bot with an active sandbox
          const membersWithSandbox = await db
            .select({
              sandboxId: bots.sandboxId,
            })
            .from(chatMembers)
            .innerJoin(bots, eq(chatMembers.botId, bots.id))
            .where(eq(chatMembers.chatId, botId))
            .limit(1);

          if (membersWithSandbox[0]?.sandboxId) {
            targetSandboxId = membersWithSandbox[0].sandboxId;
          }
        }

        if (targetSandboxId) {
          const daytona = getDaytonaClient();
          const sandbox = await daytona.get(targetSandboxId);

          if (sandbox.state === "stopped") {
            await sandbox.start();
          }

          const targetSandboxFile = `/home/daytona/uploads/${uniqueFileName}`;
          await sandbox.process.executeCommand("mkdir -p /home/daytona/uploads");
          await sandbox.fs.uploadFile(buffer, targetSandboxFile);
          sandboxPath = targetSandboxFile;

          // If ZIP archive, auto-extract inside the sandbox workspace
          if (isZip) {
            const dirName = uniqueFileName.replace(/\.zip$/i, "");
            const targetDir = `/home/daytona/uploads/${dirName}`;
            await sandbox.process.executeCommand(
              `mkdir -p "${targetDir}" && unzip -q -o "${targetSandboxFile}" -d "${targetDir}"`
            );
            extractedPath = targetDir;
          }
        }
      } catch (sandboxErr) {
        console.warn("Could not sync file to Daytona sandbox:", sandboxErr);
      }
    }

    return {
      success: true,
      data: {
        id: uniqueFileName,
        name: originalName,
        size: buffer.length,
        mimeType,
        url: publicUrl,
        isImage,
        isZip,
        isPdf,
        fileCount,
        fileList,
        sandboxPath,
        extractedPath,
        previewText,
        imageOcrText,
      },
    };
  } catch (err) {
    console.error("Error in processAttachmentBuffer:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to process attachment",
    };
  }
}

export async function processAttachmentUpload(
  file: File,
  botId: string | null
): Promise<ActionResult<UploadedAttachmentResult>> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    return await processAttachmentBuffer({
      buffer,
      originalName: file.name || "attachment",
      mimeType: file.type || "application/octet-stream",
      botId,
    });
  } catch (err) {
    console.error("Error in processAttachmentUpload:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to process attachment",
    };
  }
}
