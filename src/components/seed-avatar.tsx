import { Style, Avatar } from "@dicebear/core";
import gazeDefinition from "@dicebear/styles/gaze.json";
import { cn } from "@/lib/utils";

// Initialize Gaze style definition
const gazeStyle = new Style(gazeDefinition as unknown as ConstructorParameters<typeof Style>[0]);

export interface SeedAvatarProps {
  seed: string;
  size?: number;
  className?: string;
  alt?: string;
}

export function SeedAvatar({
  seed,
  size = 32,
  className,
  alt = "avatar",
}: SeedAvatarProps) {
  const avatar = new Avatar(gazeStyle, {
    seed: seed || "default",
  });
  const dataUri = avatar.toDataUri();

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUri}
      alt={alt}
      width={size}
      height={size}
      className={cn("inline-block shrink-0 rounded-full select-none", className)}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}

export default SeedAvatar;
