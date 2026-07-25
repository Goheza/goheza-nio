"use client"

import { ArrowRight } from "lucide-react";
import { useAudience, type Audience } from "./AudienceContext";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const avatars = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces&q=80",
  "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=120&h=120&fit=crop&crop=faces&q=80",
  "https://images.unsplash.com/photo-1546961342-1a423d4d0641?w=120&h=120&fit=crop&crop=faces&q=80",
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&h=120&fit=crop&crop=faces&q=80",
  "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=120&h=120&fit=crop&crop=faces&q=80",
];

export function SectionCta({
  headline,
  audience: forcedAudience,
}: {
  headline?: string;
  audience?: Audience;
}) {
  const ctx = useAudience();
  const audience = forcedAudience ?? ctx.audience;
  const ref = useScrollReveal<HTMLDivElement>();
  const label = audience === "brands" ? "Launch My Campaign" : "Start Earning Today";
  const trust =
    audience === "brands"
      ? "Trusted by leading brands and 1,000+ creators"
      : "Trusted by 1,000+ Creators";

  return (
    <div ref={ref} className="reveal mt-12 flex flex-col items-center text-center">
      {headline && (
        <p className="font-display mx-auto mb-6 max-w-xl text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
          {headline}
        </p>
      )}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-2 top-2 -z-10 h-10 rounded-full blur-2xl"
          style={{ background: "oklch(0.705 0.182 24 / 0.5)" }}
        />
        <a
          href={`/app/get-started?as=${audience === "brands" ? "brand" : "creator"}`}
          className="group inline-flex items-center gap-2 rounded-full bg-primary px-9 py-4 text-base font-semibold text-primary-foreground shadow-glow transition-all duration-200 hover:scale-[1.03] hover:brightness-[1.05]"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          {label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
      <div className="mt-6 flex flex-col items-center gap-2.5">
        <div className="flex -space-x-2">
          {avatars.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              className="h-7 w-7 rounded-full object-cover ring-2 ring-[var(--color-background)]"
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <span className="text-[oklch(0.72_0.185_52)]" aria-hidden>
            ★★★★★
          </span>
          <span>{trust}</span>
        </div>
      </div>
    </div>
  );
}
