"use server";

import { auth as clerkAuth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db, userSettings } from "@/db";
import { eq } from "drizzle-orm";
import { encryptApiKey, decryptApiKey } from "@/lib/encryption";

export { encryptApiKey, decryptApiKey };

export interface UserSettingsData {
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  isConfigured: boolean;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function getUserSettingsAction(): Promise<
  ActionResult<UserSettingsData>
> {
  try {
    const { userId } = await clerkAuth();
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const [setting] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    const defaultBaseUrl =
      process.env.AI_BASE_URL ||
      process.env.NINE_ROUTER_BASE_URL ||
      "https://omoapicall.web.id/v1";
    const defaultApiKey =
      process.env.AI_API_KEY || process.env.NINE_ROUTER_API_KEY || "";
    const defaultModel = process.env.AI_MODEL || "glm-5.3-flashh";

    if (!setting) {
      return {
        success: true,
        data: {
          aiBaseUrl: defaultBaseUrl,
          aiApiKey: defaultApiKey,
          aiModel: defaultModel,
          isConfigured: false,
        },
      };
    }

    const resolvedApiKey = decryptApiKey(setting.aiApiKey) || defaultApiKey;

    return {
      success: true,
      data: {
        aiBaseUrl: setting.aiBaseUrl || defaultBaseUrl,
        aiApiKey: resolvedApiKey,
        aiModel: setting.aiModel || defaultModel,
        isConfigured: true,
      },
    };
  } catch (err: unknown) {
    console.error("Error fetching user settings:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Gagal memuat pengaturan pengguna.",
    };
  }
}

export async function saveUserSettingsAction(input: {
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
}): Promise<ActionResult<UserSettingsData>> {
  try {
    const { userId } = await clerkAuth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const trimmedBaseUrl = input.aiBaseUrl.trim().replace(/\/+$/, "");
    const trimmedApiKey = input.aiApiKey.trim();
    const trimmedModel = input.aiModel.trim();

    if (!trimmedBaseUrl) {
      return { success: false, error: "Base URL wajib diisi." };
    }
    if (!trimmedModel) {
      return { success: false, error: "Model wajib dipilih atau diisi." };
    }

    const encryptedKey = encryptApiKey(trimmedApiKey);

    await db
      .insert(userSettings)
      .values({
        userId,
        aiBaseUrl: trimmedBaseUrl,
        aiApiKey: encryptedKey,
        aiModel: trimmedModel,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          aiBaseUrl: trimmedBaseUrl,
          aiApiKey: encryptedKey,
          aiModel: trimmedModel,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/settings");
    revalidatePath("/");

    return {
      success: true,
      data: {
        aiBaseUrl: trimmedBaseUrl,
        aiApiKey: trimmedApiKey,
        aiModel: trimmedModel,
        isConfigured: true,
      },
      message: "Pengaturan model & provider AI berhasil disimpan!",
    };
  } catch (err: unknown) {
    console.error("Error saving user settings:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Gagal menyimpan pengaturan pengguna.",
    };
  }
}

export interface ModelCheckResult {
  latencyMs: number;
  models: string[];
  total: number;
}

export async function checkAiModelsAction(input: {
  aiBaseUrl: string;
  aiApiKey: string;
}): Promise<ActionResult<ModelCheckResult>> {
  const trimmedBaseUrl = input.aiBaseUrl.trim().replace(/\/+$/, "");
  const trimmedApiKey = decryptApiKey(input.aiApiKey.trim());

  if (!trimmedBaseUrl) {
    return { success: false, error: "Base URL wajib diisi untuk memeriksa model." };
  }

  const startTime = Date.now();
  const endpoint = `${trimmedBaseUrl}/models`;

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (trimmedApiKey) {
      headers["Authorization"] = `Bearer ${trimmedApiKey}`;
    }

    const response = await fetch(endpoint, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(15000),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      let errBody = "";
      try {
        errBody = await response.text();
      } catch {
        // ignore
      }
      return {
        success: false,
        error: `Provider mengembalikan status HTTP ${response.status} (${response.statusText}). ${
          response.status === 502
            ? "Server upstream provider sedang down / Bad Gateway."
            : response.status === 401
            ? "API Key tidak valid atau otorisasi ditolak."
            : errBody.slice(0, 120)
        }`,
      };
    }

    const data = await response.json();
    let modelList: string[] = [];

    if (Array.isArray(data.data)) {
      modelList = data.data
        .map((m: { id?: string; name?: string }) => m.id || m.name || "")
        .filter(Boolean);
    } else if (Array.isArray(data.models)) {
      modelList = data.models
        .map((m: { id?: string; name?: string }) => m.id || m.name || "")
        .filter(Boolean);
    } else if (Array.isArray(data)) {
      modelList = data
        .map((m: { id?: string; name?: string } | string) =>
          typeof m === "string" ? m : m.id || m.name || ""
        )
        .filter(Boolean);
    }

    // Deduplicate and sort
    const uniqueModels = Array.from(new Set(modelList)).sort();

    return {
      success: true,
      data: {
        latencyMs,
        models: uniqueModels,
        total: uniqueModels.length,
      },
      message: `Koneksi berhasil (${latencyMs}ms). Ditemukan ${uniqueModels.length} model.`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      error:
        err instanceof Error
          ? `Gagal terhubung ke endpoint (${err.message}).`
          : "Gagal terhubung ke endpoint API.",
      data: {
        latencyMs,
        models: [],
        total: 0,
      },
    };
  }
}

export interface ModelTestConnectionResult {
  latencyMs: number;
  supportsToolCalling: boolean;
  message: string;
  toolCallSample?: string;
}

/**
 * Validates connection, authentication, and tool calling capabilities of the user's custom model.
 */
export async function testModelConnection(input: {
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
}): Promise<ActionResult<ModelTestConnectionResult>> {
  const trimmedBaseUrl = input.aiBaseUrl.trim().replace(/\/+$/, "");
  const trimmedApiKey = decryptApiKey(input.aiApiKey.trim());
  const trimmedModel = input.aiModel.trim();

  if (!trimmedBaseUrl) {
    return {
      success: false,
      error: "Base URL wajib diisi untuk menguji model.",
    };
  }
  if (!trimmedModel) {
    return {
      success: false,
      error: "Model wajib dipilih atau diisi.",
    };
  }

  const startTime = Date.now();
  const endpoint = `${trimmedBaseUrl}/chat/completions`;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (trimmedApiKey) {
      headers["Authorization"] = `Bearer ${trimmedApiKey}`;
    }

    const testTool = {
      type: "function",
      function: {
        name: "test_tool_ping",
        description: "Tool uji untuk memeriksa kapabilitas tool calling model AI",
        parameters: {
          type: "object",
          properties: {
            ping: {
              type: "string",
              description: "Nilai ping uji coba",
            },
          },
          required: ["ping"],
        },
      },
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: trimmedModel,
        messages: [
          {
            role: "user",
            content:
              "Uji coba koneksi: Tolong panggil fungsi test_tool_ping dengan parameter ping='connection_test_ok'.",
          },
        ],
        tools: [testTool],
        tool_choice: "auto",
        max_tokens: 150,
      }),
      signal: AbortSignal.timeout(25000),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      let bodyText = "";
      try {
        bodyText = await res.text();
      } catch {
        // ignore
      }

      let errorDetail = bodyText.slice(0, 200);
      try {
        const parsed = JSON.parse(bodyText);
        if (parsed.error?.message) {
          errorDetail = parsed.error.message;
        }
      } catch {
        // ignore
      }

      return {
        success: false,
        error: `HTTP ${res.status} (${res.statusText}): ${errorDetail}`,
        data: {
          latencyMs,
          supportsToolCalling: false,
          message: `Koneksi gagal dengan status ${res.status}`,
        },
      };
    }

