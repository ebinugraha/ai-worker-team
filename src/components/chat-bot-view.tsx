"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  MessageScroller,
  MessageScrollerProvider,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import {
  Trace,
  TraceLine,
  TraceIcon,
  TraceTitle,
  TraceCollapsible,
  TraceCollapsibleTrigger,
  TraceCollapsibleContent,
} from "@/components/ui/trace";
import { ChatMarkdown } from "@/components/chat-markdown";
import { cn } from "@/lib/utils";
import { PlusIcon, CornerDownLeftIcon, SquareIcon, BrainIcon } from "lucide-react";

export interface ChatBotViewProps {
  chatId: string;
  botName: string;
  botAvatar: string;
  botJob?: string;
  botInstruction?: string;
}

export function ChatBotView({
  chatId,
  botName,
  botInstruction,
}: ChatBotViewProps) {
  const [input, setInput] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const transport = React.useMemo(() => {
    return new DefaultChatTransport({
      api: "/api/chat",
      body: {
        chatId,
        instruction: botInstruction,
      },
    });
  }, [chatId, botInstruction]);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: chatId,
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    sendMessage({ text: trimmed });
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  };

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 w-full overflow-hidden bg-background">
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="flex-1 min-h-0 h-0">
          <MessageScrollerViewport className="p-4 sm:p-6 md:p-8 pt-6">
            <MessageScrollerContent className="w-full min-h-full flex flex-col justify-between">
              {messages.length === 0 ? (
                <div className="flex-1" />
              ) : (
                <div className="flex flex-col gap-4 flex-1 w-full">
                  {messages.map((message) => {
                    const isUser = message.role === "user";
                    return (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={isUser}
                      >
                        <div
                          className={cn(
                            "flex w-full",
                            isUser ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "w-fit max-w-[85%] sm:max-w-[75%] px-5 py-2.5 text-sm leading-relaxed transition-all shadow-xs",
                              "bg-neutral-800 text-neutral-100",
                              "rounded-full sm:rounded-[22px]"
                            )}
                          >
                            {message.parts.map((part, index) => {
                              if (part.type === "text") {
                                if (isUser) {
                                  return (
                                    <div
                                      key={index}
                                      className="whitespace-pre-wrap select-text"
                                    >
                                      {part.text}
                                    </div>
                                  );
                                }
                                return (
                                  <ChatMarkdown
                                    key={index}
                                    content={part.text}
                                  />
                                );
                              }
                              if (part.type === "reasoning") {
                                return (
                                  <Trace key={index} className="my-1">
                                    <TraceCollapsible defaultOpen={false}>
                                      <TraceCollapsibleTrigger>
                                        <TraceLine
                                          status={
                                            status === "streaming"
                                              ? "running"
                                              : undefined
                                          }
                                        >
                                          <TraceIcon>
                                            <BrainIcon className="size-3.5" />
                                          </TraceIcon>
                                          <TraceTitle>
                                            {status === "streaming"
                                              ? "Thinking..."
                                              : "Thought"}
                                          </TraceTitle>
                                        </TraceLine>
                                      </TraceCollapsibleTrigger>
                                      <TraceCollapsibleContent className="mt-1 pl-5 text-xs text-muted-foreground whitespace-pre-wrap border-l-2 border-border/50 ml-2">
                                        {part.text}
                                      </TraceCollapsibleContent>
                                    </TraceCollapsible>
                                  </Trace>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      </MessageScrollerItem>
                    );
                  })}

                  {/* Thinking status row when waiting for response chunks */}
                  {status === "submitted" && (
                    <MessageScrollerItem messageId="thinking">
                      <div className="flex w-full justify-start">
                        <div className="w-fit px-5 py-2.5 rounded-full sm:rounded-[22px] text-sm bg-neutral-800 text-neutral-400 self-start animate-pulse">
                          Thinking...
                        </div>
                      </div>
                    </MessageScrollerItem>
                  )}

                  {/* Error banner */}
                  {error && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                      Error: {error.message}
                    </div>
                  )}
                </div>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      {/* Input area matching chat-ui-photo.png reference */}
      <div className="p-4 sm:p-6 w-full shrink-0 z-10">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="w-full rounded-2xl bg-neutral-900 border border-neutral-800/80 p-3 sm:p-4 shadow-sm focus-within:border-neutral-700 transition-all flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="What would you like to know?"
              aria-label={`Message ${botName}`}
              disabled={isLoading}
              rows={1}
              className="w-full resize-none bg-transparent text-sm sm:text-base text-neutral-100 placeholder:text-neutral-500 outline-none border-none focus:outline-none focus:ring-0 min-h-[44px] max-h-36 leading-relaxed"
            />
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                className="size-7 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 flex items-center justify-center transition-colors cursor-pointer"
                title="Add attachment"
              >
                <PlusIcon className="size-4" />
              </button>
              <button
                type="submit"
                disabled={!input.trim() && !isLoading}
                onClick={isLoading ? () => stop() : () => handleSubmit()}
                className={cn(
                  "size-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                  isLoading
                    ? "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"
                    : input.trim()
                    ? "bg-neutral-700 text-neutral-100 hover:bg-neutral-600 shadow-xs"
                    : "bg-neutral-800/60 text-neutral-500 cursor-not-allowed"
                )}
                title={isLoading ? "Stop generation" : "Send message (Enter)"}
              >
                {isLoading ? (
                  <SquareIcon className="size-3.5 fill-current" />
                ) : (
                  <CornerDownLeftIcon className="size-4" />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChatBotView;
