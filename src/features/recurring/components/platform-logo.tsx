"use client";

import type { ComponentType, SVGProps } from "react";
import {
  TbBrandAdobe,
  TbBrandAmazon,
  TbBrandApple,
  TbBrandDisney,
  TbBrandGithubCopilot,
  TbBrandGoogleOne,
  TbBrandNetflix,
  TbBrandOpenai,
  TbBrandSpotify,
  TbBrandYoutube,
} from "react-icons/tb";
import {
  SiClaude,
  SiCursor,
  SiGooglegemini,
  SiIcloud,
  SiMax,
  SiPerplexity,
  SiPlaystation,
} from "react-icons/si";

import type { PlatformTemplateId } from "@/features/recurring/catalog/platform-templates";
import { cn } from "@/lib/utils";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

const PLATFORM_ICONS: Record<
  PlatformTemplateId,
  ComponentType<IconProps>
> = {
  netflix: TbBrandNetflix,
  spotify: TbBrandSpotify,
  "disney-plus": TbBrandDisney,
  max: SiMax,
  "youtube-premium": TbBrandYoutube,
  "amazon-prime": TbBrandAmazon,
  apple: TbBrandApple,
  playstation: SiPlaystation,
  adobe: TbBrandAdobe,
  openai: TbBrandOpenai,
  claude: SiClaude,
  gemini: SiGooglegemini,
  "github-copilot": TbBrandGithubCopilot,
  cursor: SiCursor,
  perplexity: SiPerplexity,
  icloud: SiIcloud,
  "google-one": TbBrandGoogleOne,
};

/**
 * Brand fills for recognition on template tiles.
 * Omit for monochrome marks so they use `text-foreground` (visible in light/dark).
 */
const PLATFORM_BRAND_COLOR: Partial<
  Record<PlatformTemplateId, string>
> = {
  netflix: "#E50914",
  spotify: "#1DB954",
  "disney-plus": "#113CCF",
  max: "#002BE7",
  "youtube-premium": "#FF0000",
  "amazon-prime": "#FF9900",
  apple: "#A2AAAD",
  playstation: "#003791",
  adobe: "#FF0000",
  openai: "#10A37F",
  claude: "#D97757",
  gemini: "#8E75B2",
  perplexity: "#20808D",
  icloud: "#3693F3",
  "google-one": "#4285F4",
};

type PlatformLogoProps = {
  id: PlatformTemplateId;
  /** Accessible name; when set, icon is not decorative. */
  label?: string;
  className?: string;
  /** Icon glyph size class (default size-5). */
  iconClassName?: string;
};

/**
 * Brand mark for a platform template tile (colored logo glyph).
 */
export function PlatformLogo({
  id,
  label,
  className,
  iconClassName,
}: PlatformLogoProps) {
  const Icon = PLATFORM_ICONS[id];
  const brandColor = PLATFORM_BRAND_COLOR[id];

  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background",
        className,
      )}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <Icon
        className={cn(
          "size-5",
          brandColor ? undefined : "text-foreground",
          iconClassName,
        )}
        style={brandColor ? { color: brandColor } : undefined}
        aria-hidden
      />
    </span>
  );
}
