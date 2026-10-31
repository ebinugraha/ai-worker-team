/**
 * Strips all markdown syntax, HTML tags, and metadata comments from text,
 * producing clean, natural plain text suitable for preview chips, sidebars, and notifications.
 */
export function stripMarkdown(text: string | null | undefined): string {
  if (!text) return "";

  return text
    // 0. Remove thought and action tags
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<thought>[\s\S]*$/gi, "")
    .replace(/<action>[\s\S]*?<\/action>/gi, (match) => {
      try {
        const jsonStr = match.replace(/<\/?action>/gi, "").trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.reason) return `Action: ${parsed.type || "Run"} (${parsed.reason})`;
        if (parsed.type) return `Action: ${parsed.type}`;
      } catch {}
      return "";
    })
    .replace(/<action>[\s\S]*$/gi, "")
    // 1. Remove HTML comments (e.g. <!--attachments:...-->)
    .replace(/<!--[\s\S]*?-->/g, "")
    // 2. Remove user attachment blocks
    .replace(/\[LAMPIRAN PENGGUNA\][\s\S]*$/, "")
    // 3. Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, "")
    // 4. Remove inline code backticks while preserving code content
    .replace(/`([^`]+)`/g, "$1")
    // 5. Remove images ![alt](url) -> ""
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "")
    // 6. Replace links [text](url) -> "text"
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // 7. Remove bold syntax: **word** or __word__ -> word
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    // 8. Remove italic syntax: *word* or _word_ -> word
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/(^|\s)_([^_]+)_(\s|$)/g, "$1$2$3")
    // 9. Remove strikethrough: ~~word~~ -> word
    .replace(/~~([^~]+)~~/g, "$1")
    // 10. Remove markdown headers (#, ##, ###, etc.)
    .replace(/^#+\s+/gm, "")
    // 11. Remove blockquotes
    .replace(/^>\s+/gm, "")
    // 12. Remove list bullets (- , * , + )
    .replace(/^[-*+]\s+/gm, "")
    // 13. Remove numbered list prefixes (1. , 2. )
    .replace(/^\d+\.\s+/gm, "")
    // 14. Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // 15. Strip any leftover standalone asterisks or markdown tokens
    .replace(/[*~`#]/g, "")
    // 16. Collapse multiple whitespace and newlines into a single space
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Prepares a clean preview snippet bounded by maxLength (default 140 chars).
 */
export function formatChatPreview(
  text: string | null | undefined,
  maxLength = 140
): string {
  const cleaned = stripMarkdown(text);
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trim() + "...";
}
