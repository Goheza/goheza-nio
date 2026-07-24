"use client"

/**
 * Brand / platform SVG marks. Each accepts standard SVG props.
 * Logos use their official colors when no `className` overrides fill.
 */
import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number };

const sized = ({ size = 20, ...rest }: Props) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true,
  ...rest,
});

export function TikTokLogo(p: Props) {
  return (
    <svg {...sized(p)}>
      <path
        fill="currentColor"
        d="M16.5 3a5.5 5.5 0 0 0 4 4v3a8.5 8.5 0 0 1-4-1v6.25a5.75 5.75 0 1 1-5.75-5.75c.26 0 .5.02.75.06v3.13a2.75 2.75 0 1 0 2 2.65V3h3Z"
      />
    </svg>
  );
}

export function InstagramLogo(p: Props) {
  const id = "ig-grad";
  return (
    <svg {...sized(p)}>
      <defs>
        <radialGradient id={id} cx="0.3" cy="1" r="1">
          <stop offset="0%" stopColor="#FED576" />
          <stop offset="35%" stopColor="#F47133" />
          <stop offset="70%" stopColor="#BC3081" />
          <stop offset="100%" stopColor="#4C63D2" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill={`url(#${id})`} />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="#fff" />
    </svg>
  );
}

export function YouTubeLogo(p: Props) {
  return (
    <svg {...sized(p)}>
      <rect x="1.5" y="5" width="21" height="14" rx="3.5" fill="#FF0000" />
      <path d="M10 9.2v5.6l5-2.8-5-2.8Z" fill="#fff" />
    </svg>
  );
}

export function FacebookLogo(p: Props) {
  return (
    <svg {...sized(p)}>
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path
        d="M13.5 21.95V14h2.4l.45-3H13.5V9.2c0-.86.3-1.45 1.55-1.45h1.6V5.13c-.78-.1-1.6-.16-2.34-.16-2.4 0-4.05 1.46-4.05 4.14V11H7.8v3h2.46v7.95a10 10 0 0 0 3.24 0Z"
        fill="#fff"
      />
    </svg>
  );
}

export function XLogo(p: Props) {
  return (
    <svg {...sized(p)}>
      <rect width="24" height="24" rx="5" fill="#000" />
      <path
        fill="#fff"
        d="M17.5 5h2.3l-5 5.7L21 19h-4.6l-3.6-4.7L8.6 19H6.3l5.4-6.1L5.7 5h4.7l3.3 4.4L17.5 5Zm-.8 12.6h1.3L9.4 6.3H8L16.7 17.6Z"
      />
    </svg>
  );
}

export function LinkedInLogo(p: Props) {
  return (
    <svg {...sized(p)}>
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path
        fill="#fff"
        d="M7.2 9.4h2.5V18H7.2V9.4Zm1.25-3.8a1.45 1.45 0 1 1 0 2.9 1.45 1.45 0 0 1 0-2.9ZM11.4 9.4h2.4v1.18h.03c.34-.6 1.16-1.23 2.39-1.23 2.55 0 3.02 1.6 3.02 3.7V18H16.8v-4.16c0-.99-.02-2.27-1.4-2.27-1.4 0-1.62 1.07-1.62 2.2V18H11.4V9.4Z"
      />
    </svg>
  );
}

export function GoogleLogo(p: Props) {
  return (
    <svg {...sized(p)}>
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.66-.06-1.3-.17-1.92H12v3.64h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.22c1.88-1.73 2.98-4.28 2.98-7.25Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.22-2.5c-.9.6-2.04.95-3.4.95-2.61 0-4.82-1.76-5.61-4.13H3.07v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.9a6.01 6.01 0 0 1 0-3.8V7.51H3.07a10 10 0 0 0 0 8.98l3.32-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.97c1.47 0 2.79.5 3.83 1.5l2.86-2.85C16.97 3 14.7 2 12 2A10 10 0 0 0 3.07 7.51l3.32 2.59C7.18 7.73 9.39 5.97 12 5.97Z"
      />
    </svg>
  );
}

export function AppleLogo(p: Props) {
  return (
    <svg {...sized(p)}>
      <path
        fill="currentColor"
        d="M16.36 12.66c-.03-2.85 2.33-4.22 2.44-4.29-1.34-1.95-3.4-2.22-4.13-2.25-1.76-.18-3.43 1.04-4.32 1.04-.9 0-2.27-1.02-3.74-.99-1.92.03-3.7 1.12-4.7 2.84-2 3.48-.51 8.62 1.44 11.45.95 1.38 2.08 2.93 3.56 2.88 1.43-.06 1.97-.93 3.7-.93 1.73 0 2.21.93 3.72.9 1.54-.03 2.51-1.41 3.45-2.8 1.08-1.6 1.53-3.14 1.55-3.22-.03-.01-2.97-1.14-3-4.53ZM13.6 4.45c.78-.95 1.31-2.27 1.16-3.58-1.13.05-2.5.75-3.31 1.7-.73.84-1.36 2.18-1.19 3.48 1.26.1 2.55-.65 3.34-1.6Z"
      />
    </svg>
  );
}

export const PROVIDER_LOGOS = {
  tiktok: TikTokLogo,
  instagram: InstagramLogo,
  youtube: YouTubeLogo,
  facebook: FacebookLogo,
  x: XLogo,
  linkedin: LinkedInLogo,
  google: GoogleLogo,
  apple: AppleLogo,
} as const;

export type ProviderId = keyof typeof PROVIDER_LOGOS;
