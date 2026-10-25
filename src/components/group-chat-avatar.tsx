import * as React from "react";
import { SeedAvatar } from "@/components/seed-avatar";
import { cn } from "@/lib/utils";

export interface GroupChatAvatarProps {
  avatars: string[];
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * GroupChatAvatar displays up to 3 visible bot avatars and the remainder as a number badge (+N).
 * Layout variations in a square frame:
 * - 1 item: single avatar filling the square
 * - 2 items: side-by-side overlapping avatars
 * - 3 items: triangle pattern (1 top-center, 2 bottom-left & bottom-right)
 * - 4 items (3 avatars + count or 4 items): fills a 2x2 grid
 * Total footprint matches a standard single bot avatar (exact same width and height).
 */
export function GroupChatAvatar({
  avatars,
  size = 36,
  className,
  alt = "Group avatar",
}: GroupChatAvatarProps) {
  const safeAvatars = avatars.filter(Boolean);
  const total = safeAvatars.length;

  if (total === 0) {
    return (
      <div
        style={{ width: `${size}px`, height: `${size}px` }}
        className={cn(
          "rounded-full bg-neutral-800 border border-neutral-700/80 flex items-center justify-center shrink-0 select-none",
          className
        )}
      >
        <span
          style={{ fontSize: `${Math.max(8, Math.round(size * 0.35))}px` }}
          className="text-neutral-400 font-semibold"
        >
          #
        </span>
      </div>
    );
  }

  // Single avatar
  if (total === 1) {
    return (
      <SeedAvatar
        seed={safeAvatars[0]}
        size={size}
        className={className}
        alt={alt}
      />
    );
  }

  // 2 items: side-by-side overlapping
  if (total === 2) {
    const subSize = Math.max(12, Math.round(size * 0.68));
    const offset = Math.max(0, Math.round((size - subSize) / 2));

    return (
      <div
        style={{ width: `${size}px`, height: `${size}px` }}
        className={cn("relative shrink-0 overflow-hidden select-none", className)}
      >
        {/* Left item */}
        <div
          style={{
            width: `${subSize}px`,
            height: `${subSize}px`,
            left: 0,
            top: `${offset}px`,
          }}
          className="absolute z-10 rounded-full overflow-hidden"
        >
          <SeedAvatar seed={safeAvatars[0]} size={subSize} />
        </div>
        {/* Right item overlapping */}
        <div
          style={{
            width: `${subSize}px`,
            height: `${subSize}px`,
            right: 0,
            top: `${offset}px`,
          }}
          className="absolute z-20 rounded-full overflow-hidden ring-1.5 ring-background shadow-xs"
        >
          <SeedAvatar seed={safeAvatars[1]} size={subSize} />
        </div>
      </div>
    );
  }

  // 3 items: triangle pattern
  if (total === 3) {
    const subSize = Math.max(10, Math.round(size * 0.54));

    return (
      <div
        style={{ width: `${size}px`, height: `${size}px` }}
        className={cn("relative shrink-0 overflow-hidden select-none", className)}
      >
        {/* Top-center item */}
        <div
          style={{
            width: `${subSize}px`,
            height: `${subSize}px`,
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
          }}
          className="absolute z-10 rounded-full overflow-hidden"
        >
          <SeedAvatar seed={safeAvatars[0]} size={subSize} />
        </div>
        {/* Bottom-left item */}
        <div
          style={{
            width: `${subSize}px`,
            height: `${subSize}px`,
            bottom: 0,
            left: 0,
          }}
          className="absolute z-20 rounded-full overflow-hidden ring-1.5 ring-background shadow-xs"
        >
          <SeedAvatar seed={safeAvatars[1]} size={subSize} />
        </div>
        {/* Bottom-right item */}
        <div
          style={{
            width: `${subSize}px`,
            height: `${subSize}px`,
            bottom: 0,
            right: 0,
          }}
          className="absolute z-20 rounded-full overflow-hidden ring-1.5 ring-background shadow-xs"
        >
          <SeedAvatar seed={safeAvatars[2]} size={subSize} />
        </div>
      </div>
    );
  }

  // 4 items: fills a 2x2 grid (up to 3 visible avatars + remainder count badge)
  const subSize = Math.max(8, Math.round(size * 0.46));
  const visibleAvatars = safeAvatars.slice(0, 3);
  const remainder = total - 3;
  const badgeFontSize = Math.max(7, Math.round(subSize * 0.44));

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={cn(
        "grid grid-cols-2 grid-rows-2 gap-0.5 shrink-0 place-items-center select-none overflow-hidden",
        className
      )}
    >
      <div
        style={{ width: `${subSize}px`, height: `${subSize}px` }}
        className="rounded-full overflow-hidden flex items-center justify-center"
      >
        <SeedAvatar seed={visibleAvatars[0]} size={subSize} />
      </div>
      <div
        style={{ width: `${subSize}px`, height: `${subSize}px` }}
        className="rounded-full overflow-hidden flex items-center justify-center"
      >
        <SeedAvatar seed={visibleAvatars[1]} size={subSize} />
      </div>
      <div
        style={{ width: `${subSize}px`, height: `${subSize}px` }}
        className="rounded-full overflow-hidden flex items-center justify-center"
      >
        <SeedAvatar seed={visibleAvatars[2]} size={subSize} />
      </div>
      <div
        style={{
          width: `${subSize}px`,
          height: `${subSize}px`,
          fontSize: `${badgeFontSize}px`,
        }}
        className="rounded-full bg-neutral-800 text-neutral-200 border border-neutral-700/80 flex items-center justify-center font-bold leading-none select-none"
      >
        +{remainder}
      </div>
    </div>
  );
}

export default GroupChatAvatar;
