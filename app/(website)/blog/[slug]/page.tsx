import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AudienceProvider } from '@/components/site/AudienceContext'
import { Nav } from '@/components/site/Nav'
import { Footer } from '@/components/site/Footer'
import PostClientShell from '@/components/site/postClientShell'
import { getAllPosts, getPostBySlug } from '@/lib/api'
import markdownToHtml from '@/lib/markdownTohtml'

// TODO: confirm this is Goheza's production domain
const BASE_URL = 'https://goheza.com'

type Params = { params: Promise<{ slug: string }> }
type PostRecord = NonNullable<ReturnType<typeof getPostBySlug>>

function resolveOgImage(post: PostRecord): string {
    if (!post.ogImage?.url) return `${BASE_URL}/og-space.png`
    return post.ogImage.url.startsWith('http') ? post.ogImage.url : `${BASE_URL}${post.ogImage.url}`
}

export async function generateStaticParams() {
    const posts = getAllPosts()
    return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata(props: Params): Promise<Metadata> {
    const { slug } = await props.params
    const post = getPostBySlug(slug)
    if (!post) return {}
    const ogImageUrl = resolveOgImage(post)
    const canonicalUrl = `${BASE_URL}/blog/${slug}`
    return {
        title: `${post.title} — Goheza`,
        description: post.excerpt,
        keywords: [post.category, 'Goheza', ...(post.keywords ?? [])].filter(Boolean) as string[],
        alternates: { canonical: canonicalUrl },
        openGraph: {
            type: 'article',
            url: canonicalUrl,
            siteName: 'Goheza',
            title: post.title,
            description: post.excerpt,
            publishedTime: new Date(post.date).toISOString(),
            modifiedTime: new Date(post.updatedAt ?? post.date).toISOString(),
            authors: post.author ? [`${BASE_URL}/about`] : undefined,
            tags: post.category ? [post.category] : [],
            images: [{ url: ogImageUrl, width: 1200, height: 630, alt: post.title }],
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.excerpt,
            images: [ogImageUrl],
        },
    }
}

function generateArticleJsonLd(post: PostRecord) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt,
        image: post.cover,
        datePublished: post.date,
        dateModified: post.updatedAt ?? post.date,
        author: post.author
            ? { '@type': 'Person', name: post.author, url: `${BASE_URL}/about` }
            : { '@type': 'Organization', name: 'Goheza' },
        publisher: {
            '@type': 'Organization',
            name: 'Goheza',
            url: BASE_URL,
            logo: { '@type': 'ImageObject', url: `${BASE_URL}/og-space.png` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/blog/${post.slug}` },
        breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
                { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
                { '@type': 'ListItem', position: 3, name: post.title, item: `${BASE_URL}/blog/${post.slug}` },
            ],
        },
    }
}

export default async function PostPage(props: Params) {
    const { slug } = await props.params
    const post = getPostBySlug(slug)
    if (!post) notFound()

    const related = getAllPosts()
        .filter((p) => p.slug !== slug && p.audience === post.audience)
        .slice(0, 3)

    const contentHtml = await markdownToHtml(post.content)

    return (
        <AudienceProvider>
            <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(generateArticleJsonLd(post)).replace(/</g, '\\u003c'),
                    }}
                />
                <Nav />

                <nav
                    aria-label="Breadcrumb"
                    className="mx-auto flex max-w-7xl items-center gap-2 px-5 pt-32 text-[12px] font-medium text-ink-soft sm:px-8 sm:pt-40"
                >
                    <Link href="/" className="hover:underline hover:opacity-80">
                        Home
                    </Link>
                    <span aria-hidden="true">/</span>
                    <Link href="/blog" className="hover:underline hover:opacity-80">
                        Blog
                    </Link>
                    <span aria-hidden="true">/</span>
                    <span className="max-w-[240px] truncate text-ink">{post.title}</span>
                </nav>

                <PostClientShell post={post} contentHtml={contentHtml} related={related} />

                {/* Post-article CTA */}
                <section className="mx-auto max-w-[720px] border-t border-hairline px-5 py-16 text-center sm:px-8">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--color-signal)]">
                        Put this into practice
                    </p>
                    <h2 className="font-display mb-4 text-2xl font-semibold tracking-[-0.02em] text-ink">
                        Run your next creator campaign on performance.
                    </h2>
                    <p className="mx-auto mb-8 max-w-md text-sm text-muted-foreground">
                        Goheza connects your brand with vetted creators and pays out on results. Get started in
                        minutes.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        {/* TODO: confirm the live app URL */}
                        <a
                            href="https://app.goheza.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block rounded-full bg-ink px-8 py-3 text-sm font-semibold text-background no-underline"
                        >
                            Get started
                        </a>
                        <Link
                            href="/pricing"
                            className="inline-block rounded-full border border-hairline px-8 py-3 text-sm font-semibold text-ink no-underline hover:opacity-80"
                        >
                            See pricing
                        </Link>
                    </div>
                </section>

                <Footer />
            </div>
        </AudienceProvider>
    )
}