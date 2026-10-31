import { tool } from "ai";
import { z } from "zod";
import { AsyncLocalStorage } from "node:async_hooks";
import sharp from "sharp";
import { ensureSandboxActive } from "@/lib/daytona";
import { db, bots } from "@/db";
import { eq } from "drizzle-orm";

export interface MemberBotInfo {
  id: string;
  name: string;
  avatar: string;
  job: string;
  instruction?: string | null;
  sandboxId?: string | null;
}

export interface SandboxContext {
  chatId: string;
  sandboxId?: string | null;
  isGroup?: boolean;
  memberBots?: MemberBotInfo[];
}

export const sandboxContextStorage = new AsyncLocalStorage<SandboxContext>();

export interface HandoffInput {
  targetBotName: string;
  reason: string;
}

export interface HandoffOutput {
  success: boolean;
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

export const handoffTool = tool({
  description:
    "Hand off (delegate) the conversation or task to another teammate bot in this group chat if you determine that the user's prompt or request is better suited for their specific expertise, job role, or instructions.",
  inputSchema: z.object({
    targetBotName: z
      .string()
      .describe(
        "Name of the teammate bot in this group chat to hand off the task to"
      ),
    reason: z
      .string()
      .describe(
        "Clear explanation of why the target bot is better suited to handle the user's request"
      ),
  }),
  execute: async ({ targetBotName, reason }): Promise<HandoffOutput> => {
    const store = sandboxContextStorage.getStore();
    const members = store?.memberBots || [];

    if (!store?.isGroup || members.length <= 1) {
      return {
        success: false,
        error:
          "Handoff is only available in group chats with multiple member bots.",
      };
    }

    const cleanTarget = targetBotName.trim().toLowerCase();
    const targetBot = members.find((m) => {
      const mName = m.name.toLowerCase();
      const mId = m.id.toLowerCase();
      return (
        mName === cleanTarget ||
        mId === cleanTarget ||
        mName.includes(cleanTarget) ||
        cleanTarget.includes(mName)
      );
    });

    if (!targetBot) {
      const availableList = members
        .map((m) => `${m.name} (${m.job})`)
        .join(", ");
      return {
        success: false,
        error: `Bot "${targetBotName}" not found in this group chat. Available teammate bots: ${availableList}`,
      };
    }

    return {
      success: true,
      handedOff: true,
      targetBot: {
        id: targetBot.id,
        name: targetBot.name,
        avatar: targetBot.avatar,
        job: targetBot.job,
      },
      reason,
      message: `Tugas berhasil dialihkan ke ${targetBot.name} (${targetBot.job}). Alasan: ${reason}.`,
    };
  },
});

export async function resolveSandboxForChat(chatId?: string) {
  const store = sandboxContextStorage.getStore();
  let sandboxId = store?.sandboxId;

  if (!sandboxId && (store?.chatId || chatId)) {
    const targetChatId = store?.chatId || chatId;
    if (targetChatId) {
      const [bot] = await db
        .select({ sandboxId: bots.sandboxId })
        .from(bots)
        .where(eq(bots.id, targetChatId))
        .limit(1);
      sandboxId = bot?.sandboxId ?? null;
    }
  }

  if (!sandboxId) {
    throw new Error(
      "No active Daytona sandbox environment associated with this bot/chat."
    );
  }

  return ensureSandboxActive(sandboxId);
}

/**
 * Applies a 0-1000 coordinate grid and red click dot marker onto a raw VNC screenshot buffer.
 */
export async function applyGridAndClickOverlay(
  rawScreenshotBase64: string,
  options?: {
    clickX?: number;
    clickY?: number;
    screenWidth?: number;
    screenHeight?: number;
  }
): Promise<string> {
  const buf = Buffer.from(rawScreenshotBase64, "base64");
  const meta = await sharp(buf).metadata();
  const width = options?.screenWidth || meta.width || 1024;
  const height = options?.screenHeight || meta.height || 768;

  let gridSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Draw vertical grid lines and top ruler (0-1000 scale)
  for (let u = 100; u < 1000; u += 100) {
    const px = Math.round((u / 1000) * width);
    gridSvg += `<line x1="${px}" y1="0" x2="${px}" y2="${height}" stroke="rgba(255,255,255,0.22)" stroke-width="1" stroke-dasharray="3,3"/>`;
    gridSvg += `<rect x="${px - 14}" y="2" width="28" height="13" fill="rgba(0,0,0,0.75)" rx="3"/>`;
    gridSvg += `<text x="${px}" y="12" fill="#00ffcc" font-size="10" font-family="monospace" font-weight="bold" text-anchor="middle">${u}</text>`;
  }

  // Draw horizontal grid lines and left ruler (0-1000 scale)
  for (let v = 100; v < 1000; v += 100) {
    const py = Math.round((v / 1000) * height);
    gridSvg += `<line x1="0" y1="${py}" x2="${width}" y2="${py}" stroke="rgba(255,255,255,0.22)" stroke-width="1" stroke-dasharray="3,3"/>`;
    gridSvg += `<rect x="2" y="${py - 7}" width="28" height="13" fill="rgba(0,0,0,0.75)" rx="3"/>`;
    gridSvg += `<text x="16" y="${py + 3}" fill="#00ffcc" font-size="10" font-family="monospace" font-weight="bold" text-anchor="middle">${v}</text>`;
  }

  // Draw Red circle at last click location (radius: 6px) with high-contrast ring
  if (options?.clickX !== undefined && options?.clickY !== undefined) {
    const cx = options.clickX;
    const cy = options.clickY;
    gridSvg += `<circle cx="${cx}" cy="${cy}" r="10" fill="none" stroke="#ffff00" stroke-width="2"/>`;
    gridSvg += `<circle cx="${cx}" cy="${cy}" r="6" fill="#ff0000" stroke="#ffffff" stroke-width="1.5"/>`;
  }

  gridSvg += `</svg>`;

  const out = await sharp(buf)
    .resize(width, height)
    .composite([{ input: Buffer.from(gridSvg), top: 0, left: 0 }])
    .jpeg({ quality: 75 })
    .toBuffer();

  return out.toString("base64");
}

/**
 * Tool 1: bash_exec
 * Direct background container execution with timeout handling.
 */
export const bashExecTool = tool({
  description:
    "Execute a bash / terminal command directly inside the Linux container sandbox in the background without VNC. Returns stdout, stderr, and exitCode. Use this for ALL terminal commands, installing packages (apt/npm/pip), building projects, running tests, checking processes, git commands, and starting background servers.",
  inputSchema: z.object({
    command: z.string().describe("The bash command line to execute"),
    cwd: z
      .string()
      .optional()
      .describe("Working directory path (default is sandbox workspace)"),
    env: z
      .record(z.string(), z.string())
      .optional()
      .describe("Optional environment variables key-value map"),
    timeout: z
      .number()
      .optional()
      .default(120)
      .describe("Timeout in seconds (default: 120)"),
  }),
  execute: async ({ command, cwd, env, timeout }) => {
    try {
      const sandbox = await resolveSandboxForChat();
      const timeoutSec = timeout ?? 120;

      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<{
        exitCode: number;
        result: string;
        timedOut: boolean;
      }>((resolve) => {
        timeoutId = setTimeout(() => {
          resolve({
            exitCode: 124,
            result: `Command timed out after ${timeoutSec} seconds.`,
            timedOut: true,
          });
        }, timeoutSec * 1000);
      });

      const execPromise = sandbox.process
        .executeCommand(command, cwd, env, timeoutSec)
        .then((res) => {
          if (timeoutId) clearTimeout(timeoutId);
          return {
            exitCode: res.exitCode,
            result: res.result || "",
            timedOut: false,
          };
        });

      const res = await Promise.race([execPromise, timeoutPromise]);
      const rawStdout = res.result;
      const stdout =
        rawStdout.length > 300000
          ? rawStdout.slice(0, 250000) +
            "\n...[stdout truncated after 250,000 characters]"
          : rawStdout;

      return {
        success: res.exitCode === 0,
        command,
        cwd: cwd ?? "",
        stdout,
        stderr: res.exitCode !== 0 ? stdout : "",
        exitCode: res.exitCode,
        timedOut: res.timedOut ?? false,
      };
    } catch (err) {
      return {
        success: false,
        command,
        cwd: cwd ?? "",
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        exitCode: 1,
        timedOut: false,
      };
    }
  },
});

/**
 * Tool 2: file_system
 * Unified direct filesystem operations (read, write, list).
 */
export const fileSystemTool = tool({
  description:
    "Direct filesystem operations in the sandbox: read file contents, write/update files, or list directory contents without opening text editors or GUI windows in VNC. Use for reading code, modifying files, creating files, or updating MEMORY.md.",
  inputSchema: z.object({
    action: z
      .enum(["read", "write", "list"])
      .describe(
        "Action: 'read' a file, 'write' a file, or 'list' a directory"
      ),
    path: z
      .string()
      .describe(
        "Relative or absolute file or directory path (e.g. 'src/App.tsx', 'MEMORY.md', '.')"
      ),
    content: z
      .string()
      .optional()
      .describe("Full text content to write (required when action is 'write')"),
    depth: z
      .number()
      .optional()
      .default(2)
      .describe("Directory traversal depth when action is 'list' (default: 2)"),
  }),
  execute: async ({ action, path, content, depth }) => {
    try {
      const sandbox = await resolveSandboxForChat();
      if (action === "read") {
        let buffer: Buffer;
        try {
          buffer = await sandbox.fs.downloadFile(path);
        } catch (dlErr) {
          const cleanPath = path.trim().replace(/^\.\//, "");
          if (cleanPath === "MEMORY.md") {
            const empty = Buffer.from("");
            await sandbox.fs.uploadFile(empty, "MEMORY.md");
            return {
              success: true,
              action: "read",
              path,
              content: "",
              size: 0,
            };
          }
          throw dlErr;
        }

        const lower = path.toLowerCase();
        const isImg = /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(lower);
        if (isImg) {
          return {
            success: true,
            action: "read",
            path,
            type: "image",
            size: buffer.length,
            note: `Binary image file (${buffer.length} bytes). Use openImage to view on desktop.`,
          };
        }

        const rawContent = buffer.toString("utf-8");
        const truncated =
          rawContent.length > 400000
            ? rawContent.slice(0, 350000) +
              "\n...[truncated after 350,000 characters]"
            : rawContent;

        return {
          success: true,
          action: "read",
          path,
          content: truncated,
          size: buffer.length,
        };
      } else if (action === "write") {
        const text = content ?? "";
        const buffer = Buffer.from(text, "utf-8");
        await sandbox.fs.uploadFile(buffer, path);
        return {
          success: true,
          action: "write",
          path,
          bytesWritten: buffer.length,
        };
      } else if (action === "list") {
        const targetPath = path || ".";
        const files = await sandbox.fs.listFiles(targetPath, {
          depth: depth ?? 2,
        });
        return {
          success: true,
          action: "list",
          path: targetPath,
          files: files.map((f) => ({
            name: f.name,
            path: f.path,
            isDirectory: Boolean(f.isDir),
            size: f.size,
          })),
        };
      }
      return { success: false, error: `Unknown action "${action}"` };
    } catch (err) {
      return {
        success: false,
        action,
        path,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

/**
 * Tool 3: computer_use
 * Dedicated GUI/VNC automation with 0-1000 normalized coordinates and visual grid overlay.
 */
export const computerUseTool = tool({
  description:
    "GUI automation on the sandbox desktop (VNC screen). Use ONLY for graphical desktop actions: opening browsers, testing web UI, inspecting visual output, or clicking buttons. Coordinates (x, y) MUST be on a 0 to 1000 normalized scale. Every action automatically captures and returns the latest screenshot with a coordinate grid and a red marker indicating the last click position.",
  inputSchema: z.object({
    action: z
      .enum([
        "click",
        "double_click",
        "right_click",
        "type",
        "key",
        "scroll",
        "wait",
      ])
      .describe(
        "Action: 'click', 'double_click', 'right_click', 'type', 'key', 'scroll', or 'wait'"
      ),
    x: z
      .number()
      .min(0)
      .max(1000)
      .optional()
      .describe(
        "Normalized X coordinate (0 to 1000 scale: 0 is left, 1000 is right)"
      ),
    y: z
      .number()
      .min(0)
      .max(1000)
      .optional()
      .describe(
        "Normalized Y coordinate (0 to 1000 scale: 0 is top, 1000 is bottom)"
      ),
    text: z.string().optional().describe("Text to type when action is 'type'"),
    key: z
      .string()
      .optional()
      .describe(
        "Key to press when action is 'key' (e.g. 'enter', 'tab', 'escape', 'backspace', 'c')"
      ),
    modifiers: z
      .array(z.string())
      .optional()
      .describe(
        "Modifier keys to hold down (e.g. ['ctrl'], ['alt'], ['shift'])"
      ),
    direction: z
      .enum(["up", "down", "left", "right"])
      .optional()
      .default("down")
      .describe("Scroll direction (default: 'down')"),
    amount: z.number().optional().default(2).describe("Number of scroll steps"),
    seconds: z
      .number()
      .min(1)
      .max(30)
      .optional()
      .default(5)
      .describe("Seconds to wait when action is 'wait' (default: 5)"),
    reason: z
      .string()
      .optional()
      .describe("Explanation of why you are performing this GUI action"),
  }),
  execute: async ({
    action,
    x,
    y,
    text,
    key,
    modifiers,
    direction,
    amount,
    seconds,
    reason,
  }) => {
    try {
      const sandbox = await resolveSandboxForChat();

      let screenWidth = 1024;
      let screenHeight = 768;
      try {
        const info = await sandbox.computerUse.display.getInfo();
        if (info?.displays?.[0]) {
          screenWidth = info.displays[0].width || 1024;
          screenHeight = info.displays[0].height || 768;
        }
      } catch {}

      let realX: number | undefined;
      let realY: number | undefined;
      if (x !== undefined && y !== undefined) {
        realX = Math.max(
          0,
          Math.min(screenWidth, Math.round((x / 1000) * screenWidth))
        );
        realY = Math.max(
          0,
          Math.min(screenHeight, Math.round((y / 1000) * screenHeight))
        );
      }

      switch (action) {
        case "click":
          if (realX === undefined || realY === undefined) {
            throw new Error(
              "Coordinates x and y are required for 'click' action."
            );
          }
          await sandbox.computerUse.mouse.click(realX, realY, "left");
          break;
        case "double_click":
          if (realX === undefined || realY === undefined) {
            throw new Error(
              "Coordinates x and y are required for 'double_click' action."
            );
          }
          await sandbox.computerUse.mouse.click(realX, realY, "left", true);
          break;
        case "right_click":
          if (realX === undefined || realY === undefined) {
            throw new Error(
              "Coordinates x and y are required for 'right_click' action."
            );
          }
          await sandbox.computerUse.mouse.click(realX, realY, "right");
          break;
        case "type":
          if (!text) {
            throw new Error("Field 'text' is required for 'type' action.");
          }
          await sandbox.computerUse.keyboard.type(text);
          break;
        case "key":
          if (!key) {
            throw new Error("Field 'key' is required for 'key' action.");
          }
          await sandbox.computerUse.keyboard.press(key, modifiers);
          break;
        case "scroll":
          await sandbox.computerUse.mouse.scroll(
            realX ?? Math.round(screenWidth / 2),
            realY ?? Math.round(screenHeight / 2),
            direction ?? "down",
            amount ?? 2
          );
          break;
        case "wait":
          await new Promise((r) => setTimeout(r, (seconds ?? 5) * 1000));
          break;
      }

      await new Promise((r) => setTimeout(r, 300));

      const snap = await sandbox.computerUse.screenshot.takeFullScreen();
      let compositedBase64 = snap.screenshot;
      if (snap.screenshot) {
        try {
          const isClickAction =
            action === "click" ||
            action === "double_click" ||
            action === "right_click";
          compositedBase64 = await applyGridAndClickOverlay(snap.screenshot, {
            clickX: isClickAction ? realX : undefined,
            clickY: isClickAction ? realY : undefined,
            screenWidth,
            screenHeight,
          });
        } catch (overlayErr) {
          console.warn(
            "Grid overlay failed, falling back to raw screenshot:",
            overlayErr
          );
        }
      }

      return {
        success: true,
        action,
        normalized: { x, y },
        realCoordinates: { x: realX, y: realY },
        displayResolution: { width: screenWidth, height: screenHeight },
        screenshot: compositedBase64,
        timestamp: new Date().toISOString(),
        reason: reason || "",
      };
    } catch (err) {
      return {
        success: false,
        action,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
  toModelOutput: ({ output }) => {
    if (output?.screenshot) {
      return {
        type: "content",
        value: [
          {
            type: "text",
            text: `[Desktop Screen after action "${output.action}". Display: ${output.displayResolution?.width ?? 1024}x${output.displayResolution?.height ?? 768}. Grid overlay: 0-1000 scale. Red circle marks last click at (${output.normalized?.x ?? "?"}, ${output.normalized?.y ?? "?"})]:`,
          },
          {
            type: "file",
            mediaType: "image/jpeg",
            data: { type: "data", data: output.screenshot },
          },
        ],
      };
    }
    return {
      type: "text",
      value: output?.error
        ? `GUI action failed: ${output.error}`
        : `Action executed.`,
    };
  },
});

/**
 * Tool 4: finish_task
 * Official completion signal for the agent loop.
 */
export const finishTaskTool = tool({
  description:
    "Signal that the user's task is 100% complete and fully verified. You MUST call this tool as the official conclusion of your work once all instructions, builds, and visual verifications succeed. NEVER conclude without calling this tool.",
  inputSchema: z.object({
    summary: z
      .string()
      .describe(
        "Comprehensive summary of what was completed, verified, and ready for the user"
      ),
  }),
  execute: async ({ summary }) => {
    return {
      success: true,
      finished: true,
      summary,
      timestamp: new Date().toISOString(),
    };
  },
});

/**
 * Legacy & backwards-compatible tool definitions:
 */
export const openImageTool = tool({
  description:
    "Open and display an image file on the sandbox's GUI desktop screen (Display :0) so it appears in the live VNC desktop preview.",
  inputSchema: z.object({
    path: z
      .string()
      .describe(
        "Path to the image file in the sandbox (e.g. '/home/daytona/uploads/image.jpg')"
      ),
  }),
  execute: async ({ path: imagePath }) => {
    try {
      const sandbox = await resolveSandboxForChat();
      const cleanPath = imagePath.trim();
      const res = await sandbox.process.executeCommand(
        `open-image "${cleanPath}" || (DISPLAY=:0 feh --scale-down -B black -g 900x700 "${cleanPath}" >/dev/null 2>&1 & echo "feh started")`
      );
      return {
        success: true,
        path: cleanPath,
        output:
          res.result.trim() ||
          "Gambar berhasil dibuka di layar desktop sandbox.",
      };
    } catch (err) {
      return {
        success: false,
        path: imagePath,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

export const showScreenTool = tool({
  description:
    "Capture and display the current sandbox desktop screen to the user in the chat UI. Use this whenever the user asks to see what is on screen, or when you want to present the graphical result of your work to the user.",
  inputSchema: z.object({
    caption: z
      .string()
      .optional()
      .describe("Optional title or description of what is shown on screen"),
  }),
  execute: async ({ caption }) => {
    try {
      const sandbox = await resolveSandboxForChat();
      const snap = await sandbox.computerUse.screenshot.takeFullScreen();
      return {
        success: true,
        caption: caption || "Sandbox Desktop Screen",
        screenshot: snap.screenshot,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        caption,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
  toModelOutput: ({ output }) => {
    if (output?.success) {
      return {
        type: "text",
        value: `[Screenshot "${output.caption || "Sandbox Desktop"}" captured and displayed to user in chat UI at ${output.timestamp}.]`,
      };
    }
    return {
      type: "text",
      value: output?.error || "Failed to capture screen.",
    };
  },
});

export const viewScreenTool = tool({
  description:
    "Capture a desktop screenshot of the sandbox computer screen with 0-1000 coordinate grid overlay for visual inspection.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const sandbox = await resolveSandboxForChat();
      let screenWidth = 1024;
      let screenHeight = 768;
      try {
        const info = await sandbox.computerUse.display.getInfo();
        if (info?.displays?.[0]) {
          screenWidth = info.displays[0].width || 1024;
          screenHeight = info.displays[0].height || 768;
        }
      } catch {}

      const snap = await sandbox.computerUse.screenshot.takeFullScreen();
      let compressed = snap.screenshot;
      if (snap.screenshot) {
        try {
          compressed = await applyGridAndClickOverlay(snap.screenshot, {
            screenWidth,
            screenHeight,
          });
        } catch {
          const buf = Buffer.from(snap.screenshot, "base64");
          const out = await sharp(buf)
            .resize(screenWidth, screenHeight, { fit: "inside" })
            .jpeg({ quality: 65 })
            .toBuffer();
          compressed = out.toString("base64");
        }
      }

      return {
        success: true,
        screenshot: compressed,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
  toModelOutput: ({ output }) => {
    if (output?.screenshot) {
      return {
        type: "content",
        value: [
          {
            type: "text",
            text: `[Desktop Screenshot captured at ${output.timestamp}. Grid: 0-1000]:`,
          },
          {
            type: "file",
            mediaType: "image/jpeg",
            data: { type: "data", data: output.screenshot },
          },
        ],
      };
    }
    return {
      type: "text",
      value: output?.error || "Failed to capture screen.",
    };
  },
});

export const waitTool = tool({
  description:
    "Wait or pause execution for a given duration (in seconds, default: 5) to allow background terminal commands, compiling/installing processes, or GUI page loading to finish.",
  inputSchema: z.object({
    duration: z
      .number()
      .optional()
      .default(5)
      .describe("Duration to wait in seconds (default: 5, range: 1 to 30)"),
    reason: z
      .string()
      .optional()
      .describe("Brief explanation of why you are waiting"),
  }),
  execute: async ({ duration, reason }) => {
    const waitSec = Math.min(Math.max(duration ?? 5, 1), 30);
    await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
    return {
      success: true,
      duration: waitSec,
      reason: reason || "Waited for process or screen to update",
    };
  },
});

export const readFileTool = tool({
  description: "Legacy read file tool",
  inputSchema: z.object({ path: z.string() }),
  execute: async ({ path }) => {
    return fileSystemTool.execute(
      { action: "read", path, depth: 2 },
      {} as never
    );
  },
});

export const writeFileTool = tool({
  description: "Legacy write file tool",
  inputSchema: z.object({ path: z.string(), content: z.string() }),
  execute: async ({ path, content }) => {
    return fileSystemTool.execute(
      { action: "write", path, content, depth: 2 },
      {} as never
    );
  },
});

export const listFilesTool = tool({
  description: "Legacy list files tool",
  inputSchema: z.object({
    path: z.string().optional(),
    depth: z.number().optional(),
  }),
  execute: async ({ path, depth }) => {
    return fileSystemTool.execute(
      { action: "list", path: path || ".", depth: depth ?? 2 },
      {} as never
    );
  },
});

export const bashTool = bashExecTool;

export const mouseClickTool = tool({
  description: "Legacy click tool mapped to normalized coordinates",
  inputSchema: z.object({
    x: z.number(),
    y: z.number(),
    button: z.enum(["left", "right", "middle"]).optional().default("left"),
    double: z.boolean().optional().default(false),
  }),
  execute: async ({ x, y, button, double }) => {
    const action = double
      ? "double_click"
      : button === "right"
      ? "right_click"
      : "click";
    const normX = x > 1000 ? Math.round((x / 1024) * 1000) : x;
    const normY = y > 1000 ? Math.round((y / 768) * 1000) : y;
    return computerUseTool.execute(
      {
        action,
        x: normX,
        y: normY,
        direction: "down",
        amount: 2,
        seconds: 5,
      },
      {} as never
    );
  },
});

export const mouseScrollTool = tool({
  description: "Legacy scroll tool",
  inputSchema: z.object({
    x: z.number(),
    y: z.number(),
    direction: z.enum(["up", "down", "left", "right"]),
    amount: z.number().optional().default(2),
  }),
  execute: async ({ x, y, direction, amount }) => {
    const normX = x > 1000 ? Math.round((x / 1024) * 1000) : x;
    const normY = y > 1000 ? Math.round((y / 768) * 1000) : y;
    return computerUseTool.execute(
      {
        action: "scroll",
        x: normX,
        y: normY,
        direction,
        amount,
        seconds: 5,
      },
      {} as never
    );
  },
});

export const mouseMoveTool = tool({
  description: "Legacy mouse move tool",
  inputSchema: z.object({ x: z.number(), y: z.number() }),
  execute: async ({ x, y }) => {
    const sandbox = await resolveSandboxForChat();
    await sandbox.computerUse.mouse.move(x, y);
    return { success: true, x, y };
  },
});

export const keyboardTypeTool = tool({
  description: "Legacy keyboard type tool",
  inputSchema: z.object({ text: z.string(), delay: z.number().optional() }),
  execute: async ({ text }) => {
    return computerUseTool.execute(
      { action: "type", text, direction: "down", amount: 2, seconds: 5 },
      {} as never
    );
  },
});

export const keyboardPressTool = tool({
  description: "Legacy keyboard press tool",
  inputSchema: z.object({
    key: z.string(),
    modifiers: z.array(z.string()).optional(),
  }),
  execute: async ({ key, modifiers }) => {
    return computerUseTool.execute(
      { action: "key", key, modifiers, direction: "down", amount: 2, seconds: 5 },
      {} as never
    );
  },
});

export const getDisplayInfoTool = tool({
  description: "Get display resolution",
  inputSchema: z.object({}),
  execute: async () => {
    const sandbox = await resolveSandboxForChat();
    const info = await sandbox.computerUse.display.getInfo();
    return { success: true, displays: info.displays };
  },
});

/**
 * The unified sandboxTools object exposed to AI SDK and Trigger.dev agents.
 */
export const sandboxTools = {
  // Primary Refactored Tools
  bash_exec: bashExecTool,
  file_system: fileSystemTool,
  computer_use: computerUseTool,
  finish_task: finishTaskTool,

  // Collaboration & Presentation Tools
  handoff: handoffTool,
  showScreen: showScreenTool,

  // Backwards-compatibility aliases
  bash: bashExecTool,
  readFile: readFileTool,
  writeFile: writeFileTool,
  listFiles: listFilesTool,
  openImage: openImageTool,
  wait: waitTool,
  viewScreen: viewScreenTool,
  mouseClick: mouseClickTool,
  mouseScroll: mouseScrollTool,
  mouseMove: mouseMoveTool,
  keyboardType: keyboardTypeTool,
  keyboardPress: keyboardPressTool,
  getDisplayInfo: getDisplayInfoTool,
};
