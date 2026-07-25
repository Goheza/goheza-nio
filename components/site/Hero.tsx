"use client"

import { ArrowRight } from 'lucide-react'
import { useAudience } from './AudienceContext'
import { useParallax, useScrollReveal, useScrollProgress } from '@/hooks/use-scroll-reveal'
import heroCreator from '@/assets/hero-creator.jpg'
import heroDashboard from '@/assets/hero-dashboard.jpg'
import heroPortrait from '@/assets/hero-portrait.jpg'

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
            <div
                aria-hidden
                className="absolute inset-x-0 top-0 -z-10 h-[820px] bg-sky-glow"
            />
            <div
                aria-hidden
                className="absolute inset-x-0 top-0 -z-10 h-[820px] bg-aurora"
            />
            <div
                aria-hidden
                className="absolute inset-0 -z-10 bg-grid opacity-50"
            />

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

            <div className="mx-auto max-w-6xl px-5 pt-4 pb-20 sm:px-8 sm:pt-8 sm:pb-24">
                <h1
                    key={`h1-${audience}`}
                    className="font-display animate-fade-up mx-auto mt-7 max-w-4xl text-center text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-6xl lg:text-[76px]"
                >
                    {c.headline}
                </h1>

                <p
                    key={`sub-${audience}`}
                    className="animate-fade-up mx-auto mt-6 max-w-2xl text-center text-base text-muted-foreground sm:text-lg"
                    style={{ animationDelay: '0.08s' }}
                >
                    {c.sub}
                </p>

                <div
                    className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
                    style={{ animationDelay: '0.14s' }}
                >
                    <a
                        href={`/app/get-started?as=${audience === 'brands' ? 'brand' : 'creator'}`}
                        className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all duration-200 hover:scale-[1.03] hover:brightness-[1.05]"
                    >
                        {c.primary}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </a>
                    <a
                        href={c.secondary == 'Browse open campaigns' ? '/app/auth/login' : '/#how-it-works'}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-hairline bg-surface-elevated/80 px-6 py-3 text-sm font-medium text-foreground backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-elevated"
                    >
                        {c.secondary}
                    </a>
                </div>

                {/* Layered hero — foreground card + two background images that reveal on scroll.
            `--p` drives the unveil progress 0→1 set by useScrollProgress. */}
                <div
                    ref={clusterRef}
                    className="relative mx-auto mt-16 h-[380px] max-w-4xl sm:mt-20 sm:h-[520px]"
                    style={{ ['--p' as never]: 0 } as React.CSSProperties}
                >
                    <div
                        ref={revealRef as never}
                        className="reveal absolute inset-0"
                    >
                        {/* Background image — left (visible at rest, fans out on scroll) */}
                        <LayeredCard
                            src={heroCreator.src}
                            alt="Creator filming a short-form video"
                            className="absolute left-1/2 top-10 h-[72%] w-[58%] sm:w-[50%]"
                            style={{
                                transform:
                                    'translate3d(calc(-50% + (-32% - var(--p) * 20%)), calc(var(--p) * -18px), 0) rotate(calc(-6deg - var(--p) * 4deg)) scale(calc(0.92 + var(--p) * 0.04))',
                                opacity: 'calc(0.85 + var(--p) * 0.15)',
                                zIndex: 10,
                                transition: 'opacity 0.6s ease',
                            }}
                            tint="indigo"
                        />
                        {/* Background image — right */}
                        <LayeredCard
                            src={heroPortrait.src}
                            alt="Creator earning from Goheza campaigns"
                            className="absolute left-1/2 top-10 h-[72%] w-[58%] sm:w-[50%]"
                            style={{
                                transform:
                                    'translate3d(calc(-50% + (32% + var(--p) * 20%)), calc(var(--p) * -22px), 0) rotate(calc(6deg + var(--p) * 4deg)) scale(calc(0.92 + var(--p) * 0.04))',
                                opacity: 'calc(0.85 + var(--p) * 0.15)',
                                zIndex: 10,
                                transition: 'opacity 0.6s ease',
                            }}
                            tint="violet"
                        />

                        {/* Foreground hero — main focus, gentle parallax */}
                        <div
                            ref={fgParallax}
                            className="absolute left-1/2 top-0 h-full w-[68%] -translate-x-1/2 sm:w-[58%]"
                            style={{ zIndex: 20 }}
                        >
                            <div className="group relative h-full w-full overflow-hidden rounded-3xl bg-surface-elevated shadow-elevated ring-1 ring-[color:var(--color-signal)]/30">
                                <img
                                    src={heroDashboard.src}
                                    alt="Goheza campaign analytics dashboard"
                                    width={960}
                                    height={1280}
                                    loading="eager"
                                    className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]"
                                />
                                <CornerBracket className="left-3 top-3" />
                                <CornerBracket className="right-3 top-3 rotate-90" />
                                <CornerBracket className="left-3 bottom-3 -rotate-90" />
                                <CornerBracket className="right-3 bottom-3 rotate-180" />
                            </div>
                        </div>
                    </div>

                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-10 bottom-0 h-12 rounded-full blur-2xl"
                        style={{ background: 'oklch(0.66 0.20 42 / 0.22)' }}
                    />
                </div>

                <div
                    ref={tickerRef}
                    className="reveal mt-20 sm:mt-24"
                >
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
        <div
            className={className}
            style={style}
        >
            <div
                className={`relative h-full w-full overflow-hidden rounded-3xl bg-surface-elevated shadow-card ring-1 ${ring}`}
            >
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    className="h-full w-full object-cover"
                />
            </div>
        </div>
    )
}

function CornerBracket({ className = '' }: { className?: string }) {
    return (
        <span
            aria-hidden
            className={`absolute h-4 w-4 border-l-2 border-t-2 border-white/90 ${className}`}
        />
    )
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
