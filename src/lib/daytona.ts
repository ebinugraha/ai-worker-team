import { Daytona } from "@daytona/sdk";

export function getDaytonaClient(): Daytona {
  return new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL,
    target: process.env.DAYTONA_TARGET,
  });
}

/**
 * Creates an isolated Daytona sandbox for a bot.
 * Does not invoke or execute actions on the sandbox.
 */
export async function createBotSandbox(botName?: string): Promise<string> {
  const daytona = getDaytonaClient();
  const sandbox = await daytona.create({
    labels: botName ? { botName } : undefined,
  });

  // Initialize an empty MEMORY.md file inside the newly created bot sandbox
  try {
    if (sandbox.state === "stopped") {
      await sandbox.start();
    }
    await sandbox.fs.uploadFile(Buffer.from(""), "MEMORY.md");
  } catch (fsErr) {
    console.error(
      `Failed to initialize MEMORY.md in sandbox ${sandbox.id}:`,
      fsErr
    );
  }

  return sandbox.id;
}

/**
 * Deletes a Daytona sandbox by its ID.
 */
export async function deleteBotSandbox(sandboxId: string): Promise<void> {
  if (!sandboxId) return;
  try {
    const daytona = getDaytonaClient();
    const sandbox = await daytona.get(sandboxId);
    await sandbox.delete();
  } catch (error) {
    console.error(`Failed to delete Daytona sandbox ${sandboxId}:`, error);
  }
}

/**
 * Helper to ensure a Daytona sandbox is active and running.
 * If stopped or archived, starts it automatically and ensures computer use is ready.
 */
export async function ensureSandboxActive(sandboxId: string) {
  const daytona = getDaytonaClient();
  const sandbox = await daytona.get(sandboxId);

  if (sandbox.state === "stopped" || sandbox.state === "archived") {
    await sandbox.start();
  }

  try {
    const vncStatus = await sandbox.computerUse.getStatus();
    if (vncStatus.status !== "active") {
      await sandbox.computerUse.start();
    }
  } catch (err) {
    console.warn(
      `Attempting to start computer use for sandbox ${sandboxId}:`,
      err
    );
    try {
      await sandbox.computerUse.start();
    } catch {}
  }

  return sandbox;
}

/**
 * Sequential lock map to prevent concurrent bot actions on the same sandbox in group chats.
 */
const sandboxLocks = new Map<string, Promise<void>>();

export async function withSandboxLock<T>(
  sandboxId: string,
  fn: () => Promise<T>
): Promise<T> {
  const prev = sandboxLocks.get(sandboxId) || Promise.resolve();
  let release: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  sandboxLocks.set(sandboxId, current);

  try {
    await prev;
    return await fn();
  } finally {
    release!();
    if (sandboxLocks.get(sandboxId) === current) {
      sandboxLocks.delete(sandboxId);
    }
  }
}

/**
 * Ensures Daytona sandbox and VNC processes are active and returns a signed VNC URL.
 */
export async function getSandboxVncUrl(sandboxId: string): Promise<string> {
  const sandbox = await ensureSandboxActive(sandboxId);

  // Get signed preview URL for port 6080 (noVNC port), valid for 24 hours (86400 seconds)
  const signed = await sandbox.getSignedPreviewUrl(6080, 86400);
  return `${signed.url}/vnc.html?autoconnect=true&resize=scale&reconnect=true`;
}
