import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const PREFIX = "enc:v1:";

/**
 * Derives a stable 32-byte cryptographic key for AES-256-GCM.
 */
function getDerivedKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.DATABASE_URL ||
    process.env.CLERK_SECRET_KEY ||
    "ai-worker-team-default-secure-salt-2026";

  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts an API key using AES-256-GCM.
 * Stored in format: enc:v1:<iv_hex>:<auth_tag_hex>:<cipher_hex>
 */
export function encryptApiKey(plainText: string): string {
  if (!plainText || !plainText.trim()) {
    return "";
  }

  // If already encrypted, return as is
  if (plainText.startsWith(PREFIX)) {
    return plainText;
  }

  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted API key.
 * Gracefully handles unencrypted legacy keys as a fallback.
 */
export function decryptApiKey(cipherText: string | null | undefined): string {
  if (!cipherText || !cipherText.trim()) {
    return "";
  }

  // Graceful fallback for legacy plaintext API keys in DB
  if (!cipherText.startsWith(PREFIX)) {
    return cipherText;
  }

  try {
    const payload = cipherText.slice(PREFIX.length);
    const [ivHex, authTagHex, encryptedHex] = payload.split(":");

    if (!ivHex || !authTagHex || !encryptedHex) {
      return cipherText;
    }

    const key = getDerivedKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("Failed to decrypt API key:", err);
    return cipherText;
  }
}