    const rawText = await res.text();
    let toolCallsFound = false;
    let toolCallSample = "";
    let contentSample = "";

    try {
      const data = JSON.parse(rawText);
      const choice = data.choices?.[0];
      const message = choice?.message;
      if (Array.isArray(message?.tool_calls) && message.tool_calls.length > 0) {
        toolCallsFound = true;
        toolCallSample = JSON.stringify(message.tool_calls[0]);
      }
      if (typeof message?.content === "string") {
        contentSample = message.content;
      }
    } catch {
      if (rawText.includes("test_tool_ping") || rawText.includes("tool_calls")) {
        toolCallsFound = true;
        toolCallSample = "Tool call terdeteksi dalam respons streaming";
      }
    }

    if (toolCallsFound) {
      return {
        success: true,
        data: {
          latencyMs,
          supportsToolCalling: true,
          toolCallSample,
          message: `Koneksi sukses (${latencyMs}ms)! Model '${trimmedModel}' terbukti mendukung native tool calling.`,
        },
      };
    } else {
      return {
        success: true,
        data: {
          latencyMs,
          supportsToolCalling: false,
          toolCallSample: contentSample || rawText.slice(0, 150),
          message: `Koneksi berhasil (${latencyMs}ms), namun model merespons dengan teks biasa tanpa memanggil tool. Pastikan model mendukung function calling.`,
        },
      };
    }
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      error:
        err instanceof Error
          ? `Gagal terhubung ke model: ${err.message}`
          : "Gagal terhubung ke model AI.",
      data: {
        latencyMs,
        supportsToolCalling: false,
        message: "Request timeout atau terjadi error jaringan.",
      },
    };
  }
}

