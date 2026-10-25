"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  useTriggerChatTransport,
  useLoadTranscript,
} from "@trigger.dev/sdk/chat/react";
import type { chatAgent } from "../../trigger/chat";
import {
  mintChatAccessToken,
  startChatSession,
  loadChatTranscript,
} from "@/action/chat";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChatMarkdown } from "@/components/chat-markdown";
import {
  ChatToolView,
  isToolPart,
  getToolName,
} from "@/components/chat-tool-view";
import { SeedAvatar } from "@/components/seed-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PlusIcon,
  CornerDownLeftIcon,
  SquareIcon,
  BrainIcon,
  ChevronDownIcon,
  CheckIcon,
} from "lucide-react";

export interface MemberBot {
  id: string;
  name: string;
  avatar: string;
  job?: string;
  instruction?: string | null;
  sandboxId?: string | null;
}

export interface ChatBotViewProps {
  chatId: string;
  botName: string;
  botAvatar: string;
  botJob?: string;
  botInstruction?: string;
  isGroup?: boolean;
  memberBots?: MemberBot[];
}

interface ChatBotContentProps extends ChatBotViewProps {
  initialMessages: UIMessage[];
  transport: ReturnType<typeof useTriggerChatTransport<typeof chatAgent>>;
}

function ChatBotContent({
  chatId,
  botName,
  isGroup = false,
  memberBots = [],
  initialMessages,
  transport,
}: ChatBotContentProps) {
  const [input, setInput] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Default selected bot for turn-based conversation in group chat
  const [selectedBotId, setSelectedBotId] = React.useState<string>(() => {
    if (isGroup && memberBots && memberBots.length > 0) {
      for (let i = initialMessages.length - 1; i >= 0; i--) {
        const msg = initialMessages[i];
        if (msg.role === "assistant") {
          for (const part of msg.parts) {
            if (isToolPart(part) && getToolName(part) === "handoff") {
              const out = part.output as
                | { success?: boolean; targetBot?: { id?: string } }
                | undefined;
              if (out?.success && out.targetBot?.id) {
                if (memberBots.some((b) => b.id === out.targetBot!.id)) {
                  return out.targetBot.id;
                }
              }
            }
          }
        }
      }
      return memberBots[0].id;
    }
    return chatId;
  });

  const selectedBot = React.useMemo(() => {
    if (!memberBots || memberBots.length === 0) return null;
    return memberBots.find((b) => b.id === selectedBotId) ?? memberBots[0];
  }, [memberBots, selectedBotId]);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    resume: initialMessages.length > 0,
    onFinish: ({ message }) => {
      if (!isGroup || !memberBots || memberBots.length === 0) return;
      for (const part of message.parts) {
        if (isToolPart(part) && getToolName(part) === "handoff") {
          const out = part.output as
            | { success?: boolean; targetBot?: { id?: string } }
            | undefined;
          if (out?.success && out.targetBot?.id) {
            const nextBotId = out.targetBot.id;
            if (memberBots.some((b) => b.id === nextBotId)) {
              setSelectedBotId(nextBotId);
            }
          }
        }
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  const getBotForMessage = React.useCallback(
    (messageIndex: number): MemberBot | null => {
      if (!isGroup || memberBots.length === 0) return null;

      const currentMsg = messages[messageIndex];

      // 0. If this message executed a successful handoff, the target bot is the primary responder!
      if (currentMsg && currentMsg.parts) {
        for (const part of currentMsg.parts) {
          if (isToolPart(part) && getToolName(part) === "handoff") {
            const out = part.output as
              | { success?: boolean; targetBot?: { id?: string; name?: string } }
              | undefined;
            if (out?.success && out.targetBot?.id) {
              const found = memberBots.find((b) => b.id === out.targetBot!.id);
              if (found) return found;
            }
          }
        }
      }

      // 1. Direct match on current message metadata (set by server or client)
      if (
        currentMsg?.metadata &&
        typeof currentMsg.metadata === "object" &&
        "botId" in currentMsg.metadata
      ) {
        const targetId = (currentMsg.metadata as { botId: string }).botId;
        const found = memberBots.find((b) => b.id === targetId);
        if (found) return found;
      }

      if (
        currentMsg?.metadata &&
        typeof currentMsg.metadata === "object" &&
        "botName" in currentMsg.metadata
      ) {
        const targetName = (currentMsg.metadata as { botName: string }).botName;
        const found = memberBots.find(
          (b) => b.name.toLowerCase() === targetName.toLowerCase()
        );
        if (found) return found;
      }

      // 2. Look backwards for the user message that prompted this assistant turn
      for (let i = messageIndex - 1; i >= 0; i--) {
        const prevMsg = messages[i];
        if (
          prevMsg.role === "user" &&
          prevMsg.metadata &&
          typeof prevMsg.metadata === "object" &&
          "botId" in prevMsg.metadata
        ) {
          const targetId = (prevMsg.metadata as { botId: string }).botId;
          const found = memberBots.find((b) => b.id === targetId);
          if (found) return found;
        }
      }

      // 3. Content heuristic: Check if the message self-identifies with a bot name (e.g. "Saya Hemingway", "Nama saya Wong")
      if (currentMsg && currentMsg.parts) {
        const textParts = currentMsg.parts
          .filter((p) => p.type === "text" && typeof p.text === "string")
          .map((p) => (p as { text: string }).text)
          .join(" ");

        if (textParts) {
          const prefix = textParts.slice(0, 150).toLowerCase();
          for (const bot of memberBots) {
            const bName = bot.name.toLowerCase();
            if (
              prefix.includes(`nama saya ${bName}`) ||
              prefix.includes(`saya ${bName}`) ||
              prefix.includes(`halo, saya ${bName}`) ||
              prefix.includes(`hai, saya ${bName}`) ||
              prefix.includes(`i am ${bName}`) ||
              prefix.includes(`i'm ${bName}`)
            ) {
              return bot;
            }
          }
        }
      }

      // 4. For the actively in-flight response (currently streaming or thinking), use selectedBot
      const isLatestMessage = messageIndex === messages.length - 1;
      if (isLatestMessage && isLoading && selectedBot) {
        return selectedBot;
      }

      // 5. Fallback for completed historical messages:
      // Never use selectedBot here, because selectedBot reflects the active composer dropdown!
      return memberBots[0] ?? null;
    },
    [isGroup, memberBots, messages, isLoading, selectedBot]
  );

  const getTargetBotForUserMessage = React.useCallback(
    (messageIndex: number): MemberBot | null => {
      if (!isGroup || memberBots.length === 0) return null;

      const currentMsg = messages[messageIndex];

      // 1. Direct match on user message metadata
      if (
        currentMsg?.metadata &&
        typeof currentMsg.metadata === "object" &&
        "botId" in currentMsg.metadata
      ) {
        const targetId = (currentMsg.metadata as { botId: string }).botId;
        const found = memberBots.find((b) => b.id === targetId);
        if (found) return found;
      }

      // 2. If it is the latest message (in-flight or waiting for response), use selectedBot
      const isLatestMessage = messageIndex === messages.length - 1;
      if (isLatestMessage && selectedBot) {
        return selectedBot;
      }

      // 3. Check the assistant response that immediately followed this user turn
      if (messageIndex < messages.length - 1) {
        const nextMsg = messages[messageIndex + 1];
        if (
          nextMsg?.metadata &&
          typeof nextMsg.metadata === "object" &&
          "botId" in nextMsg.metadata
        ) {
          const targetId = (nextMsg.metadata as { botId: string }).botId;
          const found = memberBots.find((b) => b.id === targetId);
          if (found) return found;
        }

        const nextBot = getBotForMessage(messageIndex + 1);
        if (nextBot) return nextBot;
      }

      // 4. Stable fallback for historical messages
      return memberBots[0] ?? null;
    },
    [isGroup, memberBots, messages, selectedBot, getBotForMessage]
  );

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const botIdToTarget = isGroup && selectedBot ? selectedBot.id : chatId;

    // Send the chosen bot ID via transport metadata and clientData
    transport.setClientData({ botId: botIdToTarget });

    sendMessage(
      {
        text: trimmed,
        metadata: {
          botId: botIdToTarget,
        },
      },
      {
        metadata: {
          botId: botIdToTarget,
        },
      }
    );

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleStop = () => {
    stop();
    transport.stopGeneration(chatId);
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
                  {messages.map((message, messageIndex) => {
                    const isUser = message.role === "user";
                    const botForMessage = !isUser
                      ? getBotForMessage(messageIndex)
                      : null;
                    const targetBotForUser = isUser
                      ? getTargetBotForUserMessage(messageIndex)
                      : null;

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
                          {isUser ? (
                            <div
                              className={cn(
                                "w-fit max-w-[85%] sm:max-w-[75%] px-5 py-2.5 text-sm leading-relaxed transition-all shadow-xs",
                                "bg-neutral-800 text-neutral-100",
                                "rounded-full sm:rounded-[22px]"
                              )}
                            >
                              <div className="whitespace-pre-wrap select-text">
                                {isGroup && targetBotForUser && (
                                  <Badge
                                    variant="secondary"
                                    className="inline-flex items-center align-middle mr-2 h-5 px-1.5 py-0 gap-1.5 bg-neutral-900/80 hover:bg-neutral-900 text-neutral-200 border border-neutral-700/60 text-[11px] font-medium rounded-full select-none -translate-y-px"
                                    title={`Ditujukan ke ${targetBotForUser.name}`}
                                  >
                                    <SeedAvatar
                                      seed={targetBotForUser.avatar}
                                      size={12}
                                      className="rounded-full shrink-0"
                                    />
                                    <span className="truncate max-w-[120px]">
                                      {targetBotForUser.name}
                                    </span>
                                  </Badge>
                                )}
                                {message.parts.map((part, index) => {
                                  if (part.type === "text") {
                                    return (
                                      <React.Fragment key={index}>
                                        {part.text}
                                      </React.Fragment>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2.5 w-full max-w-[92%] sm:max-w-[85%]">
                              {/* Bot avatar beside message on group chat */}
                              {isGroup && botForMessage && (
                                <div
                                  className="size-7 rounded-full overflow-hidden shrink-0 mt-1 border border-border/50 bg-muted/40 flex items-center justify-center select-none"
                                  title={botForMessage.name}
                                >
                                  <SeedAvatar
                                    seed={botForMessage.avatar}
                                    size={28}
                                    alt={botForMessage.name}
                                  />
                                </div>
                              )}

                              <div className="flex flex-col gap-2 flex-1 min-w-0 items-start">
                                {/* Bot name label above message bubble in group chat */}
                                {isGroup && botForMessage && (
                                  <span className="text-[11px] font-medium text-neutral-400 select-none pl-1">
                                    {botForMessage.name}
                                  </span>
                                )}

                                {message.parts.map((part, index) => {
                                  if (part.type === "text") {
                                    return (
                                      <div
                                        key={index}
                                        className={cn(
                                          "w-fit max-w-full px-5 py-2.5 text-sm leading-relaxed transition-all shadow-xs",
                                          "bg-neutral-800 text-neutral-100",
                                          "rounded-2xl sm:rounded-[22px]"
                                        )}
                                      >
                                        <ChatMarkdown content={part.text} />
                                      </div>
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
                                  if (isToolPart(part)) {
                                    return (
                                      <ChatToolView
                                        key={index}
                                        part={part}
                                        isStreaming={status === "streaming"}
                                      />
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </MessageScrollerItem>
                    );
                  })}

                  {/* Thinking status row when waiting for response chunks */}
                  {status === "submitted" && (
                    <MessageScrollerItem messageId="thinking">
                      <div className="flex w-full justify-start">
                        <div className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%]">
                          {isGroup && selectedBot && (
                            <div
                              className="size-7 rounded-full overflow-hidden shrink-0 mt-1 border border-border/50 bg-muted/40 flex items-center justify-center select-none"
                              title={selectedBot.name}
                            >
                              <SeedAvatar
                                seed={selectedBot.avatar}
                                size={28}
                                alt={selectedBot.name}
                              />
                            </div>
                          )}
                          <div className="flex flex-col gap-1 items-start">
                            {isGroup && selectedBot && (
                              <span className="text-[11px] font-medium text-neutral-400 select-none pl-1">
                                {selectedBot.name}
                              </span>
                            )}
                            <div className="w-fit px-5 py-2.5 rounded-full sm:rounded-[22px] text-sm bg-neutral-800 text-neutral-400 self-start animate-pulse">
                              Thinking...
                            </div>
                          </div>
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

      {/* Input area with AI elements bot-picker dropdown */}
      <div className="p-4 sm:p-6 w-full shrink-0 z-10">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="w-full rounded-2xl bg-neutral-900 border border-neutral-800/80 p-3 sm:p-4 shadow-sm focus-within:border-neutral-700 transition-all flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={
                isGroup && selectedBot
                  ? `Message ${selectedBot.name}...`
                  : "What would you like to know?"
              }
              aria-label={
                isGroup && selectedBot
                  ? `Message ${selectedBot.name}`
                  : `Message ${botName}`
              }
              disabled={isLoading}
              rows={1}
              className="w-full resize-none bg-transparent text-sm sm:text-base text-neutral-100 placeholder:text-neutral-500 outline-none border-none focus:outline-none focus:ring-0 min-h-[44px] max-h-36 leading-relaxed"
            />
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="size-7 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 flex items-center justify-center transition-colors cursor-pointer"
                  title="Add attachment"
                >
                  <PlusIcon className="size-4" />
                </button>

                {/* AI-elements dropdown for picking which bot to talk to in group chat */}
                {isGroup && memberBots.length > 0 && selectedBot && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      type="button"
                      className="flex items-center gap-1.5 h-7 px-2 rounded-lg bg-neutral-800/90 hover:bg-neutral-800 text-neutral-200 text-xs font-medium border border-neutral-700/60 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-neutral-500 select-none"
                      title="Choose bot to talk to"
                    >
                      <SeedAvatar
                        seed={selectedBot.avatar}
                        size={16}
                        className="rounded-full shrink-0"
                      />
                      <span className="truncate max-w-[90px] sm:max-w-[130px]">
                        {selectedBot.name}
                      </span>
                      <ChevronDownIcon className="size-3 text-neutral-400 shrink-0" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      side="top"
                      sideOffset={6}
                      className="w-56 p-1 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-50 text-neutral-200"
                    >
                      <DropdownMenuGroup>
                        {memberBots.map((bot) => {
                          const isSelected = bot.id === selectedBot.id;
                          return (
                            <DropdownMenuItem
                              key={bot.id}
                              onClick={() => {
                                setSelectedBotId(bot.id);
                                transport.setClientData({ botId: bot.id });
                              }}
                              className={cn(
                                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors select-none",
                                isSelected
                                  ? "bg-neutral-800 text-neutral-100 font-medium"
                                  : "hover:bg-neutral-800/60 text-neutral-300"
                              )}
                            >
                              <SeedAvatar
                                seed={bot.avatar}
                                size={20}
                                className="rounded-full shrink-0"
                              />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="truncate font-medium text-neutral-200">
                                  {bot.name}
                                </span>
                                {bot.job && (
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    {bot.job}
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <CheckIcon className="size-3.5 text-neutral-200 shrink-0" />
                              )}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <button
                type="submit"
                disabled={!input.trim() && !isLoading}
                onClick={isLoading ? handleStop : () => handleSubmit()}
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

export function ChatBotView(props: ChatBotViewProps) {
  const initialBotId =
    props.isGroup && props.memberBots && props.memberBots.length > 0
      ? props.memberBots[0].id
      : props.chatId;

  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat-agent",
    clientData: { botId: initialBotId },
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
  });

  const { messages: transcriptMessages, isLoading } = useLoadTranscript(
    props.chatId,
    loadChatTranscript,
    {
      transport,
    }
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col h-full min-h-0 w-full p-4 sm:p-6 md:p-8 justify-between animate-pulse bg-background">
        <div className="flex flex-col gap-4 w-full pt-2">
          <div className="flex justify-end w-full">
            <div className="h-10 w-64 rounded-full bg-neutral-800" />
          </div>
          <div className="flex justify-start w-full">
            <div className="h-10 w-96 rounded-full bg-neutral-800" />
          </div>
        </div>
        <div className="w-full pb-2">
          <div className="h-24 w-full rounded-2xl bg-neutral-900 border border-neutral-800/80" />
        </div>
      </div>
    );
  }

  return (
    <ChatBotContent
      {...props}
      key={props.chatId}
      initialMessages={transcriptMessages}
      transport={transport}
    />
  );
}

export default ChatBotView;
