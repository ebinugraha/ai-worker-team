"use server";

import { auth as clerkAuth } from "@clerk/nextjs/server";
import {
  processAttachmentUpload,
  type UploadedAttachmentResult,
  type ActionResult,
} from "@/lib/attachment-handler";

export type { UploadedAttachmentResult, ActionResult };

export async function uploadChatAttachmentAction(
  formData: FormData
): Promise<ActionResult<UploadedAttachmentResult>> {
  try {
    const { userId } = await clerkAuth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File | null;
    const botId = formData.get("botId") as string | null;

    if (!file) {
      return { success: false, error: "No file provided" };
    }

    return await processAttachmentUpload(file, botId);
  } catch (err) {
    console.error("Error in uploadChatAttachmentAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to upload file",
    };
  }
}