export async function testAiPromptAction(input: {
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  prompt: string;
}): Promise<
  ActionResult<{
    reply: string;
    latencyMs: number;
  }>
> {
  const trimmedBaseUrl = input.aiBaseUrl.trim().replace(/\/+$/, "");
  const trimmedApiKey = decryptApiKey(input.aiApiKey.trim());
  const trimmedModel = input.aiModel.trim();
  const prompt = input.prompt.trim() || "Halo, perkenalkan dirimu secara singkat.";

  if (!trimmedBaseUrl || !trimmedModel) {
    return { success: false, error: "Base URL dan Model wajib diisi." };
  }

  const startTime = Date.now();
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (trimmedApiKey) {
      headers["Authorization"] = `Bearer ${trimmedApiKey}`;
    }

    const res = await fetch(`${trimmedBaseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: trimmedModel,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(20000),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      let bodyText = "";
      try {
        bodyText = await res.text();
      } catch {
        // ignore
      }
      return {
        success: false,
        error: `HTTP ${res.status} ${res.statusText}: ${
          res.status === 502
            ? "Upstream Bad Gateway untuk model ini."
            : bodyText.slice(0, 150)
        }`,
      };
    }

    const rawText = await res.text();
    let reply = "";

    // 1. Attempt standard JSON parse
    try {
      const json = JSON.parse(rawText);
      reply =
        json.choices?.[0]?.message?.content ||
        json.choices?.[0]?.delta?.content ||
        "";
    } catch {
      // 2. Fallback: Parse Server-Sent Events (SSE) stream lines (e.g. 9router / streaming proxies)
      const lines = rawText.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.replace(/^data:\s*/, "");
        if (payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload);
          const textPiece =
            chunk.choices?.[0]?.delta?.content ||
            chunk.choices?.[0]?.message?.content ||
            "";
          if (textPiece) {
            reply += textPiece;
          }
        } catch {
          // ignore chunk parse errors
        }
      }
    }

    if (!reply.trim()) {
      reply = rawText.trim().slice(0, 300) || "(Model merespons sukses tetapi output teks kosong)";
    }

    return {
      success: true,
      data: {
        reply,
        latencyMs,
      },
      message: `Model berhasil merespons dalam ${latencyMs}ms!`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? `Gagal mengeksekusi test chat: ${err.message}`
          : "Gagal mengeksekusi test chat.",
    };
  }
}
