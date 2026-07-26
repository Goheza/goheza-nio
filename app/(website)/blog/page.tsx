import type { Metadata } from 'next'
import { AudienceProvider } from '@/components/site/AudienceContext'
import { Nav } from '@/components/site/Nav'
import { Footer } from '@/components/site/Footer'
import { Blog } from '@/components/site/Blog'

export const metadata: Metadata = {
    title: 'Blog — Goheza',
    description: 'Insights on creator-powered performance marketing, payouts, and brand growth.',
    openGraph: {
        title: 'Goheza Blog',
        description: 'Insights on creator-powered performance marketing.',
    },
}

export default function BlogPage() {
    return (
        <AudienceProvider>
            <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
                <Nav />
                <main className="pt-32 sm:pt-40">
                    <div className="mx-auto max-w-7xl px-5 sm:px-8">
                        <p className="font-display italic text-[14px] text-ink-soft/70">Resources</p>
                        <h1 className="font-display mt-2 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-6xl">
                            The Goheza Blog
                        </h1>
                        <p className="mt-4 max-w-xl text-muted-foreground">
                            Playbooks, teardowns, and product updates for brands and creators building on performance.
                        </p>
                    </div>
                    <Blog />
                </main>
                <Footer />
            </div>
        </AudienceProvider>
    )
}
