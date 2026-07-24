"use client"

import {
  Sparkles,
  Gauge,
  BarChart3,
  HeartHandshake,
  Users,
  ArrowUpRight,
  Search,
  TrendingUp,
  Palette,
} from "lucide-react";
import { useAudience, type Audience } from "./AudienceContext";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { SectionCta } from "./SectionCta";

type Card = {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
  bullets?: string[];
};

type Variant = {
  eyebrow: string;
  heading: React.ReactNode;
  sub: string;
  featured: Card;
  cards: Card[];
};

const content: Record<Audience, Variant> = {
  brands: {
    eyebrow: "Why Goheza",
    heading: (
      <>
        Why <span className="text-gradient-primary">Brands</span> Choose Goheza
      </>
    ),
    sub: "Launch creator campaigns at scale, only pay for performance, and manage thousands of creators from one platform.",
    featured: {
      title: "Performance-Based Pay",
      body: "Every dollar is tied to measurable results. Pay on attributed views and outcomes — no impressions, no guesswork, no wasted spend.",
      icon: Gauge,
    },
    cards: [
      {
        title: "Diverse Content Production",
        body: "Thousands of vetted creators deliver your brief in their own voice.",
        icon: Palette,
        bullets: ["Skits", "Reviews", "Tutorials", "Lifestyle"],
      },
      {
        title: "Real-Time Analytics",
        body: "Track views, engagement, and creator performance live. Make better decisions with real campaign data.",
        icon: BarChart3,
      },
      {
        title: "Direct Creator Partnerships",
        body: "Access creators directly — no agencies, no middlemen, no endless negotiations.",
        icon: Users,
      },
      {
        title: "SDG Impact & Youth Empowerment",
        body: "Every campaign contributes to UN Sustainable Development Goals (SDG 1: No Poverty and SDG 8: Decent Work & Economic Growth) by enabling youth employment, skills development, and financial inclusion through the creator economy.",
        icon: HeartHandshake,
      },
    ],
  },
  creators: {
    eyebrow: "Why Goheza",
    heading: (
      <>
        Why <span className="text-gradient-primary">Creators</span> Choose Goheza
      </>
    ),
    sub: "Monetize your content, access real brand opportunities, and earn based on the performance you actually drive.",
    featured: {
      title: "No Follower Requirements",
      body: "Whether you have 0 followers or millions, the better your content performs, the more you earn. Your income is directly tied to your creativity, no flat fees, no caps.",
      icon: TrendingUp,
    },
    cards: [
      {
        title: "Access Brand Campaigns",
        body: "Discover live opportunities from brands actively looking for creators. No cold outreach required.",
        icon: Search,
      },
      {
        title: "Build Your Portfolio",
        body: "Work with multiple brands and grow credibility through successful, verifiable campaigns.",
        icon: Sparkles,
      },
      {
        title: "Flexible Content Creation",
        body: "Create in your own style — your voice and creativity remain your advantage.",
        icon: Palette,
        bullets: ["Skits", "Reviews", "Tutorials", "Lifestyle"],
      },
      {
        title: "Fast & Reliable Payments",
        body: "Get paid promptly through secure payouts the moment your content delivers measurable results.",
        icon: Gauge,
      },
    ],
  },
};

