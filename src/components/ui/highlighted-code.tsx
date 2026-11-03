"use client";

import * as React from "react";
import { useHighlightedCode } from "@/hooks/use-highlighted-code";
import { cn } from "@/lib/utils";

export interface HighlightedCodeProps {
  code: string;
  language?: string;
  className?: string;
}

export function HighlightedCode({
  code,
  language = "bash",
  className,
}: HighlightedCodeProps) {
  const lines = useHighlightedCode(code, language);

  return (
    <span className={cn("font-mono text-inherit", className)}>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < lines.length - 1 && "\n"}
        </React.Fragment>
      ))}
    </span>
  );
}
