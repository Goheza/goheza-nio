'use client'

import { Megaphone, FileVideo, CheckCircle2, TrendingUp, Sparkles, Play, Eye, DollarSign, Filter } from 'lucide-react'
import { useAudience, type Audience } from './AudienceContext'
import { useScrollReveal } from '@/hooks/use-scroll-reveal'
import { SectionCta } from './SectionCta'

type Step = {
    title: string
    body: string
    icon: React.ComponentType<{ className?: string }>
    tone: 'orange' | 'cream' | 'green' | 'indigo'
}

const stepsByAudience: Record<Audience, { heading: React.ReactNode; sub: string; cta: string; steps: Step[] }> = {
    brands: {
        heading: (
            <>
                How <span className="text-gradient-primary">Goheza Works</span>
            </>
        ),
        sub: 'Launch creator campaigns, approve content, and only pay for performance.',
        cta: 'Launch My Campaign',
        steps: [
            {
                title: 'Launch Campaigns',
                body: "Define your goals, assets, dos & don'ts, and budget, and your campaign goes live to vetted creators in minutes.",
                icon: Megaphone,
                tone: 'orange',
            },
            {
                title: ' Creators Apply. You Pick the Best Fit',
                body: 'Creators apply with their profiles, giving you the insights you need to choose the right voices for your brand. Select your preferred creators and start your campaign.',
                icon: FileVideo,
                tone: 'cream',
            },
            {
                title: 'Approve Content To Use',
                body: 'Review, filter, and approve only the content that fits your brand. Reject the rest with a click.',
                icon: CheckCircle2,
                tone: 'green',
            },
            {
                title: 'Pay Per 1,000 Views',
                body: 'Approved content goes live across socials. You pay on attributed performance no guesswork, no waste.',
                icon: TrendingUp,
                tone: 'indigo',
            },
        ],
    },
    creators: {
        heading: (
            <>
                How <span className="text-gradient-primary">Goheza Works</span>
            </>
        ),
        sub: 'Apply to campaigns, create content, and earn based on performance.',
        cta: 'Start Earning Today',
        steps: [
            {
                title: 'Discover Campaigns',
                body: 'Explore campaigns from brands looking for creators like you. Find opportunities that match your niche, interests, and audience.',
                icon: Sparkles,
                tone: 'orange',
            },
            {
                title: 'Apply With Your Profile',
                body: 'Submit your creator profile and show brands why you’re the right fit. Brands review applications and select the creators they want to work with.',
                icon: FileVideo,
                tone: 'cream',
            },
            {
                title: 'Create & Submit Content',
                body: 'Once selected, create content based on the campaign brief and submit your video for review through Goheza.',
                icon: CheckCircle2,
                tone: 'green',
            },
            {
                title: 'Earn Per 1,000 Views',
                body: 'After your content goes live, earn based on the views it generates. Track your performance live and receive transparent payouts.',
                icon: DollarSign,
                tone: 'indigo',
            },
        ],
    },
}

const toneStyles: Record<Step['tone'], string> = {
    orange: 'bg-[oklch(0.92_0.08_55)] text-[oklch(0.55_0.18_45)]',
    cream: 'bg-[oklch(0.94_0.04_75)] text-[oklch(0.45_0.06_70)]',
    green: 'bg-[oklch(0.92_0.06_152)] text-[oklch(0.45_0.12_152)]',
    indigo: 'bg-[oklch(0.92_0.04_268)] text-[oklch(0.45_0.12_268)]',
}

