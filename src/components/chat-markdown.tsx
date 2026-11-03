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
  PlayIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HighlightedCode } from "@/components/ui/highlighted-code";

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

  if (type === "FINISH") {
    return null;
  }

  const getBadgeStyle = () => {
    return "bg-zinc-800 text-zinc-200 border-zinc-700/80";
  };

  const getIcon = () => {
    switch (type) {
      case "CLICK":
        return <MousePointerClickIcon className="size-3.5 text-zinc-300" />;
      case "TYPE":
        return <KeyboardIcon className="size-3.5 text-zinc-300" />;
      case "KEY":
        return <CommandIcon className="size-3.5 text-zinc-300" />;
      case "WAIT":
        return <ClockIcon className="size-3.5 text-zinc-300" />;
      default:
        return <PlayIcon className="size-3.5 text-zinc-300" />;
    }
  };

  return (
    <div className="my-2 rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-3 shadow-xs transition-all">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
          AKSI
        </span>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border",
            getBadgeStyle()
          )}
        >
          {getIcon()}
          <span>{type || "RUN"}</span>
        </div>

        {parsed?.x !== undefined && parsed?.y !== undefined && (
          <span className="inline-flex items-center text-xs font-mono text-zinc-300 bg-zinc-950/80 border border-zinc-800 px-2 py-0.5 rounded-md">
            x: {parsed.x}, y: {parsed.y}
          </span>
        )}

        {parsed?.text && (
          <span className="inline-flex items-center text-xs font-mono text-zinc-300 bg-zinc-950/80 border border-zinc-800 px-2.5 py-0.5 rounded-md max-w-sm truncate">
            {parsed.text}
          </span>
        )}

        {parsed?.duration !== undefined && (
          <span className="inline-flex items-center text-xs font-mono text-zinc-300 bg-zinc-950/80 border border-zinc-800 px-2 py-0.5 rounded-md">
            {parsed.duration}s
          </span>
        )}
      </div>

      {parsed?.reason && (
        <p className="mt-2 text-xs text-zinc-400 leading-relaxed italic border-t border-zinc-800/60 pt-1.5">
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
    <Trace className="my-2">
      <TraceCollapsible defaultOpen={true}>
        <TraceCollapsibleTrigger>
          <TraceLine status={!isComplete ? "running" : undefined}>
            <TraceIcon>
              <BrainIcon className="size-3.5 text-zinc-400" />
            </TraceIcon>
            <TraceTitle className="text-xs sm:text-sm font-semibold text-zinc-200">
              {!isComplete
                ? "Sedang menalar..."
                : "Proses Penalaran (Thought)"}
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="mt-1.5 pl-3.5 text-xs text-zinc-300 whitespace-pre-wrap border-l-2 border-zinc-700/80 ml-1 py-2.5 leading-relaxed bg-[#08080a] border border-zinc-800/60 rounded-r-xl font-mono select-text">
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
        "text-[15px] sm:text-base leading-relaxed break-words space-y-2.5 select-text text-zinc-100 font-sans",
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
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-4 mb-2 first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground mt-3.5 mb-1.5 first:mt-0 border-b border-border/40 pb-1">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base sm:text-lg font-semibold text-foreground mt-3 mb-1 first:mt-0">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-sm sm:text-base font-semibold text-foreground mt-2 mb-1 first:mt-0">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="leading-relaxed mb-2 last:mb-0 text-zinc-200">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 my-2 space-y-1 text-zinc-200">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 my-2 space-y-1 text-zinc-200">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-zinc-700 pl-3.5 my-2 italic text-zinc-400">
                  {children}
                </blockquote>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-zinc-100">
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
                <div className="my-4 w-full overflow-x-auto rounded-2xl border border-zinc-800/40 bg-[#121316] shadow-xs select-text scrollbar-thin">
                  <table className="w-full min-w-full text-left border-collapse text-xs sm:text-[13px]">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-[#1a1b1e] border-b border-zinc-800/50 select-none">
                  {children}
                </thead>
              ),
              tbody: ({ children }) => (
                <tbody className="divide-y divide-zinc-800/40">{children}</tbody>
              ),
              tr: ({ children }) => (
                <tr className="hover:bg-zinc-800/30 transition-colors">{children}</tr>
              ),
              th: ({ children }) => (
                <th className="px-4 py-3 font-medium text-zinc-200 whitespace-nowrap tracking-tight font-sans">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-3 text-zinc-300 leading-relaxed font-sans align-top">
                  {children}
                </td>
              ),
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const codeString = String(children).replace(/\n$/, "");
                const isInline = !match && !codeString.includes("\n");

                if (isInline) {
                  return (
                    <code
                      className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-xs font-medium text-zinc-200 border border-zinc-700/50"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }

                const language = match ? match[1] : undefined;

                return (
                  <CodeBlock
                    size="sm"
                    className="my-3 not-prose w-full rounded-2xl border border-zinc-800/40 bg-[#121316] overflow-hidden shadow-xs"
                  >
                    <CodeBlockHeader className="bg-[#1a1b1e] border-b border-zinc-800/40 px-4 py-2.5">
                      <CodeBlockTitle className="font-mono text-xs text-zinc-300">
                        {language ? language.toLowerCase() : "code"}
                      </CodeBlockTitle>
                      <CodeBlockActions>
                        <CodeBlockCopyButton value={codeString} />
                      </CodeBlockActions>
                    </CodeBlockHeader>
                    <CodeBlockContent
                      wrap
                      className="p-4 font-mono text-xs sm:text-[13px] leading-relaxed text-[#f8f8f2]"
                    >
                      <HighlightedCode code={codeString} language={language || "text"} />
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
