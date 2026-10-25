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
 * Ensures Daytona sandbox and VNC processes are active and returns a signed VNC URL.
 */
export async function getSandboxVncUrl(sandboxId: string): Promise<string> {
  const daytona = getDaytonaClient();
  const sandbox = await daytona.get(sandboxId);

  // If the sandbox is stopped, start it
  if (sandbox.state === "stopped") {
    await sandbox.start();
  }

  // Ensure computer use / VNC server is started
  try {
    const vncStatus = await sandbox.computerUse.getStatus();
    if (vncStatus.status !== "active") {
      await sandbox.computerUse.start();
    }
  } catch (err) {
    console.warn(`Attempting to start computer use for sandbox ${sandboxId}:`, err);
    await sandbox.computerUse.start();
  }

  // Get signed preview URL for port 6080 (noVNC port), valid for 24 hours (86400 seconds)
  const signed = await sandbox.getSignedPreviewUrl(6080, 86400);
  return `${signed.url}/vnc.html?autoconnect=true&resize=scale&reconnect=true`;
}
