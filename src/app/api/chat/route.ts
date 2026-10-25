import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  UIMessage,
} from "ai";

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

const nineRouter = createOpenAI({
  baseURL: process.env.NINE_ROUTER_BASE_URL,
  apiKey: process.env.NINE_ROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const {
      messages,
      instruction,
    }: {
      messages: UIMessage[];
      instruction?: string;
    } = await req.json();

    const systemInstruction = instruction?.trim()
      ? `${instruction.trim()}\n\nRespond clearly and concisely.`
      : "You are a helpful and intelligent AI teammate. Respond clearly and concisely.";

    const result = streamText({
      model: nineRouter.chat("my-combo-9router"),
      instructions: systemInstruction,
      messages: await convertToModelMessages(messages),
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (error) {
    console.error("Chat route error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
