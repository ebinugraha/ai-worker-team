import { tool } from "ai";
import { z } from "zod";
import { AsyncLocalStorage } from "node:async_hooks";
import sharp from "sharp";
import { getDaytonaClient } from "@/lib/daytona";
import { db, bots } from "@/db";
import { eq } from "drizzle-orm";

export interface SandboxContext {
  chatId: string;
  sandboxId?: string | null;
}

export const sandboxContextStorage = new AsyncLocalStorage<SandboxContext>();

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

  const daytona = getDaytonaClient();
  return await daytona.get(sandboxId);
}

export const bashTool = tool({
  description:
    "Execute a bash / terminal command inside the bot's Daytona sandbox environment. Returns stdout and exitCode.",
  inputSchema: z.object({
    command: z.string().describe("The bash command to run in the sandbox"),
    cwd: z.string().optional().describe("Optional working directory path"),
  }),
  execute: async ({ command, cwd }) => {
    try {
      const sandbox = await resolveSandboxForChat();
      const res = await sandbox.process.executeCommand(command, cwd);
      const rawStdout = res.result || "";
      const stdout =
        rawStdout.length > 25000
          ? rawStdout.slice(0, 20000) + "\n...[stdout truncated to conserve tokens]"
          : rawStdout;
      return {
        success: res.exitCode === 0,
        command,
        cwd: cwd ?? "",
        stdout,
        exitCode: res.exitCode,
      };
    } catch (err) {
      return {
        success: false,
        command,
        cwd: cwd ?? "",
        error: err instanceof Error ? err.message : String(err),
        exitCode: 1,
      };
    }
  },
});

