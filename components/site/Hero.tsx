'use client'

import { ArrowRight } from 'lucide-react'
import { useAudience } from './AudienceContext'
import { useParallax, useScrollReveal, useScrollProgress } from '@/hooks/use-scroll-reveal'
import heroCreator from '@/assets/hero-creator.jpg'
import heroDashboard from '@/assets/hero-dashboard.jpg'
import heroPortrait from '@/assets/hero-portrait.jpg'
import { MarketplaceStream } from './Marketplace'

const content = {
    brands: {
        eyebrow: 'Performance marketing, powered by creators',
        headline: 'Launch content creator campaigns that drive measurable results.',
        sub: 'Goheza gives brands access to thousands of creators who produce and share promotional content and are paid based on the performance the content generates. No retainers, no impressions, no guesswork.',
        primary: 'Get in touch',
        secondary: 'See how it works',
    },
    creators: {
        eyebrow: 'Get paid for the results you drive',
        headline: 'Get Paid By Brands Per 1,000 views on your social media Videos.',
        sub: "Discover campaigns from brands you'd actually post about, create on your terms, and get paid every time your content delivers. Transparent rates, fast payouts.",
        primary: 'Start earning',
        secondary: 'Browse open campaigns',
    },
} as const

export function Hero() {
    const { audience } = useAudience()
    const c = content[audience]
    const clusterRef = useScrollProgress<HTMLDivElement>()
    const revealRef = useScrollReveal<HTMLDivElement>({ threshold: 0.12 })
    const tickerRef = useScrollReveal<HTMLDivElement>()
    const fgParallax = useParallax<HTMLDivElement>(0.06)

    return (
        <section className="relative overflow-hidden">
            <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[820px] bg-sky-glow" />
            <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[820px] bg-aurora" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-50" />

            <div
                aria-hidden
                className="animate-float pointer-events-none absolute -left-24 top-40 -z-10 h-72 w-72 rounded-full blur-3xl"
                style={{ background: 'oklch(0.745 0.175 22 / 0.22)' }}
            />
            <div
                aria-hidden
                className="animate-float pointer-events-none absolute -right-24 top-72 -z-10 h-80 w-80 rounded-full blur-3xl"
                style={{ background: 'oklch(0.70 0.14 295 / 0.18)', animationDelay: '1.4s' }}
            />

            <div className="mx-auto max-w-6xl px-5 pt-1 pb-20 sm:px-8 sm:pt-2 sm:pb-24">
                <h1
                    key={`h1-${audience}`}
                    className="font-display animate-fade-up mx-auto max-w-3xl text-center text-[22px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink sm:mt-1 sm:max-w-4xl sm:text-4xl lg:text-[52px]"
                >
                    {c.headline}
                </h1>

                <p
                    key={`sub-${audience}`}
                    className="animate-fade-up mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground sm:mt-3 sm:text-base"
                    style={{ animationDelay: '0.08s' }}
                >
                    {c.sub}
                </p>

                <div
                    className="animate-fade-up mt-3 flex flex-col items-center justify-center gap-2.5 sm:mt-4 sm:flex-row sm:gap-3"
                    style={{ animationDelay: '0.14s' }}
                >
                    <a
                        href={`/app/get-started?as=${audience === 'brands' ? 'brand' : 'creator'}`}
                        className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all duration-200 hover:scale-[1.03] hover:brightness-[1.05] sm:py-3"
                    >
                        {c.primary}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </a>
                    <a
                        href={c.secondary == 'Browse open campaigns' ? '/app/auth/login' : '/#how-it-works'}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-hairline bg-surface-elevated/80 px-6 py-2.5 text-sm font-medium text-foreground backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-elevated sm:py-3"
                    >
                        {c.secondary}
                    </a>
                </div>
            </div>

            {/* Full-bleed breakout. Pulled up hard — negative top margin claws back
                both this div's own margin and eats into the section's bottom padding above it. */}
            <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-10 w-screen sm:-mt-14">
                <MarketplaceStream />
            </div>

            <div className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-24">
                <div ref={tickerRef} className="reveal mt-8 sm:mt-12">
                    <div className="mb-6 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        <span className="h-px w-8 bg-hairline" />
                        Trusted by performance teams at
                        <span className="h-px w-8 bg-hairline" />
                    </div>
                    <LogoTicker />
                </div>
            </div>
        </section>
    )
}

function LayeredCard({
    src,
    alt,
    className = '',
    style,
    tint,
}: {
    src: string
    alt: string
    className?: string
    style?: React.CSSProperties
    tint: 'indigo' | 'violet'
}) {
    const ring =
        tint === 'indigo' ? 'ring-[color:var(--color-accent-indigo)]/25' : 'ring-[color:var(--color-accent-violet)]/25'
    return (
        <div className={className} style={style}>
            <div
                className={`relative h-full w-full overflow-hidden rounded-3xl bg-surface-elevated shadow-card ring-1 ${ring}`}
            >
                <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
            </div>
        </div>
    )
}

function CornerBracket({ className = '' }: { className?: string }) {
    return <span aria-hidden className={`absolute h-4 w-4 border-l-2 border-t-2 border-white/90 ${className}`} />
}

const logoNames = [
    'Lumen',
    'Norra',
    'Vault DFS',
    'Hyrox',
    'Stride',
    'Northbeam',
    'Kairo',
    'Plyform',
    'Orbital',
    'Saturn',
]

function LogoTicker() {
    return (
        <div
            className="relative overflow-hidden"
            style={{
                maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
            }}
        >
            <div className="flex w-max gap-12 animate-ticker">
                {[...logoNames, ...logoNames].map((name, i) => (
                    <span
                        key={`${name}-${i}`}
                        className="shrink-0 font-display text-2xl font-semibold tracking-tight text-muted-foreground/70 sm:text-3xl"
                    >
                        {name}
                    </span>
                ))}
            </div>
        </div>
    )
}
