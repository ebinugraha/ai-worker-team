"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  recordChatActivityAction,
  stopChatGeneration,
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
  Loader2Icon,
  CheckCircle2Icon,
  AlertTriangleIcon,
} from "lucide-react";
import {
  ComposerAttachmentStrip,
  ChatDropzoneOverlay,
  MessageAttachmentsView,
  extractAttachmentsFromText,
  type PendingAttachment,
  type StoredAttachmentMeta,
} from "@/components/chat-attachments";
import {
  compressImageClientSide,
  formatFileSize,
} from "@/lib/attachment-utils";

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
  const router = useRouter();
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
      if (isGroup && memberBots && memberBots.length > 0) {
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
      }

      // Record assistant response in Neon database and update sidebar
      let assistantText = "";
      if (message && Array.isArray(message.parts)) {
        for (const part of message.parts) {
          if (
            part &&
            "text" in part &&
            typeof (part as { text?: unknown }).text === "string"
          ) {
            assistantText = (part as { text: string }).text;
          }
        }
      }

      if (assistantText) {
        recordChatActivityAction({
          chatId,
          preview: assistantText,
        })
          .then(() => {
            router.refresh();
          })
          .catch(() => {});
      }
    },
  });

  // Deduplicate messages by ID to prevent duplicate React keys and duplicate bubbles
  const displayMessages = React.useMemo(() => {
    if (!messages || messages.length === 0) return [];
    const seen = new Map<string, number>();
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg && msg.id) {
        seen.set(msg.id, i);
      }
    }
    return messages.filter((msg, index) => {
      if (!msg || !msg.id) return false;
      return seen.get(msg.id) === index;
    });
  }, [messages]);

  const isLoading = status === "submitted" || status === "streaming";

  const getBotForMessage = React.useCallback(
    (messageIndex: number): MemberBot | null => {
      if (!isGroup || memberBots.length === 0) return null;

      const currentMsg = displayMessages[messageIndex];

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
        const prevMsg = displayMessages[i];
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
      const isLatestMessage = messageIndex === displayMessages.length - 1;
      if (isLatestMessage && isLoading && selectedBot) {
        return selectedBot;
      }

      // 5. Fallback for completed historical messages:
      // Never use selectedBot here, because selectedBot reflects the active composer dropdown!
      return memberBots[0] ?? null;
    },
    [isGroup, memberBots, displayMessages, isLoading, selectedBot]
  );

  const getTargetBotForUserMessage = React.useCallback(
    (messageIndex: number): MemberBot | null => {
      if (!isGroup || memberBots.length === 0) return null;

      const currentMsg = displayMessages[messageIndex];

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
      const isLatestMessage = messageIndex === displayMessages.length - 1;
      if (isLatestMessage && selectedBot) {
        return selectedBot;
      }

      // 3. Check the assistant response that immediately followed this user turn
      if (messageIndex < displayMessages.length - 1) {
        const nextMsg = displayMessages[messageIndex + 1];
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
    [isGroup, memberBots, displayMessages, selectedBot, getBotForMessage]
  );

  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([]);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dragCounterRef = React.useRef(0);

  const addFilesToAttachments = React.useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return;

    for (const rawFile of files) {
      const isImage = rawFile.type.startsWith("image/");
      const isZip =
        rawFile.type.includes("zip") ||
        rawFile.name.toLowerCase().endsWith(".zip") ||
        rawFile.type === "application/x-zip-compressed";

      const attId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      if (isImage) {
        try {
          // Compress screenshot client-side (drastically reduces tokens from 5MB to ~40KB)
          const compressed = await compressImageClientSide(rawFile);
          setAttachments((prev) => [
            ...prev,
            {
              id: attId,
              file: compressed.file,
              name: compressed.file.name,
              size: compressed.compressedSize,
              type: compressed.file.type,
              isImage: true,
              isZip: false,
              previewUrl: compressed.dataUrl,
              width: compressed.width,
              height: compressed.height,
              uploadStatus: "idle",
            },
          ]);
        } catch {
          const previewUrl = URL.createObjectURL(rawFile);
          setAttachments((prev) => [
            ...prev,
            {
              id: attId,
              file: rawFile,
              name: rawFile.name,
              size: rawFile.size,
              type: rawFile.type,
              isImage: true,
              isZip: false,
              previewUrl,
              uploadStatus: "idle",
            },
          ]);
        }
      } else {
        setAttachments((prev) => [
          ...prev,
          {
            id: attId,
            file: rawFile,
            name: rawFile.name,
            size: rawFile.size,
            type: rawFile.type || "application/octet-stream",
            isImage: false,
            isZip,
            uploadStatus: "idle",
          },
        ]);
      }
    }
  }, []);

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        addFilesToAttachments(imageFiles);
      }
    },
    [addFilesToAttachments]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFilesToAttachments(droppedFiles);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const trimmed = input.trim();
    if (
      (!trimmed && attachments.length === 0) ||
      isLoading ||
      isUploadingAttachments
    ) {
      return;
    }

    const botIdToTarget = isGroup && selectedBot ? selectedBot.id : chatId;
    transport.setClientData({ botId: botIdToTarget });

    let finalPrompt = trimmed;
    const currentAttachments = [...attachments];

    if (currentAttachments.length > 0) {
      setIsUploadingAttachments(true);
      const uploadedMeta: StoredAttachmentMeta[] = [];
      const promptContextLines: string[] = [];

      for (const att of currentAttachments) {
        try {
          // Kirim binary file secara langsung dengan headers x-filename dan x-bot-id
          // untuk menghindari limitasi multipartFormDataParser ("Failed to parse body as FormData") pada berkas > 20MB
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "x-filename": encodeURIComponent(att.file.name),
              "x-bot-id": botIdToTarget || "",
              "content-type": att.file.type || "application/octet-stream",
            },
            body: att.file,
          });

          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => null);
            throw new Error(errData?.error || `Upload gagal (HTTP ${uploadRes.status})`);
          }

          const res = await uploadRes.json();
          if (res.success && res.data) {
            const data = res.data;
            uploadedMeta.push({
              id: data.id,
              name: data.name,
              size: data.size,
              type: data.isImage ? "image" : data.isZip ? "zip" : "file",
              url: data.url,
              sandboxPath: data.sandboxPath,
              extractedPath: data.extractedPath,
              fileCount: data.fileCount,
            });

            if (data.isZip) {
              promptContextLines.push(
                `📦 File Arsip ZIP: "${data.name}" (${formatFileSize(data.size)})` +
                  (data.sandboxPath
                    ? `\n- Tersimpan di Sandbox: \`${data.sandboxPath}\``
                    : "") +
                  (data.extractedPath
                    ? `\n- Telah diekstrak ke direktori: \`${data.extractedPath}\``
                    : "") +
                  (data.fileList && data.fileList.length > 0
                    ? `\n- File dalam arsip (${data.fileCount} total):\n${data.fileList
                        .map((f: string) => `  * ${f}`)
                        .join("\n")}`
                    : "") +
                  (data.previewText
                    ? `\n- Ringkasan isi/README:\n"""\n${data.previewText}\n"""`
                    : "") +
                  `\n(Gunakan bashTool atau file tools untuk memeriksa atau menjalankan file ini di sandbox Anda.)`
              );
            } else if (data.isImage) {
              promptContextLines.push(
                `🖼️ Gambar/Foto terlampir: "${data.name}" (${formatFileSize(data.size)})` +
                  (data.sandboxPath
                    ? `\n- Tersimpan di Sandbox: \`${data.sandboxPath}\``
                    : "") +
                  `\n- Gambar ini telah disertakan dalam pesan visual multimodal Anda. Harap amati dan analisis gambar ini secara langsung untuk menjawab pertanyaan.`
              );
            } else {
              promptContextLines.push(
                `📄 Dokumen/File: "${data.name}" (${formatFileSize(data.size)})` +
                  (data.sandboxPath
                    ? `\n- Tersimpan di Sandbox: \`${data.sandboxPath}\``
                    : "") +
                  (data.previewText
                    ? `\n- Isi teks dokumen:\n"""\n${data.previewText}\n"""`
                    : "")
              );
            }
          } else {
            console.error("Gagal mengunggah lampiran:", res.error);
          }
        } catch (err) {
          console.error("Gagal mengunggah attachment:", err);
        }
      }

      setIsUploadingAttachments(false);

      if (uploadedMeta.length === 0 && currentAttachments.length > 0) {
        alert("Gagal mengunggah file. Pastikan ukuran file tidak melebihi 100 MB.");
        return;
      }

      setAttachments([]);

      const metaTag = `<!--attachments:${JSON.stringify(uploadedMeta)}-->`;
      const userQuestion =
        trimmed || "Tolong periksa dan analisis lampiran yang saya kirimkan.";
      const contextBlock =
        promptContextLines.length > 0
          ? `\n\n[LAMPIRAN PENGGUNA]\n${promptContextLines.join("\n\n")}`
          : "";

      finalPrompt = `${userQuestion}${contextBlock}\n${metaTag}`;
    }

    sendMessage(
      {
        text: finalPrompt,
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

    // Optimistically update chat activity in Neon database and refresh sidebar
    const userPreview = trimmed || "Mengirim lampiran";
    recordChatActivityAction({
      chatId,
      preview: `You: ${userPreview}`,
    })
      .then(() => {
        router.refresh();
      })
      .catch(() => {});

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleStop = React.useCallback(
    (e?: React.SyntheticEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      try {
        stop();
      } catch (err) {
        console.warn("useChat stop error:", err);
      }
      stopChatGeneration(chatId).catch((err) => {
        console.warn("stopChatGeneration server error:", err);
      });
      try {
        transport.stopGeneration(chatId);
      } catch (err) {
        console.warn("transport stopGeneration error:", err);
      }
    },
    [stop, transport, chatId]
  );

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
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative flex flex-1 flex-col h-full min-h-0 w-full overflow-hidden bg-background"
    >
      <ChatDropzoneOverlay isDragging={isDraggingOver} />
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="flex-1 min-h-0 h-0">
          <MessageScrollerViewport className="p-6 sm:p-8 md:p-10 pt-8">
            <MessageScrollerContent className="w-full min-h-full flex flex-col justify-between">
              {displayMessages.length === 0 ? (
                <div className="flex-1" />
              ) : (
                <div className="flex flex-col gap-5 flex-1 w-full">
                  {displayMessages.map((message, messageIndex) => {
                    const isUser = message.role === "user";
                    const isLatestMessage = messageIndex === displayMessages.length - 1;
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
                                "w-fit max-w-[85%] sm:max-w-[75%] px-5 py-3.5 text-base sm:text-lg leading-relaxed transition-all",
                                "bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-2xl shadow-none"
                              )}
                            >
                              <div className="whitespace-pre-wrap select-text">
                                {isGroup && targetBotForUser && (
                                  <Badge
                                    variant="secondary"
                                    className="inline-flex items-center align-middle mr-2 h-6 px-2 py-0 gap-1.5 bg-zinc-950 text-zinc-300 border border-zinc-800 text-xs font-mono rounded select-none -translate-y-px"
                                    title={`Ditujukan ke ${targetBotForUser.name}`}
                                  >
                                    <SeedAvatar
                                      seed={targetBotForUser.avatar}
                                      size={14}
                                      className="rounded shrink-0"
                                    />
                                    <span className="truncate max-w-[140px]">
                                      @{targetBotForUser.name}
                                    </span>
                                  </Badge>
                                )}
                                {message.parts.map((part, index) => {
                                  if (part.type === "text") {
                                    const { cleanText, attachments: parsedAttachments } =
                                      extractAttachmentsFromText(part.text);

                                    return (
                                      <React.Fragment key={index}>
                                        <MessageAttachmentsView
                                          attachments={parsedAttachments}
                                        />
                                        {cleanText && (
                                          <div>{cleanText}</div>
                                        )}
                                      </React.Fragment>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3.5 w-full max-w-[96%] sm:max-w-[90%]">
                              {/* Bot avatar beside message on group chat */}
                              {isGroup && botForMessage && (
                                <div
                                  className="size-8 rounded-lg overflow-hidden shrink-0 mt-1 border border-border/60 bg-muted/40 flex items-center justify-center select-none"
                                  title={botForMessage.name}
                                >
                                  <SeedAvatar
                                    seed={botForMessage.avatar}
                                    size={32}
                                    alt={botForMessage.name}
                                  />
                                </div>
                              )}

                              <div className="flex flex-col gap-2.5 flex-1 min-w-0 items-start">
                                {/* Bot name label above message stream in group chat */}
                                {isGroup && botForMessage && (
                                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200 select-none pl-0.5">
                                    <span>{botForMessage.name}</span>
                                    {botForMessage.job && (
                                      <span className="text-zinc-400 font-normal text-xs sm:text-sm">
                                        · {botForMessage.job}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {message.parts.map((part, index) => {
                                  if (part.type === "text") {
                                    return (
                                      <div
                                        key={index}
                                        className="w-full text-base sm:text-lg leading-relaxed text-zinc-100 select-text py-1.5"
                                      >
                                        <ChatMarkdown content={part.text} />
                                      </div>
                                    );
                                  }
                                  if (part.type === "reasoning") {
                                    return (
                                      <Trace key={index} className="my-2">
                                        <TraceCollapsible defaultOpen={true}>
                                          <TraceCollapsibleTrigger>
                                            <TraceLine
                                              status={
                                                status === "streaming" && isLatestMessage
                                                  ? "running"
                                                  : undefined
                                              }
                                            >
                                              <TraceIcon>
                                                <BrainIcon className="size-4 text-zinc-400" />
                                              </TraceIcon>
                                              <TraceTitle className="text-sm sm:text-base font-semibold text-zinc-200">
                                                {status === "streaming" && isLatestMessage
                                                  ? "Sedang berpikir..."
                                                  : "Selesai berpikir"}
                                              </TraceTitle>
                                            </TraceLine>
                                          </TraceCollapsibleTrigger>
                                          <TraceCollapsibleContent className="mt-1.5 pl-4 text-sm text-zinc-300 whitespace-pre-wrap border-l-2 border-zinc-700 ml-2 py-2.5 leading-relaxed bg-zinc-950/60 rounded-r-lg font-mono">
                                            {part.text}
                                          </TraceCollapsibleContent>
                                        </TraceCollapsible>
                                      </Trace>
                                    );
                                  }
                                  if (isToolPart(part)) {
                                    return (
                                      <div key={index} className="w-full max-w-full min-w-0">
                                        <ChatToolView
                                          part={part}
                                          isStreaming={status === "streaming"}
                                        />
                                      </div>
                                    );
                                  }
                                  return null;
                                })}

                                {/* Live step & activity indicator while streaming */}
                                {!isUser && isLatestMessage && status === "streaming" && (
                                  <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-zinc-200 mt-2 select-none w-fit">
                                    <Loader2Icon className="size-4 text-zinc-400 animate-spin" />
                                    <span className="text-xs sm:text-sm text-zinc-300">
                                      {(() => {
                                        const lastPart =
                                          message.parts[message.parts.length - 1];
                                        if (lastPart?.type === "reasoning") {
                                          return "Sedang berpikir & merencanakan langkah...";
                                        }
                                        if (lastPart && isToolPart(lastPart)) {
                                          const tName = getToolName(lastPart);
                                          if (tName === "bash" || tName === "bash_exec")
                                            return "Sedang menjalankan perintah komputer...";
                                          if (tName === "readFile" || tName === "file_system")
                                            return "Sedang memeriksa berkas...";
                                          if (tName === "writeFile")
                                            return "Sedang menulis berkas...";
                                          if (tName === "computer_use" || tName === "mouseClick")
                                            return "Sedang mengoperasikan layar...";
                                          if (
                                            tName === "viewScreen" ||
                                            tName === "showScreen"
                                          )
                                            return "Sedang mengambil tampilan layar...";
                                          return `Sedang menjalankan: ${tName}...`;
                                        }
                                        return "Sedang mengetik jawaban...";
                                      })()}
                                    </span>
                                  </div>
                                )}

                                {/* Anti-ghosting feedback: if tools were executed but no text response was produced */}
                                {!isUser &&
                                  status !== "streaming" &&
                                  status !== "submitted" &&
                                  message.parts.some((p) => isToolPart(p)) &&
                                  !message.parts.some(
                                    (p) =>
                                      p.type === "text" &&
                                      p.text &&
                                      p.text.trim().length > 0
                                  ) && (
                                    <div className="w-fit max-w-full px-4 py-2 text-sm leading-relaxed rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-2.5 shadow-xs mt-1.5">
                                      <CheckCircle2Icon className="size-4 text-zinc-400 shrink-0" />
                                      <span>
                                        Tindakan selesai dikerjakan.
                                      </span>
                                    </div>
                                  )}
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
                        <div className="flex items-start gap-3 max-w-[92%] sm:max-w-[85%]">
                          {isGroup && selectedBot && (
                            <div
                              className="size-8 rounded-full overflow-hidden shrink-0 mt-1 border border-border/50 bg-muted/40 flex items-center justify-center select-none"
                              title={selectedBot.name}
                            >
                              <SeedAvatar
                                seed={selectedBot.avatar}
                                size={32}
                                alt={selectedBot.name}
                              />
                            </div>
                          )}
                          <div className="flex flex-col gap-1 items-start">
                            {isGroup && selectedBot && (
                              <span className="text-xs font-medium text-zinc-400 select-none pl-1">
                                {selectedBot.name}
                              </span>
                            )}
                            <div className="w-fit px-4 py-2.5 rounded-xl text-sm sm:text-base bg-zinc-900 border border-zinc-800 text-zinc-300 self-start flex items-center gap-2.5 shadow-xs">
                              <Loader2Icon className="size-4 animate-spin text-zinc-400 shrink-0" />
                              <span>Sedang memproses...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </MessageScrollerItem>
                  )}

                  {/* Error feedback banner */}
                  {error && (
                    <div className="flex w-full justify-start my-2">
                      <div className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%]">
                        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/25 p-3.5 text-xs text-rose-200 flex items-start gap-2.5 shadow-sm">
                          <AlertTriangleIcon className="size-4 text-rose-400 shrink-0 mt-0.5" />
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-rose-300">
                              ⚠️ Terjadi Gangguan / Gagal Merespon
                            </span>
                            <p className="text-neutral-300 leading-relaxed text-[11px]">
                              Koneksi ke model AI atau eksekusi tools mengalami kendala ({error.message || "Upstream endpoint timeout / error"}). Silakan coba kirim ulang atau cek pengaturan model di menu Settings.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      {/* Integrated Command Bar Composer */}
      <div className="p-4 sm:p-6 md:p-8 pt-2 w-full shrink-0 z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isLoading) {
              handleStop(e);
              return;
            }
            handleSubmit(e);
          }}
          className="w-full"
        >
          {/* Hidden file input for attachment picker */}
          <input
            type="file"
            ref={fileInputRef}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                addFilesToAttachments(Array.from(e.target.files));
              }
              e.target.value = "";
            }}
          />

          <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 focus-within:border-zinc-600 transition-colors p-4 sm:p-5 flex flex-col gap-3 shadow-md">
            {/* Attachment preview thumbnails */}
            <ComposerAttachmentStrip
              attachments={attachments}
              onRemove={handleRemoveAttachment}
              disabled={isLoading || isUploadingAttachments}
            />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                isGroup && selectedBot
                  ? `Tulis pesan untuk @${selectedBot.name}...`
                  : `Tulis pesan untuk ${botName}...`
              }
              aria-label={
                isGroup && selectedBot
                  ? `Pesan untuk ${selectedBot.name}`
                  : `Pesan untuk ${botName}`
              }
              disabled={isLoading || isUploadingAttachments}
              rows={1}
              className="w-full resize-none bg-transparent text-base sm:text-lg text-zinc-100 placeholder:text-zinc-500 outline-none border-none focus:outline-none focus:ring-0 min-h-[52px] max-h-44 leading-relaxed font-sans"
            />

            {/* Bottom toolbar inside the Command Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 mt-1">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploadingAttachments}
                  className="size-10 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                  title="Lampirkan berkas, ZIP, atau gambar"
                >
                  <PlusIcon className="size-5" />
                </button>

                {/* AI-elements dropdown for picking which bot to talk to in group chat */}
                {isGroup && memberBots.length > 0 && selectedBot && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      type="button"
                      className="flex items-center gap-2 h-10 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-sm font-medium border border-zinc-700/60 transition-colors cursor-pointer outline-none select-none"
                      title="Pilih bot tujuan"
                    >
                      <SeedAvatar
                        seed={selectedBot.avatar}
                        size={20}
                        className="rounded shrink-0"
                      />
                      <span className="truncate max-w-[120px] sm:max-w-[180px]">
                        @{selectedBot.name}
                      </span>
                      <ChevronDownIcon className="size-4 text-zinc-400 shrink-0" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      side="top"
                      sideOffset={6}
                      className="w-64 p-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-lg z-50 text-zinc-200"
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
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors select-none",
                                isSelected
                                  ? "bg-zinc-800 text-zinc-100 font-semibold"
                                  : "hover:bg-zinc-800/60 text-zinc-300"
                              )}
                            >
                              <SeedAvatar
                                seed={bot.avatar}
                                size={26}
                                className="rounded shrink-0"
                              />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="truncate font-semibold text-zinc-200 text-sm">
                                  {bot.name}
                                </span>
                                {bot.job && (
                                  <span className="text-xs text-zinc-400 truncate">
                                    {bot.job}
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <CheckIcon className="size-4 text-zinc-200 shrink-0" />
                              )}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Action buttons: Stop vs Execute */}
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    title="Hentikan proses"
                  >
                    <SquareIcon className="size-3.5 fill-zinc-300 text-zinc-300" />
                    <span>Hentikan</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={
                      (!input.trim() && attachments.length === 0) ||
                      isUploadingAttachments
                    }
                    className={cn(
                      "h-10 px-5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer",
                      input.trim() || attachments.length > 0
                        ? "bg-zinc-100 hover:bg-white text-zinc-950 border border-zinc-200 shadow-sm"
                        : "bg-zinc-800/60 text-zinc-500 cursor-not-allowed border border-transparent"
                    )}
                    title="Kirim pesan"
                  >
                    {isUploadingAttachments ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <span>Kirim</span>
                        <CornerDownLeftIcon className="size-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
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

  const deduplicatedInitialMessages = React.useMemo(() => {
    if (!transcriptMessages || transcriptMessages.length === 0) {
      return transcriptMessages;
    }
    const seen = new Map<string, number>();
    for (let i = 0; i < transcriptMessages.length; i++) {
      const msg = transcriptMessages[i];
      if (msg && msg.id) {
        seen.set(msg.id, i);
      }
    }
    return transcriptMessages.filter((msg, index) => {
      if (!msg || !msg.id) return false;
      return seen.get(msg.id) === index;
    });
  }, [transcriptMessages]);

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
      initialMessages={deduplicatedInitialMessages}
      transport={transport}
    />
  );
}

export default ChatBotView;
