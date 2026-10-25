import { chat, defaultStorage } from "@trigger.dev/sdk/ai";
import { createOpenAI } from "@ai-sdk/openai";

const nineRouter = createOpenAI({
  baseURL: process.env.NINE_ROUTER_BASE_URL,
  apiKey: process.env.NINE_ROUTER_API_KEY,
});

export const chatAgent = chat.agent({
  id: "chat-agent",
  storage: defaultStorage,
  run: async ({ messages, signal, streamText }) => {
    return streamText({
      model: nineRouter.chat("my-combo-9router"),
      system:
        "You are a helpful and intelligent AI teammate. Respond clearly and concisely.",
      messages,
      abortSignal: signal,
    });
  },
});