export const readFileTool = tool({
  description:
    "Read the text content of a file located in the sandbox filesystem.",
  inputSchema: z.object({
    path: z.string().describe("Relative or absolute file path to read"),
  }),
  execute: async ({ path }) => {
    try {
      const sandbox = await resolveSandboxForChat();
      const buffer = await sandbox.fs.downloadFile(path);
      const rawContent = buffer.toString("utf-8");
      const content =
        rawContent.length > 25000
          ? rawContent.slice(0, 20000) + "\n...[file content truncated to conserve tokens]"
          : rawContent;
      return {
        success: true,
        path,
        content,
        size: buffer.length,
      };
    } catch (err) {
      return {
        success: false,
        path,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

export const writeFileTool = tool({
  description:
    "Write or overwrite text content to a file in the sandbox filesystem.",
  inputSchema: z.object({
    path: z.string().describe("Target file path to write to"),
    content: z.string().describe("Full text content to write into the file"),
  }),
  execute: async ({ path, content }) => {
    try {
      const sandbox = await resolveSandboxForChat();
      const buffer = Buffer.from(content, "utf-8");
      await sandbox.fs.uploadFile(buffer, path);
      return {
        success: true,
        path,
        bytesWritten: buffer.length,
      };
    } catch (err) {
      return {
        success: false,
        path,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

export const listFilesTool = tool({
  description:
    "List directory entries and files in the sandbox filesystem with size and type info.",
  inputSchema: z.object({
    path: z
      .string()
      .optional()
      .default(".")
      .describe("Directory path to list (default: '.')"),
    depth: z
      .number()
      .optional()
      .default(1)
      .describe("Depth of recursive directory traversal (default: 1)"),
  }),
  execute: async ({ path, depth }) => {
    try {
      const targetPath = path || ".";
      const sandbox = await resolveSandboxForChat();
      const files = await sandbox.fs.listFiles(targetPath, { depth: depth ?? 1 });
      return {
        success: true,
        path: targetPath,
        files: files.map((f) => ({
          name: f.name,
          path: f.path,
          isDirectory: Boolean(f.isDir),
          size: f.size,
        })),
      };
    } catch (err) {
      return {
        success: false,
        path: path || ".",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

export const mouseClickTool = tool({
  description:
    "Click the mouse cursor at specific (x, y) coordinates on the sandbox desktop display screen.",
  inputSchema: z.object({
    x: z.number().describe("X coordinate on screen (0 to 1024)"),
    y: z.number().describe("Y coordinate on screen (0 to 768)"),
    button: z
      .enum(["left", "right", "middle"])
      .optional()
      .default("left")
      .describe("Mouse button to click"),
    double: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to double-click"),
  }),
  execute: async ({ x, y, button, double }) => {
    try {
      const sandbox = await resolveSandboxForChat();
      await sandbox.computerUse.mouse.click(x, y, button, double);
      return {
        success: true,
        x,
        y,
        button: button ?? "left",
        double: double ?? false,
      };
    } catch (err) {
      return {
        success: false,
        x,
        y,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

export const mouseScrollTool = tool({
  description:
    "Scroll the mouse wheel at (x, y) coordinates on the sandbox screen in a direction (up, down, left, right).",
  inputSchema: z.object({
    x: z.number().describe("X coordinate to scroll at"),
    y: z.number().describe("Y coordinate to scroll at"),
    direction: z
      .enum(["up", "down", "left", "right"])
      .describe("Scroll direction"),
    amount: z
      .number()
      .optional()
      .default(2)
      .describe("Number of scroll steps/amount (default: 2)"),
  }),
  execute: async ({ x, y, direction, amount }) => {
    try {
      const sandbox = await resolveSandboxForChat();
      await sandbox.computerUse.mouse.scroll(x, y, direction, amount);
      return {
        success: true,
        x,
        y,
        direction,
        amount: amount ?? 2,
      };
    } catch (err) {
      return {
        success: false,
        x,
        y,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

export const mouseMoveTool = tool({
  description:
    "Move the mouse cursor to specific (x, y) coordinates on the sandbox desktop display.",
  inputSchema: z.object({
    x: z.number().describe("X coordinate on screen"),
    y: z.number().describe("Y coordinate on screen"),
  }),
  execute: async ({ x, y }) => {
    try {
      const sandbox = await resolveSandboxForChat();
      await sandbox.computerUse.mouse.move(x, y);
      return {
        success: true,
        x,
        y,
      };
    } catch (err) {
      return {
        success: false,
        x,
        y,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

export const keyboardTypeTool = tool({
  description:
    "Type a string of text into the active focused window/input in the sandbox desktop.",
  inputSchema: z.object({
    text: z.string().describe("The text string to type"),
    delay: z
      .number()
      .optional()
      .describe("Optional delay in milliseconds between keystrokes"),
  }),
  execute: async ({ text, delay }) => {
    try {
      const sandbox = await resolveSandboxForChat();
      await sandbox.computerUse.keyboard.type(text, delay);
      return {
        success: true,
        text,
      };
    } catch (err) {
      return {
        success: false,
        text,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

export const keyboardPressTool = tool({
  description:
    "Press a keyboard key or hotkey combination (e.g. 'enter', 'tab', 'escape', 'backspace', 'c' with ['ctrl']).",
  inputSchema: z.object({
    key: z
      .string()
      .describe(
        "Key to press (e.g. 'enter', 'tab', 'escape', 'backspace', 'up', 'down', 'c')"
      ),
    modifiers: z
      .array(z.string())
      .optional()
      .describe("Modifier keys to hold down (e.g. ['ctrl'], ['alt'], ['shift'])"),
  }),
  execute: async ({ key, modifiers }) => {
    try {
      const sandbox = await resolveSandboxForChat();
      await sandbox.computerUse.keyboard.press(key, modifiers);
      return {
        success: true,
        key,
        modifiers: modifiers ?? [],
      };
    } catch (err) {
      return {
        success: false,
        key,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

export const viewScreenTool = tool({
  description:
    "Capture a desktop screenshot of the sandbox computer screen for your own visual perception. Use this to inspect what is currently on screen, identify UI coordinates, verify button positions, read windows, etc. IMPORTANT: This screenshot is solely for your internal visual analysis and will never be rendered in the user chat.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const sandbox = await resolveSandboxForChat();
      const snap = await sandbox.computerUse.screenshot.takeFullScreen();
      let compressed = snap.screenshot;
      if (snap.screenshot) {
        try {
          const buf = Buffer.from(snap.screenshot, "base64");
          const out = await sharp(buf)
            .resize(1024, 768, { fit: "inside" })
            .jpeg({ quality: 65 })
            .toBuffer();
          compressed = out.toString("base64");
        } catch (sharpErr) {
          console.warn("ViewScreen compression skipped:", sharpErr);
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
            text: `[Desktop Screenshot captured at ${output.timestamp}. Resolution: 1024x768]:`,
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

export const getDisplayInfoTool = tool({
  description:
    "Get display resolution and active display details of the sandbox desktop screen.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const sandbox = await resolveSandboxForChat();
      const info = await sandbox.computerUse.display.getInfo();
      return {
        success: true,
        displays: info.displays,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

export const sandboxTools = {
  bash: bashTool,
  readFile: readFileTool,
  writeFile: writeFileTool,
  listFiles: listFilesTool,
  mouseClick: mouseClickTool,
  mouseScroll: mouseScrollTool,
  mouseMove: mouseMoveTool,
  keyboardType: keyboardTypeTool,
  keyboardPress: keyboardPressTool,
  viewScreen: viewScreenTool,
  showScreen: showScreenTool,
  getDisplayInfo: getDisplayInfoTool,
};
