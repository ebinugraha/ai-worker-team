"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
} from "@/components/ui/code-block";
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
  BrainIcon,
  MousePointerClickIcon,
  KeyboardIcon,
  CommandIcon,
  ClockIcon,
  CheckCircle2Icon,
  PlayIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

interface ActionPayload {
  type?: "CLICK" | "TYPE" | "KEY" | "WAIT" | "FINISH" | string;
  x?: number;
  y?: number;
  text?: string;
  duration?: number;
  reason?: string;
}

function ActionCard({
  rawJson,
}: {
  rawJson: string;
  isComplete?: boolean;
}) {
  let parsed: ActionPayload | null = null;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    const typeMatch = rawJson.match(/"type"\s*:\s*"([^"]+)"/i);
    const reasonMatch = rawJson.match(/"reason"\s*:\s*"([^"]+)"/i);
    const textMatch = rawJson.match(/"text"\s*:\s*"([^"]+)"/i);
    const xMatch = rawJson.match(/"x"\s*:\s*(\d+)/i);
    const yMatch = rawJson.match(/"y"\s*:\s*(\d+)/i);
    const durationMatch = rawJson.match(/"duration"\s*:\s*(\d+)/i);
    parsed = {
      type: typeMatch ? typeMatch[1] : undefined,
      reason: reasonMatch ? reasonMatch[1] : undefined,
      text: textMatch ? textMatch[1] : undefined,
      x: xMatch ? parseInt(xMatch[1], 10) : undefined,
      y: yMatch ? parseInt(yMatch[1], 10) : undefined,
      duration: durationMatch ? parseInt(durationMatch[1], 10) : undefined,
    };
  }

  const type = (parsed?.type || "").toUpperCase();

  const getBadgeStyle = () => {
    return "bg-zinc-800 text-zinc-200 border-zinc-700";
  };

  const getIcon = () => {
    switch (type) {
      case "CLICK":
        return <MousePointerClickIcon className="size-4 text-zinc-300" />;
      case "TYPE":
        return <KeyboardIcon className="size-4 text-zinc-300" />;
      case "KEY":
        return <CommandIcon className="size-4 text-zinc-300" />;
      case "WAIT":
        return <ClockIcon className="size-4 text-zinc-300" />;
      case "FINISH":
        return <CheckCircle2Icon className="size-4 text-zinc-300" />;
      default:
        return <PlayIcon className="size-4 text-zinc-300" />;
    }
  };

  return (
    <div className="my-3 rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-xs transition-all">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Aksi
        </span>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs sm:text-sm font-semibold border",
            getBadgeStyle()
          )}
        >
          {getIcon()}
          <span>{type || "RUN"}</span>
        </div>

        {parsed?.x !== undefined && parsed?.y !== undefined && (
          <span className="inline-flex items-center text-xs sm:text-sm font-mono text-zinc-300 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-md">
            x: {parsed.x}, y: {parsed.y}
          </span>
        )}

        {parsed?.text && (
          <span className="inline-flex items-center text-xs sm:text-sm font-mono text-zinc-300 bg-zinc-950 border border-zinc-800 px-3 py-1 rounded-md max-w-sm truncate">
            {parsed.text}
          </span>
        )}

        {parsed?.duration !== undefined && (
          <span className="inline-flex items-center text-xs sm:text-sm font-mono text-zinc-300 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-md">
            {parsed.duration}s
          </span>
        )}
      </div>

      {parsed?.reason && (
        <p className="mt-3 text-xs sm:text-sm text-zinc-300 leading-relaxed italic border-t border-zinc-800 pt-2.5">
          {parsed.reason}
        </p>
      )}
    </div>
  );
}

