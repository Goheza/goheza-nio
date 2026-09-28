"use client"

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useAudience } from "./AudienceContext";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import type { Post } from "@/lib/api";

const HERO_SIDE_COUNT = 3; // side posts shown next to the featured post
const PAGE_SIZE = 9; // posts per page in the archive
const ALL = "All";

export function Blog({ brandPosts, creatorPosts }: { brandPosts: Post[]; creatorPosts: Post[] }) {
  const { audience } = useAudience();
  const posts = audience === "brands" ? brandPosts : creatorPosts;
  const headRef = useScrollReveal<HTMLDivElement>();
  const featuredRef = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });
  const listRef = useScrollReveal<HTMLDivElement>({ threshold: 0.05 });
  const archiveRef = useRef<HTMLDivElement>(null);

  const [category, setCategory] = useState(ALL);
  const [page, setPage] = useState(1);

  // Reset archive state when the audience switches.
  useEffect(() => {
    setCategory(ALL);
    setPage(1);
  }, [audience]);

  const [featured, ...rest] = posts;
  const sidePosts = rest.slice(0, HERO_SIDE_COUNT);
  const archive = useMemo(() => rest.slice(HERO_SIDE_COUNT), [rest]);

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(archive.map((p) => p.category)))],
    [archive],
  );

  const filtered = useMemo(
    () => (category === ALL ? archive : archive.filter((p) => p.category === category)),
    [archive, category],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function changeCategory(next: string) {
    setCategory(next);
    setPage(1);
  }

  function changePage(next: number) {
    setPage(next);
    archiveRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (posts.length === 0) return null;

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
          {archive.length > 0 && (
            <a
              href="#all-articles"
              className="group mt-6 inline-flex items-center gap-2 text-base font-medium text-ink hover:text-[oklch(0.55_0.18_45)]"
            >
              Browse all
              <ArrowUpRight className="h-4 w-4 text-[var(--color-signal)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          )}
        </div>

        {/* Hero: featured post + a fixed number of side posts */}
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
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

          <div ref={listRef} className="reveal flex flex-col gap-6">
            {sidePosts.map((post) => (
              <SidePost key={post.slug} post={post} />
            ))}
          </div>
        </div>

        {/* Archive: filterable, paginated grid */}
        {archive.length > 0 && (
          <div id="all-articles" ref={archiveRef} className="mt-20 scroll-mt-24 border-t border-hairline pt-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-3xl">
                  All articles
                </h3>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "article" : "articles"}
                  {category !== ALL ? ` in ${category}` : ""}
                </p>
              </div>

              {categories.length > 2 && (
                <div
                  role="tablist"
                  aria-label="Filter articles by category"
                  className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 sm:justify-end"
                >
                  {categories.map((c) => {
                    const active = c === category;
                    return (
                      <button
                        key={c}
                        role="tab"
                        aria-selected={active}
                        onClick={() => changeCategory(c)}
                        className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          active
                            ? "border-ink bg-ink text-white"
                            : "border-hairline bg-surface-elevated text-ink-soft hover:border-ink/40 hover:text-ink"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((post) => (
                <GridPost key={post.slug} post={post} />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination page={currentPage} totalPages={totalPages} onChange={changePage} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function GridPost({ post }: { post: Post }) {
  return (
    <a href={`/blog/${post.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-[18px] bg-ink">
        <img
          src={post.cover}
          alt=""
          loading="lazy"
          className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
        />
      </div>
      <div className="mt-4">
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

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const items = getPageItems(page, totalPages);
  const base =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-[14px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <nav aria-label="Article pages" className="mt-12 flex items-center justify-center gap-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className={`${base} border-hairline bg-surface-elevated text-ink-soft hover:text-ink disabled:pointer-events-none disabled:opacity-40`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {items.map((item, i) =>
        item === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            aria-label={`Page ${item}`}
            className={`${base} ${
              item === page
                ? "border-ink bg-ink text-white"
                : "border-hairline bg-surface-elevated text-ink-soft hover:border-ink/40 hover:text-ink"
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
        className={`${base} border-hairline bg-surface-elevated text-ink-soft hover:text-ink disabled:pointer-events-none disabled:opacity-40`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

// Always shows first, last, and a window around the current page.
function getPageItems(page: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) items.push("gap");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("gap");
  items.push(total);
  return items;
}

function SidePost({ post }: { post: Post }) {
  return (
    <a href={`/blog/${post.slug}`} className="group grid gap-5 sm:grid-cols-[200px_1fr]">
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