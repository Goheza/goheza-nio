"use client"

import { ArrowUpRight, Clock } from "lucide-react";
import { useAudience } from "./AudienceContext";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingTime: string;
  date: string;
  cover: string;
};

const brandPosts: Post[] = [
  {
    slug: "scaling-creator-campaigns",
    title: "Scaling Performance Creator Campaigns Without Losing Brand Voice",
    excerpt: "How modern growth teams orchestrate hundreds of creators while protecting brand identity and unit economics.",
    category: "Strategy",
    readingTime: "6 min read",
    date: "Apr 14, 2026",
    cover: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&q=80",
  },
  {
    slug: "performance-pricing-models",
    title: "Why Performance Pricing Beats Retainers in 2026",
    excerpt: "A teardown of CPM, CPI, and outcome-based payouts — and why brands are migrating fast.",
    category: "Insights",
    readingTime: "4 min read",
    date: "Apr 10, 2026",
    cover: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
  },
  {
    slug: "ugc-quality-checklist",
    title: "The 9-Point UGC Quality Checklist We Use Internally",
    excerpt: "Run every creator video through this rubric before pushing it live to paid.",
    category: "Tips & Tricks",
    readingTime: "5 min read",
    date: "Apr 06, 2026",
    cover: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&q=80",
  },
  {
    slug: "attribution-that-works",
    title: "Attribution That Actually Works for Creator Performance",
    excerpt: "The stack we recommend to tie every install and sale back to the creator that drove it.",
    category: "Announcement",
    readingTime: "3 min read",
    date: "Apr 01, 2026",
    cover: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",
  },
];

const creatorPosts: Post[] = [
  {
    slug: "earn-more-from-content",
    title: "How Top Creators Are Earning 5× More on Performance Briefs",
    excerpt: "A breakdown of the formats, hooks, and posting cadence behind the highest-paid Goheza creators this quarter.",
    category: "Inspiration",
    readingTime: "7 min read",
    date: "Apr 14, 2026",
    cover: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1600&q=80",
  },
  {
    slug: "pitch-perfect-applications",
    title: "Write Pitch-Perfect Applications That Brands Approve",
    excerpt: "Small changes to your application that dramatically increase approval rates and unlock bigger budgets.",
    category: "Tips & Tricks",
    readingTime: "4 min read",
    date: "Apr 11, 2026",
    cover: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=1200&q=80",
  },
  {
    slug: "hooks-that-convert",
    title: "Hooks That Convert: The First 3 Seconds Rule",
    excerpt: "Why the opening of your video is worth more than the next 30 — and how to nail it consistently.",
    category: "Inspiration",
    readingTime: "5 min read",
    date: "Apr 08, 2026",
    cover: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&q=80",
  },
  {
    slug: "payouts-explained",
    title: "Goheza Payouts, Explained End-to-End",
    excerpt: "A transparent look at how, when, and at what rate creators are paid for the views they drive.",
    category: "Announcement",
    readingTime: "3 min read",
    date: "Apr 03, 2026",
    cover: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=1200&q=80",
  },
];

export function Blog() {
  const { audience } = useAudience();
  const posts = audience === "brands" ? brandPosts : creatorPosts;
  const [featured, ...rest] = posts;
  const headRef = useScrollReveal<HTMLDivElement>();
  const featuredRef = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });
  const listRef = useScrollReveal<HTMLDivElement>({ threshold: 0.05 });

  return (
    <section id="blog" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div ref={headRef} className="reveal mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-hairline bg-surface-elevated px-3 py-1 text-[12px] font-medium text-ink-soft">
            Articles
          </span>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-5xl lg:text-[64px]">
            Latest Insights
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Stories, tactics, and product updates from the Goheza team.
          </p>
          <a href="#blog" className="group mt-6 inline-flex items-center gap-2 text-base font-medium text-ink hover:text-[oklch(0.55_0.18_45)]">
            Browse all
            <ArrowUpRight className="h-4 w-4 text-[var(--color-signal)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Featured large article */}
          <a ref={featuredRef as never} href={`/blog/${featured.slug}`} className="reveal group block">
            <div className="relative overflow-hidden rounded-[24px] bg-ink">
              <img
                src={featured.cover}
                alt=""
                loading="lazy"
                className="aspect-[16/11] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            </div>
            <div className="mt-5">
              <CategoryTag label={featured.category} />
              <h3 className="font-display mt-4 text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-[36px]">
                {featured.title}
              </h3>
              <p className="mt-3 max-w-xl text-[15px] text-muted-foreground sm:text-base">
                {featured.excerpt}
              </p>
              <PostMeta date={featured.date} readingTime={featured.readingTime} />
            </div>
          </a>

          {/* Side list */}
          <div ref={listRef} className="reveal flex flex-col gap-6">
            {rest.map((post) => (
              <SidePost key={post.slug} post={post} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SidePost({ post }: { post: Post }) {
  return (
    <a href={`/blog/${post.slug}`} className="group grid gap-5 sm:grid-cols-[200px_1fr]"
    >
      <div className="relative overflow-hidden rounded-[18px] bg-ink">
        <img
          src={post.cover}
          alt=""
          loading="lazy"
          className="aspect-[4/3] h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
        />
      </div>
      <div className="flex flex-col justify-center">
        <CategoryTag label={post.category} />
        <h4 className="font-display mt-3 text-[20px] font-semibold leading-snug tracking-[-0.018em] text-ink group-hover:text-[oklch(0.55_0.18_45)]">
          {post.title}
        </h4>
        <p className="mt-2 line-clamp-2 text-[14px] text-muted-foreground">{post.excerpt}</p>
        <PostMeta date={post.date} readingTime={post.readingTime} compact />
      </div>
    </a>
  );
}

function CategoryTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-hairline bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-ink-soft">
      {label}
    </span>
  );
}

function PostMeta({ date, readingTime, compact = false }: { date: string; readingTime: string; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 text-[12px] text-muted-foreground ${compact ? "mt-2" : "mt-4"}`}>
      <span>{date}</span>
      <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" /> {readingTime}
      </span>
    </div>
  );
}

export const allPosts = { brands: brandPosts, creators: creatorPosts };
