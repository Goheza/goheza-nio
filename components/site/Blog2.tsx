"use client"

import { ArrowUpRight, Clock } from "lucide-react";
import { useAudience } from "./AudienceContext";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import type { Post } from "@/lib/api";

export function Blog2({ brandPosts, creatorPosts }: { brandPosts: Post[]; creatorPosts: Post[] }) {
  const { audience } = useAudience();
  const posts = audience === "brands" ? brandPosts : creatorPosts;
  const headRef = useScrollReveal<HTMLDivElement>();
  const featuredRef = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });
  const listRef = useScrollReveal<HTMLDivElement>({ threshold: 0.05 });

  if (posts.length === 0) return null;

  const [featured, ...rest] = posts.slice(0,3);

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