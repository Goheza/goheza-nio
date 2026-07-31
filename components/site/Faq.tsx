'use client'

import { useState } from 'react'
import { Plus, X, ArrowUpRight } from 'lucide-react'
import { useAudience, type Audience } from './AudienceContext'
import { useScrollReveal } from '@/hooks/use-scroll-reveal'
import { SectionCta } from './SectionCta'
type Item = { q: string; a: string }
type Group = { label: string; items: Item[] }
const data: Record<
    Audience,
    { groups: Group[]; advisor: { name: string; role: string; tagline: string }; cta: string }
> = {
    brands: {
        cta: 'Launch My Campaign',
        advisor: {
            name: 'Sophia Williams',
            role: 'Campaign advisor',
            tagline: "Sophia's ready when you are.",
        },
        groups: [
            {
                label: 'Getting started',
                items: [
                    {
                        q: 'How does Goheza work for brands?',
                        a: "You brief your goals, budget, and creative dos/don'ts. Vetted creators apply with ready-to-post content. You approve what fits and only pay on attributed performance.",
                    },
                    {
                        q: 'How do I create a campaign?',
                        a: 'From your dashboard, click New Campaign, add a brief and assets, set a payout per 1,000 views and a total budget, then publish. Most campaigns go live in under 30 minutes.',
                    },
                    {
                        q: 'How are creators selected?',
                        a: 'Every creator is vetted for audience quality, engagement, and prior performance. You can filter by niche, platform, region, and historical CPM.',
                    },
                ],
            },
            {
                label: 'Pricing & performance',
                items: [
                    {
                        q: 'How does performance-based payment work?',
                        a: 'You set a payout rate (e.g. $8 per 1,000 attributed views). Creators only earn when content actually performs. You stop paying when the cap is hit.',
                    },
                    {
                        q: 'Is there a minimum campaign budget?',
                        a: 'Pilot campaigns start at $1,000. Most performance-marketing teams run between $5K and $50K per campaign to gather statistically significant data.',
                    },
                    {
                        q: 'How do I track campaign performance?',
                        a: 'A live dashboard shows views, watch-time, CTR, installs, and revenue per creator. Export to your BI stack or pipe via webhook to your warehouse.',
                    },
                ],
            },
            {
                label: 'Platforms & launch',
                items: [
                    {
                        q: 'What social platforms are supported?',
                        a: 'TikTok, Instagram Reels, YouTube Shorts, and X — with attribution and creator-level analytics on each.',
                    },
                    {
                        q: 'How quickly can my campaign go live?',
                        a: 'First creator applications typically arrive within 4 hours. Most campaigns have approved content going live the same day you brief them.',
                    },
                ],
            },
        ],
    },
    creators: {
        cta: 'Start Earning Today',
        advisor: {
            name: 'Sophia Williams',
            role: 'Creator success',
            tagline: "Sophia's ready when you are.",
        },
        groups: [
            {
                label: 'Getting started',
                items: [
                    {
                        q: 'What is Goheza?',
                        a: 'Goheza is a performance-based creator marketplace that connects content creators with brands. Creators earn money by creating content for campaigns and getting rewarded based on the performance of their approved content.',
                    },
                    {
                        q: 'Who can join Goheza?',
                        a: 'Anyone who creates original content on social media can apply to join Goheza. We welcome creators of all sizes who consistently produce quality content.',
                    },
                    {
                        q: 'Do I need a large following to earn?',
                        a: 'No. Goheza focuses on content performance rather than follower count. If your content reaches people and performs well, you can earn regardless of the size of your audience.',
                    },
                ],
            },
            {
                label: 'Campaigns & submissions',
                items: [
                    {
                        q: 'How do I find campaigns?',
                        a: 'Once your account is approved, you can browse all available campaigns in your Creator Dashboard. Each campaign includes a detailed brief, payment information, timelines, and submission requirements.',
                    },
                    {
                        q: 'Can I apply to more than one campaign?',
                        a: "Yes. You can apply to multiple campaigns as long as you meet each campaign's requirements and can deliver quality content on time.",
                    },
                    {
                        q: 'How are creators selected?',
                        a: 'Brands review all submissions and approve the creators whose content best aligns with their campaign goals and guidelines.',
                    },
                ],
            },
            {
                label: 'Earnings & payouts',
                items: [
                    {
                        q: 'How do I earn money?',
                        a: "Creators earn a guaranteed campaign payment (where applicable) plus rewards based on the number of views their approved content generates, according to the campaign's reward per 1,000 views.",
                    },
                    {
                        q: 'How do I track my earnings?',
                        a: 'Your Creator Dashboard includes an Earnings page where you can monitor your total earnings, campaign income, wallet balance, payouts, and performance over time.',
                    },
                    {
                        q: 'Can I change my payment method?',
                        a: 'Yes. You can update your preferred payment method at any time from your account settings. Goheza supports both bank transfers and mobile money where available.',
                    },
                ],
            },
            {
                label: 'Account & security',
                items: [
                    {
                        q: 'Why do I need to connect my social media accounts?',
                        a: 'Connecting your social media accounts allows Goheza to automatically verify your content, measure its performance, and calculate your earnings accurately. It also helps brands confirm that submissions are authentic, eliminates the need for manual reporting, and lets you track all your campaign analytics and earnings in one place. Your accounts remain under your control — you can disconnect them at any time from your settings.',
                    },
                    {
                        q: 'What happens if my submission is rejected?',
                        a: "If your submission doesn't meet the campaign requirements, the brand may request revisions or reject it with feedback. You can review the comments, make improvements if revisions are allowed, and resubmit your content.",
                    },
                    {
                        q: 'Is my data secure?',
                        a: 'Yes. We take data privacy seriously. Your personal information and connected social accounts are protected using secure industry-standard practices.',
                    },
                ],
            },
        ],
    },
}
export function Faq() {
    const { audience } = useAudience()
    const variant = data[audience]
    const headRef = useScrollReveal<HTMLDivElement>()
    const bodyRef = useScrollReveal<HTMLDivElement>({ threshold: 0.08 })
    // open by item id "group-index"
    const [open, setOpen] = useState<string>(`0-0`)
    return (
        <section id="faq" className="relative overflow-hidden py-16 sm:py-24">
            <div
                aria-hidden
                className="pointer-events-none absolute -left-32 top-1/3 -z-10 h-[380px] w-[420px] rounded-full blur-3xl"
                style={{ background: 'oklch(0.70 0.14 295 / 0.10)' }}
            />
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
                {/* Header */}
                <div ref={headRef} className="reveal mx-auto max-w-3xl text-center">
                    <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-elevated/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft backdrop-blur-md">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-signal)' }} />
                        FAQ guide
                    </span>
                    <h2 className="font-display mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-5xl lg:text-[56px]">
                        Frequently asked questions
                    </h2>
                    <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                        Everything you need to know about using Goheza.
                    </p>
                </div>
                {/* Body */}
                <div ref={bodyRef} className="reveal-scale mt-12 grid gap-8 lg:grid-cols-[360px_1fr] lg:gap-14">
                    <AdvisorCard advisor={variant.advisor} cta={variant.cta} audience={audience} />
                    {/* Accordion groups */}
                    <div className="space-y-10">
                        {variant.groups.map((g, gi) => (
                            <div key={g.label}>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft/80">
                                    {g.label}
                                </p>
                                <ul className="mt-4 space-y-2">
                                    {g.items.map((it, ii) => {
                                        const id = `${gi}-${ii}`
                                        const isOpen = open === id
                                        const num = String(gi * 10 + ii + 1).padStart(2, '0')
                                        return (
                                            <li key={id}>
                                                <button
                                                    type="button"
                                                    onClick={() => setOpen(isOpen ? '' : id)}
                                                    className={`group flex w-full items-start gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-300 sm:px-6 sm:py-5 ${
                                                        isOpen
                                                            ? 'border-[oklch(0.78_0.16_55_/_0.4)] bg-[oklch(0.97_0.025_70)] shadow-card'
                                                            : 'border-hairline bg-surface-elevated hover:border-[oklch(0.78_0.16_55_/_0.35)] hover:bg-[oklch(0.97_0.015_75)]'
                                                    }`}
                                                    aria-expanded={isOpen}
                                                >
                                                    <span
                                                        className={`mt-0.5 text-sm font-medium tabular-nums ${
                                                            isOpen ? 'text-[var(--color-signal)]' : 'text-ink-soft/70'
                                                        }`}
                                                    >
                                                        {num}
                                                    </span>
                                                    <span className="flex-1">
                                                        <span className="block font-display text-[16px] font-semibold tracking-[-0.005em] text-ink sm:text-[17px]">
                                                            {it.q}
                                                        </span>
                                                        <div
                                                            className="grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-400 ease-out"
                                                            style={{
                                                                gridTemplateRows: isOpen ? '1fr' : '0fr',
                                                                opacity: isOpen ? 1 : 0,
                                                                marginTop: isOpen ? '0.75rem' : '0',
                                                            }}
                                                        >
                                                            <span className="min-h-0 text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
                                                                {it.a}
                                                            </span>
                                                        </div>
                                                    </span>
                                                    <span
                                                        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                                                            isOpen
                                                                ? 'border-[var(--color-signal)] bg-[var(--color-signal)] text-primary-foreground rotate-0'
                                                                : 'border-hairline text-ink-soft group-hover:border-[oklch(0.78_0.16_55_/_0.5)] group-hover:text-[var(--color-signal)]'
                                                        }`}
                                                    >
                                                        {isOpen ? (
                                                            <X className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <Plus className="h-3.5 w-3.5" />
                                                        )}
                                                    </span>
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                <SectionCta />
            </div>
        </section>
    )
}
function AdvisorCard({
    advisor,
    cta,
    audience,
}: {
    advisor: { name: string; role: string; tagline: string }
    cta: string
    audience: 'brands' | 'creators'
}) {
    return (
        <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="group relative overflow-hidden rounded-[22px] border border-hairline shadow-card transition-transform duration-500 hover:-translate-y-1">
                {/* Portrait gradient placeholder */}
                <div
                    className="relative aspect-[4/5] w-full"
                    style={{
                        background:
                            'radial-gradient(120% 90% at 50% 25%, oklch(0.96 0.014 76) 0%, oklch(0.86 0.06 65) 45%, oklch(0.62 0.10 35) 100%)',
                    }}
                >
                    {/* Subtle face silhouette */}
                    <div
                        className="absolute left-1/2 top-[22%] h-28 w-28 -translate-x-1/2 rounded-full"
                        style={{
                            background: 'radial-gradient(circle at 35% 30%, oklch(0.94 0.03 60), oklch(0.76 0.06 50))',
                        }}
                    />
                    <div
                        className="absolute inset-x-[18%] bottom-0 h-[55%] rounded-t-[40%]"
                        style={{ background: 'linear-gradient(180deg, oklch(0.36 0.04 30), oklch(0.22 0.03 30))' }}
                    />
                    {/* Status dot */}
                    <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-medium text-ink backdrop-blur">
                        <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.18_152)] animate-pulse-dot" />
                        Online
                    </span>
                    {/* Name block bottom-left */}
                    <div className="absolute inset-x-5 bottom-5 text-white">
                        <p className="font-display text-xl font-semibold tracking-[-0.01em] drop-shadow">
                            {advisor.name}
                        </p>
                        <p className="text-xs text-white/80">{advisor.role}</p>
                    </div>
                </div>
            </div>
            <div className="mt-6">
                <p className="text-sm text-muted-foreground">Need guidance?</p>
                <p className="font-display mt-1 text-lg font-semibold tracking-[-0.01em] text-ink">{advisor.tagline}</p>
                <div className='flex flex-col w-fit'>
                    <a
                        href={`/app/get-started?as=${audience === 'brands' ? 'brand' : 'creator'}`}
                        className="mt-5 inline-flex items-center gap-2 rounded-full border border-ink/15 bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-[oklch(0.78_0.16_55_/_0.5)] hover:text-[var(--color-signal)]"
                    >
                        {cta}
                        <ArrowUpRight className="h-4 w-4" />
                    </a>
                    <a
                        href=''
                        className="mt-5 inline-flex items-center gap-2 rounded-full border border-ink/15 bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-[oklch(0.78_0.16_55_/_0.5)] hover:text-[var(--color-signal)]"
                    >
                        Schedule a Call
                        <ArrowUpRight className="h-4 w-4" />
                    </a>
                </div>
            </div>
        </div>
    )
}