export function WhyChoose() {
  const { audience } = useAudience();
  const data = content[audience];
  const headRef = useScrollReveal<HTMLDivElement>();
  const gridRef = useScrollReveal<HTMLDivElement>({ threshold: 0.05 });

  return (
    <section id="why-goheza" className="relative overflow-hidden py-16 sm:py-24">
      {/* warm ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-10%] -z-10 h-[420px] w-[520px] rounded-full blur-3xl"
        style={{ background: "oklch(0.745 0.175 22 / 0.16)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-10%] left-[-10%] -z-10 h-[420px] w-[520px] rounded-full blur-3xl"
        style={{ background: "oklch(0.70 0.14 295 / 0.12)" }}
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* header */}
        <div ref={headRef} className="reveal mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-elevated/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-signal)" }} />
            {data.eyebrow}
          </span>
          <h2 className="font-display mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-5xl lg:text-[56px]">
            {data.heading}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">{data.sub}</p>
        </div>

        {/* bento grid: 2 rows × 3 cols, featured spans both rows in col 3 */}
        <div
          ref={gridRef}
          className="reveal-scale mt-12 grid gap-4 sm:gap-5 lg:grid-cols-3 lg:grid-rows-2"
        >
          <CardTile card={data.cards[0]} delay={0} />
          <CardTile card={data.cards[1]} delay={80} />
          <FeaturedCard card={data.featured} ctaLabel={audience === "brands" ? "Launch My Campaign" : "Start Earning Today"} audience={audience} />
          <CardTile card={data.cards[2]} delay={160} />
          <CardTile card={data.cards[3]} delay={240} />
        </div>

        <SectionCta
          headline={
            audience === "brands"
              ? "Ready to launch your first performance campaign?"
              : "Ready to turn your content into real income?"
          }
        />
      </div>
    </section>
  );
}

function CardTile({
  card,
  delay,
  className = "",
  wide = false,
}: {
  card: Card;
  delay: number;
  className?: string;
  wide?: boolean;
}) {
  const Icon = card.icon;
  const ref = useScrollReveal<HTMLDivElement>({ threshold: 0.15 });
  return (
    <div
      ref={ref}
      className={`reveal group relative overflow-hidden rounded-[22px] border border-hairline bg-surface-elevated p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-card sm:p-7 ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* warm hover wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, oklch(0.745 0.175 22 / 0.10), transparent 55%)",
        }}
      />
      <div className="relative flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-[oklch(0.97_0.014_76)] text-ink-soft transition-colors duration-300 group-hover:border-[oklch(0.78_0.16_55_/_0.5)] group-hover:text-[oklch(0.55_0.18_45)]">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <h3 className={`font-display relative mt-6 font-semibold tracking-[-0.02em] text-ink ${wide ? "text-2xl sm:text-[26px]" : "text-xl sm:text-[22px]"}`}>
        {card.title}
      </h3>
      <p className="relative mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
        {card.body}
      </p>
      {card.bullets && (
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {card.bullets.map((b) => (
            <span
              key={b}
              className="rounded-full bg-[oklch(0.95_0.03_70)] px-2.5 py-1 text-[11px] font-medium text-ink-soft"
            >
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturedCard({ card, ctaLabel, audience }: { card: Card; ctaLabel: string; audience: "brands" | "creators" }) {
  const Icon = card.icon;
  const ref = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });
  return (
    <div
      ref={ref}
      className="reveal relative flex flex-col overflow-hidden rounded-[22px] p-7 text-[oklch(0.96_0.012_78)] shadow-elevated sm:p-9 lg:col-start-3 lg:row-span-2 lg:row-start-1"
      style={{
        background:
          "linear-gradient(160deg, oklch(0.24 0.04 268) 0%, oklch(0.18 0.025 265) 60%, oklch(0.22 0.03 268) 100%)",
      }}
    >
      {/* decorative orange glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "oklch(0.705 0.182 24 / 0.45)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full blur-3xl"
        style={{ background: "oklch(0.62 0.18 295 / 0.35)" }}
      />
      {/* dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(oklch(1 0 0 / 0.06) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      <div className="relative flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[oklch(0.85_0.12_55)] backdrop-blur">
          <Icon className="h-5 w-5" />
        </span>
        <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/70">
          Featured
        </span>
      </div>

      <h3 className="font-display relative mt-8 text-3xl font-semibold tracking-[-0.025em] sm:text-[34px]">
        {card.title}
      </h3>
      <p className="relative mt-4 max-w-sm text-[15px] leading-relaxed text-white/70">
        {card.body}
      </p>

      <div className="relative mt-auto pt-10">
        <a
          href={`/get-started?as=${audience === "brands" ? "brand" : "creator"}`}
          className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all duration-200 hover:scale-[1.03]"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          {ctaLabel}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </div>
    </div>
  );
}
