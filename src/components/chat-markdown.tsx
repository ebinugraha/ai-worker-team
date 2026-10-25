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
import { cn } from "@/lib/utils";

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

export const ChatMarkdown = React.memo(function ChatMarkdown({
  content,
  className,
}: ChatMarkdownProps) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed break-words space-y-2 select-text",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold tracking-tight text-foreground mt-4 mb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold tracking-tight text-foreground mt-3 mb-1.5 first:mt-0 border-b border-border/40 pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-foreground mt-2.5 mb-1 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-foreground mt-2 mb-1 first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="leading-relaxed mb-2 last:mb-0 text-foreground/90">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1 text-foreground/90">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 text-foreground/90">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border/80 pl-3 my-2 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
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
            <div className="overflow-x-auto my-3 w-full">
              <table className="w-full text-left border-collapse border border-border text-xs sm:text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50 border-b border-border">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border">{children}</tbody>
          ),
          tr: ({ children }) => <tr className="hover:bg-muted/20">{children}</tr>,
          th: ({ children }) => (
            <th className="p-2 font-medium text-foreground">{children}</th>
          ),
          td: ({ children }) => (
            <td className="p-2 text-foreground/90">{children}</td>
          ),
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            const isInline = !match && !codeString.includes("\n");

            if (isInline) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const language = match ? match[1] : undefined;

            return (
              <CodeBlock size="sm" className="my-2.5 not-prose w-full">
                <CodeBlockHeader>
                  <CodeBlockTitle>
                    {language ? language.toUpperCase() : "CODE"}
                  </CodeBlockTitle>
                  <CodeBlockActions>
                    <CodeBlockCopyButton value={codeString} />
                  </CodeBlockActions>
                </CodeBlockHeader>
                <CodeBlockContent wrap className="max-h-80 font-mono text-xs">
                  {codeString}
                </CodeBlockContent>
              </CodeBlock>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default ChatMarkdown;