export function HowItWorks() {
    const { audience } = useAudience()
    const data = stepsByAudience[audience]
    const headRef = useScrollReveal<HTMLDivElement>()
    const gridRef = useScrollReveal<HTMLDivElement>({ threshold: 0.1 })

    return (
        <section id="how-it-works" className="relative overflow-hidden py-16 sm:py-24">
            {/* Soft top divider glow */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-hairline" />
            <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-[680px] -translate-x-1/2 rounded-full blur-3xl"
                style={{ background: 'oklch(0.745 0.175 22 / 0.18)' }}
            />

            <div className="mx-auto max-w-7xl px-5 sm:px-8">
                {/* Header */}
                <div ref={headRef} className="reveal mx-auto max-w-3xl text-center">
                    <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-elevated/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft backdrop-blur-md">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-signal)' }} />
                        How It Works
                    </span>
                    <h2 className="font-display mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-5xl lg:text-6xl">
                        {data.heading}
                    </h2>
                    <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">{data.sub}</p>
                </div>

                {/* Main grid */}
                <div
                    ref={gridRef}
                    className="reveal-scale relative mt-12 grid gap-5 overflow-hidden rounded-[28px] border border-hairline bg-surface-elevated/60 p-3 shadow-card backdrop-blur-sm sm:mt-14 sm:p-4 lg:grid-cols-[1.05fr_1fr]"
                >
                    {/* LEFT: numbered steps */}
                    <ol className="relative rounded-[20px] bg-surface-elevated p-2 sm:p-4">
                        {data.steps.map((step, i) => (
                            <StepRow
                                key={`${audience}-${i}`}
                                step={step}
                                index={i}
                                delay={i * 90}
                                isLast={i === data.steps.length - 1}
                            />
                        ))}
                    </ol>

                    {/* RIGHT: warm illustrative panel */}
                    <div
                        className="relative overflow-hidden rounded-[20px] p-6 sm:p-8"
                        style={{
                            background:
                                'radial-gradient(120% 80% at 100% 0%, oklch(0.92 0.10 55 / 0.55) 0%, oklch(0.95 0.04 70 / 0.4) 40%, oklch(0.965 0.012 78) 100%)',
                        }}
                    >
                        <div
                            aria-hidden
                            className="absolute inset-0 opacity-60"
                            style={{
                                backgroundImage: 'radial-gradient(oklch(0.66 0.20 42 / 0.08) 1px, transparent 1px)',
                                backgroundSize: '10px 10px',
                            }}
                        />
                        <PreviewMock audience={audience} />
                    </div>
                </div>

                <SectionCta />
            </div>
        </section>
    )
}

function StepRow({ step, index, delay, isLast }: { step: Step; index: number; delay: number; isLast: boolean }) {
    const Icon = step.icon
    const ref = useScrollReveal<HTMLLIElement>({ threshold: 0.3 })
    return (
        <li
            ref={ref}
            className="reveal group relative grid grid-cols-[auto_1fr] gap-4 rounded-2xl px-3 py-6 transition-colors duration-300 hover:bg-[oklch(0.96_0.02_70)] sm:gap-5 sm:px-5 sm:py-7"
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    toneStyles[step.tone]
                } sm:h-12 sm:w-12`}
            >
                <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold tracking-[-0.01em] text-ink sm:text-xl">
                    <span className="mr-2 text-ink-soft/70">{index + 1}.</span>
                    {step.title}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                    {step.body}
                </p>
            </div>
            {!isLast && (
                <span
                    aria-hidden
                    className="absolute inset-x-4 bottom-0 h-px"
                    style={{
                        background: 'linear-gradient(to right, transparent, oklch(0.705 0.182 24 / 0.35), transparent)',
                    }}
                />
            )}
        </li>
    )
}

function PreviewMock({ audience }: { audience: Audience }) {
    if (audience === 'brands') {
        return (
            <div className="relative h-full min-h-[440px]">
                {/* Campaign card */}
                <div className="animate-float relative z-10 rounded-2xl border border-hairline bg-surface-elevated p-5 shadow-card">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink">Active Campaign</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.92_0.08_152)] px-2.5 py-1 text-[11px] font-medium text-[oklch(0.4_0.12_152)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.18_152)] animate-pulse-dot" />{' '}
                            Live
                        </span>
                    </div>
                    <p className="mt-1 font-display text-lg font-semibold tracking-[-0.01em] text-ink">
                        Summer App Launch
                    </p>
                    <div className="mt-4 space-y-3">
                        {[
                            { label: 'Goal', value: 'Installs' },
                            { label: 'Payout', value: '$8 / 1k views' },
                            { label: 'Budget', value: '$24,000' },
                        ].map((row) => (
                            <div key={row.label} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{row.label}</span>
                                <span className="font-medium text-ink">{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Approvals card */}
                <div
                    className="animate-float absolute -bottom-2 right-0 z-20 w-[78%] rounded-2xl border border-hairline bg-surface-elevated p-4 shadow-elevated"
                    style={{ animationDelay: '0.8s' }}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                            Pending Approvals
                        </span>
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="mt-3 space-y-2">
                        {[
                            { name: '@maya.films', views: '1.2M proj.', state: 'approve' },
                            { name: '@jordan.k', views: '640k proj.', state: 'review' },
                            { name: '@nia.creates', views: '920k proj.', state: 'approve' },
                        ].map((c) => (
                            <div
                                key={c.name}
                                className="flex items-center justify-between rounded-xl bg-[oklch(0.97_0.012_78)] px-3 py-2"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-full bg-[oklch(0.85_0.06_55)]" />
                                    <div className="leading-tight">
                                        <p className="text-xs font-semibold text-ink">{c.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{c.views}</p>
                                    </div>
                                </div>
                                {c.state === 'approve' ? (
                                    <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                                        Approve
                                    </span>
                                ) : (
                                    <span className="rounded-full border border-hairline px-2.5 py-1 text-[10px] font-medium text-ink">
                                        Review
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative h-full min-h-[440px]">
            {/* Earnings card */}
            <div className="animate-float relative z-10 rounded-2xl border border-hairline bg-surface-elevated p-5 shadow-card">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">This Month</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[oklch(0.5_0.15_152)]">
                        <TrendingUp className="h-3 w-3" /> +28%
                    </span>
                </div>
                <p className="mt-2 font-display text-4xl font-semibold tracking-[-0.03em] text-ink">$4,820</p>
                <p className="text-xs text-muted-foreground">across 6 active campaigns</p>
                <div className="mt-4 flex h-16 items-end gap-1.5">
                    {[40, 55, 38, 70, 62, 88, 74, 95, 82, 100, 90, 100].map((h, i) => (
                        <span
                            key={i}
                            className="flex-1 rounded-sm"
                            style={{
                                height: `${h}%`,
                                background: i > 7 ? 'var(--color-signal)' : 'oklch(0.88 0.04 70)',
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Live content card */}
            <div
                className="animate-float absolute -bottom-2 right-0 z-20 w-[78%] rounded-2xl border border-hairline bg-surface-elevated p-4 shadow-elevated"
                style={{ animationDelay: '0.8s' }}
            >
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Live Content</span>
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="mt-3 space-y-2">
                    {[
                        { title: 'Nova App — review', views: '412k', earn: '$3.29k' },
                        { title: 'Plyform haul', views: '186k', earn: '$1.49k' },
                        { title: 'Kairo unbox', views: '98k', earn: '$0.78k' },
                    ].map((c) => (
                        <div
                            key={c.title}
                            className="flex items-center justify-between rounded-xl bg-[oklch(0.97_0.012_78)] px-3 py-2"
                        >
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink/90">
                                    <Play className="h-3 w-3 fill-primary-foreground text-primary-foreground" />
                                </div>
                                <div className="leading-tight">
                                    <p className="text-xs font-semibold text-ink">{c.title}</p>
                                    <p className="text-[10px] text-muted-foreground">{c.views} views</p>
                                </div>
                            </div>
                            <span className="rounded-full bg-[oklch(0.94_0.05_70)] px-2.5 py-1 text-[10px] font-semibold text-[oklch(0.5_0.15_45)]">
                                {c.earn}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
