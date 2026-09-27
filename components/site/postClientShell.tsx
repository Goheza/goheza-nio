'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { useScrollReveal } from '@/hooks/use-scroll-reveal'
import type { Post } from '@/lib/api'
import styles from '@/app/blog/[slug]/post-body.module.css'

function ReadingProgress() {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const onScroll = () => {
            const doc = document.documentElement
            const scrollTop = doc.scrollTop || document.body.scrollTop
            const scrollHeight = (doc.scrollHeight || document.body.scrollHeight) - doc.clientHeight
            setProgress(scrollHeight > 0 ? scrollTop / scrollHeight : 0)
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        onScroll()
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <div className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-hairline">
            <div
                className="h-full origin-left bg-[var(--color-signal)] transition-transform duration-100 ease-out"
                style={{ transform: `scaleX(${progress})` }}
            />
        </div>
    )
}

export default function PostClientShell({
    post,
    contentHtml,
    related,
}: {
    post: Post
    contentHtml: string
    related: Post[]
}) {
    const heroRef = useScrollReveal<HTMLDivElement>()
    const bodyRef = useScrollReveal<HTMLDivElement>({ threshold: 0.05 })
    const relatedRef = useScrollReveal<HTMLDivElement>({ threshold: 0.05 })

    return (
        <>
            <ReadingProgress />
            <main>
                {/* HERO */}
                <section className="px-5 pb-16 pt-32 sm:px-8">
                    <div ref={heroRef} className="reveal mx-auto max-w-[760px]">
                        <div className="mb-8 flex items-center gap-2 text-[12px] font-medium text-ink-soft">
                            <Link href="/blog" className="hover:underline hover:opacity-80">
                                Blog
                            </Link>
                            <span>/</span>
                            <span className="inline-flex items-center rounded-full border border-hairline bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-ink-soft">
                                {post.category}
                            </span>
                        </div>

                        <h1 className="font-display mb-6 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-6xl">
                            {post.title}
                        </h1>
                        <p className="mb-10 text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>

                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-8">
                            <div className="flex items-center gap-3">
                                {post.author && (
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-sm font-semibold text-background">
                                        {post.authorInitials}
                                    </div>
                                )}
                                <div>
                                    {post.author && <p className="text-sm font-semibold text-ink">{post.author}</p>}
                                    {post.authorRole && (
                                        <p className="text-xs text-muted-foreground">{post.authorRole}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
                                <time>
                                    {new Date(post.date).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </time>
                                <span className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1">
                                    <Clock className="h-3 w-3" /> {post.readingTime}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {post.cover && (
                    <section className="mb-4 px-5 sm:px-8">
                        <div className="mx-auto max-w-[900px] overflow-hidden rounded-[24px] bg-ink">
                            <img src={post.cover} alt="" className="aspect-[16/9] w-full object-cover" />
                        </div>
                    </section>
                )}

                {/* ARTICLE BODY */}
                <section className="px-5 py-16 sm:px-8">
                    <div
                        ref={bodyRef}
                        className={`reveal ${styles.markdown} mx-auto max-w-[720px]`}
                        dangerouslySetInnerHTML={{ __html: contentHtml }}
                    />
                </section>

                {/* RELATED */}
                {related.length > 0 && (
                    <section className="px-5 py-24 sm:px-8">
                        <div ref={relatedRef} className="reveal mx-auto max-w-7xl">
                            <div className="mb-10 flex items-center justify-between">
                                <span className="inline-flex items-center rounded-full border border-hairline bg-surface-elevated px-3 py-1 text-[12px] font-medium text-ink-soft">
                                    Continue reading
                                </span>
                                <Link
                                    href="/blog"
                                    className="text-sm font-medium text-ink hover:text-[var(--color-signal)]"
                                >
                                    All articles →
                                </Link>
                            </div>
                            <div className="grid gap-8 sm:grid-cols-3">
                                {related.map((rp) => (
                                    <Link key={rp.slug} href={`/blog/${rp.slug}`} className="group block">
                                        <div className="relative overflow-hidden rounded-[18px] bg-ink">
                                            <img
                                                src={rp.cover}
                                                alt=""
                                                loading="lazy"
                                                className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                                            />
                                        </div>
                                        <span className="mt-4 inline-flex items-center rounded-full border border-hairline bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-ink-soft">
                                            {rp.category}
                                        </span>
                                        <h3 className="font-display mt-3 text-[18px] font-semibold leading-snug tracking-[-0.018em] text-ink group-hover:text-[var(--color-signal)]">
                                            {rp.title}
                                        </h3>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </>
    )
}