function ThoughtCard({
  content,
  isComplete,
}: {
  content: string;
  isComplete?: boolean;
}) {
  return (
    <Trace className="my-2.5">
      <TraceCollapsible defaultOpen={true}>
        <TraceCollapsibleTrigger>
          <TraceLine status={!isComplete ? "running" : undefined}>
            <TraceIcon>
              <BrainIcon className="size-4 text-zinc-400" />
            </TraceIcon>
            <TraceTitle className="text-sm sm:text-base font-semibold text-zinc-200">
              {!isComplete
                ? "Sedang berpikir..."
                : "Selesai berpikir"}
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="mt-1.5 pl-4 text-sm text-zinc-300 whitespace-pre-wrap border-l-2 border-zinc-700 ml-2 py-2.5 leading-relaxed bg-zinc-950/60 rounded-r-lg font-mono">
          {content}
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}

function parseContentSegments(raw: string): Array<{
  type: "text" | "thought" | "action";
  content: string;
  isComplete: boolean;
}> {
  if (!raw) return [];
  if (!/<thought|<action/i.test(raw)) {
    return [{ type: "text", content: raw, isComplete: true }];
  }

  const segments: Array<{
    type: "text" | "thought" | "action";
    content: string;
    isComplete: boolean;
  }> = [];

  const regex =
    /(<thought>[\s\S]*?(?:<\/thought>|$)|<action>[\s\S]*?(?:<\/action>|$))/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      const text = raw.slice(lastIndex, match.index);
      if (text.trim()) {
        segments.push({ type: "text", content: text, isComplete: true });
      }
    }
    const chunk = match[0];
    if (chunk.toLowerCase().startsWith("<thought>")) {
      const isComplete = chunk.toLowerCase().endsWith("</thought>");
      const inner = chunk
        .replace(/^<thought>/i, "")
        .replace(/<\/thought>$/i, "");
      segments.push({ type: "thought", content: inner.trim(), isComplete });
    } else if (chunk.toLowerCase().startsWith("<action>")) {
      const isComplete = chunk.toLowerCase().endsWith("</action>");
      const inner = chunk
        .replace(/^<action>/i, "")
        .replace(/<\/action>$/i, "");
      segments.push({ type: "action", content: inner.trim(), isComplete });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    const text = raw.slice(lastIndex);
    if (text.trim()) {
      segments.push({ type: "text", content: text, isComplete: true });
    }
  }

  return segments;
}

export const ChatMarkdown = React.memo(function ChatMarkdown({
  content,
  className,
}: ChatMarkdownProps) {
  const segments = React.useMemo(
    () => parseContentSegments(content),
    [content]
  );

  return (
    <div
      className={cn(
        "text-base sm:text-[17px] leading-relaxed break-words space-y-2.5 select-text",
        className
      )}
    >
      {segments.map((seg, idx) => {
        if (seg.type === "thought") {
          return (
            <ThoughtCard
              key={idx}
              content={seg.content}
              isComplete={seg.isComplete}
            />
          );
        }
        if (seg.type === "action") {
          return (
            <ActionCard
              key={idx}
              rawJson={seg.content}
              isComplete={seg.isComplete}
            />
          );
        }
        return (
          <ReactMarkdown
            key={idx}
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-5 mb-2.5 first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-4 mb-2 first:mt-0 border-b border-border/40 pb-1.5">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mt-3 mb-1.5 first:mt-0">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-base sm:text-lg font-semibold text-foreground mt-2.5 mb-1 first:mt-0">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="leading-relaxed mb-2.5 last:mb-0 text-foreground/90">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-foreground/90">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-foreground/90">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-border/80 pl-3.5 my-2.5 italic text-muted-foreground">
                  {children}
                </blockquote>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">
                  {children}
                </strong>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                >
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-3.5 w-full">
                  <table className="w-full text-left border-collapse border border-border text-sm sm:text-base">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted/50 border-b border-border font-semibold">
                  {children}
                </thead>
              ),
              tbody: ({ children }) => (
                <tbody className="divide-y divide-border">{children}</tbody>
              ),
              tr: ({ children }) => (
                <tr className="hover:bg-muted/20">{children}</tr>
              ),
              th: ({ children }) => (
                <th className="p-2.5 font-semibold text-foreground">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="p-2.5 text-foreground/90">{children}</td>
              ),
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const codeString = String(children).replace(/\n$/, "");
                const isInline = !match && !codeString.includes("\n");

                if (isInline) {
                  return (
                    <code
                      className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm sm:text-[15px] font-semibold text-foreground"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }

                const language = match ? match[1] : undefined;

                return (
                  <CodeBlock size="default" className="my-3 not-prose w-full">
                    <CodeBlockHeader>
                      <CodeBlockTitle>
                        {language ? language.toUpperCase() : "CODE"}
                      </CodeBlockTitle>
                      <CodeBlockActions>
                        <CodeBlockCopyButton value={codeString} />
                      </CodeBlockActions>
                    </CodeBlockHeader>
                    <CodeBlockContent
                      wrap
                      className="max-h-96 font-mono text-sm leading-relaxed"
                    >
                      {codeString}
                    </CodeBlockContent>
                  </CodeBlock>
                );
              },
            }}
          >
            {seg.content}
          </ReactMarkdown>
        );
      })}
    </div>
  );
});

export default ChatMarkdown;
