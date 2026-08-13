'use client'

import { BadgeCheck, Quote } from 'lucide-react'
import { useAudience } from './AudienceContext'
import { useScrollReveal } from '@/hooks/use-scroll-reveal'
import { SectionCta } from './SectionCta'

type Tone = 'warm' | 'indigo' | 'violet' | 'cyan' | 'navy' | 'lime'

type CreatorTestimonial = {
    name: string
    handle: string
    body: string
    tone: Tone
    avatar: string
}

const creatorTestimonials: CreatorTestimonial[] = [
    {
        name: 'Liyana M.',
        handle: '@liyana.shoots',
        body: 'Made more in one campaign than 3 months of brand DMs. Payouts hit in 48 hours.',
        tone: 'warm',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces&q=80',
    },
    {
        name: 'Tunde A.',
        handle: '@tundetalks',
        body: 'The briefs are clear, the rates are public, and I keep full creative control. Finally.',
        tone: 'indigo',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces&q=80',
    },
    {
        name: 'Naledi K.',
        handle: '@naledi.creates',
        body: 'I picked 3 brands I actually use. My TikTok pulled 1.4M views — biggest cheque of my year.',
        tone: 'violet',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=faces&q=80',
    },
    {
        name: 'Kwame O.',
        handle: '@kwamefilms',
        body: 'Approval to live in under a day. No agency back-and-forth, no chasing invoices.',
        tone: 'cyan',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces&q=80',
    },
    {
        name: 'Zola B.',
        handle: '@zolavibes',
        body: 'Performance pay sounded scary. Then my first video hit 600k views and I got paid for every one.',
        tone: 'lime',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&fit=crop&crop=faces&q=80',
    },
    {
        name: 'Sade I.',
        handle: '@sadeskits',
        body: 'Goheza is the only platform that treats creators like business owners, not free labour.',
        tone: 'navy',
        avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&h=120&fit=crop&crop=faces&q=80',
    },
    {
        name: 'Femi R.',
        handle: '@femireviews',
        body: 'Transparent dashboard. I can see views, earnings, and pending payouts at a glance.',
        tone: 'warm',
        avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&h=120&fit=crop&crop=faces&q=80',
    },
    {
        name: 'Imani T.',
        handle: '@imani.studio',
        body: 'Three brand collabs this month, all from one app. My career feels real now.',
        tone: 'indigo',
        avatar: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=120&h=120&fit=crop&crop=faces&q=80',
    },
    {
        name: 'Bayo S.',
        handle: '@bayosounds',
        body: 'Fast payments, fair rates, and briefs that respect my voice. 10/10.',
        tone: 'violet',
        avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=120&h=120&fit=crop&crop=faces&q=80',
    },
    {
        name: 'Chioma E.',
        handle: '@chiomaedit',
        body: 'I love that I choose which campaigns to join. Nothing forced, nothing off-brand.',
        tone: 'cyan',
        avatar: 'https://images.unsplash.com/photo-1546961342-1a423d4d0641?w=120&h=120&fit=crop&crop=faces&q=80',
    },
    {
        name: 'Yusuf D.',
        handle: '@yusufdrives',
        body: "Started as a side hustle. It's now a third of my income — flexible and reliable.",
        tone: 'lime',
        avatar: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=120&h=120&fit=crop&crop=faces&q=80',
    },
    {
        name: 'Aisha P.',
        handle: '@aishapaints',
        body: 'The support team actually replies. Felt seen from day one.',
        tone: 'navy',
        avatar: 'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=120&h=120&fit=crop&crop=faces&q=80',
    },
]

type BrandStory = {
    quote: string
    name: string
    role: string
    company: string
    metric: string
    metricLabel: string
    avatar: string
    cover: string
}

const brandStories: BrandStory[] = [
    {
        quote: 'Goheza took the complexity out of managing creators. Their platform made our campaigns easier to coordinate, more efficient and delivered a 50% reduction in CPM. We were able to get significantly more value from the same marketing spend',
        name: 'Paul Mboya Jabuya ',
        role: 'CEO ',
        company: 'Satesoft Technologies',
        metric: '3.4×',
        metricLabel: 'ROAS lift in 60 days',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces&q=80',
        cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
    },
    {
        quote: 'Performance pay changed everything. Our CPI dropped from $4.20 to $1.85 and the content actually feels native — not like an ad.',
        name: 'Daniel Park',
        role: 'Performance Marketing Lead',
        company: 'Plyform',
        metric: '47%',
        metricLabel: 'Lower CPA vs paid social',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces&q=80',
        cover: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80',
    },
    {
        quote: 'We brief a campaign on Monday and have 20+ creator videos ready by Friday. Goheza compressed our content pipeline by an order of magnitude.',
        name: 'Sofia Martinez',
        role: 'Brand Director',
        company: 'Kairo',
        metric: '62%',
        metricLabel: 'Faster time to live',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces&q=80',
        cover: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
    },
]

const toneBg: Record<Tone, string> = {
    warm: 'linear-gradient(135deg, oklch(0.82 0.16 55), oklch(0.66 0.20 42))',
    indigo: 'linear-gradient(135deg, oklch(0.72 0.14 268), oklch(0.52 0.16 268))',
    violet: 'linear-gradient(135deg, oklch(0.78 0.14 295), oklch(0.58 0.16 295))',
    cyan: 'linear-gradient(135deg, oklch(0.86 0.10 215), oklch(0.64 0.12 215))',
    navy: 'linear-gradient(135deg, oklch(0.40 0.06 268), oklch(0.22 0.03 265))',
    lime: 'linear-gradient(135deg, oklch(0.86 0.16 130), oklch(0.64 0.16 152))',
}

export function Testimonials() {
    const { audience } = useAudience()
    return audience === 'brands' ? <BrandsTestimonials /> : <CreatorsTestimonials />
}

function SectionHeader({ eyebrow, heading, sub }: { eyebrow: string; heading: React.ReactNode; sub: string }) {
    const ref = useScrollReveal<HTMLDivElement>()
    return (
        <div ref={ref} className="reveal mx-auto max-w-3xl text-center">
            <span className="font-display italic text-[15px] text-ink-soft/80">{eyebrow}</span>
            <h2 className="font-display mt-3 text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-5xl lg:text-[56px]">
                {heading}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">{sub}</p>
        </div>
    )
}

function BrandsTestimonials() {
    const [featured, secondary, tertiary, quaternary] = [
        brandStories[0],
        brandStories[1],
        brandStories[2],
        brandStories[0], // reuse for 3rd metric card
    ]
    const gridRef = useScrollReveal<HTMLDivElement>({ threshold: 0.08 })

    return (
        <section id="testimonials" className="relative overflow-hidden py-16 sm:py-24">
            <div
                aria-hidden
                className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[420px] w-[640px] -translate-x-1/2 rounded-full blur-3xl"
                style={{ background: 'oklch(0.745 0.175 22 / 0.14)' }}
            />
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
                <SectionHeader
                    eyebrow="Customer Stories"
                    heading={
                        <>
                            Trusted by Early Adopters. <br />
                            Backed by <span className="text-gradient-primary">Top Investors</span>.
                        </>
                    }
                    sub="From fast-growing startups to established marketing teams, brands use Goheza to eliminate retainers and unlock performance based pay"
                />

                <div ref={gridRef} className="reveal-scale mt-12 grid gap-4 sm:gap-6">
                    {/* Top row */}
                    <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_2fr]">
                        <MetricHeroCard
                            brand="Satesoft"
                            metric="50%"
                            label="Reduction in cpm"
                            gradient="linear-gradient(160deg, oklch(0.55 0.16 255) 0%, oklch(0.32 0.10 268) 100%)"
                        />
                        <QuoteCard story={featured} />
                    </div>
                    {/* Bottom row */}
                    <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                        <ImageMetricCard
                            brand="Obima"
                            metric="40%"
                            label="Faster deal cycle"
                            image="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&q=80"
                        />
                        <ImageMetricCard
                            brand="Mandala"
                            metric={secondary.metric}
                            label={secondary.metricLabel}
                            gradient="linear-gradient(160deg, oklch(0.45 0.14 268) 0%, oklch(0.22 0.04 268) 100%)"
                        />
                        <ImageMetricCard
                            brand="Pandawa"
                            metric={tertiary.metric}
                            label={tertiary.metricLabel}
                            image="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=900&q=80"
                        />
                    </div>
                </div>

                <SectionCta headline="Want results like these for your next campaign?" audience="brands" />
            </div>
        </section>
    )
}

function MetricHeroCard({
    brand,
    metric,
    label,
    gradient,
}: {
    brand: string
    metric: string
    label: string
    gradient: string
}) {
    return (
        <div
            className="relative overflow-hidden rounded-[24px] p-7 text-white sm:p-10 min-h-[280px] sm:min-h-[360px]"
            style={{ background: gradient }}
        >
            <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
                style={{ background: 'oklch(0.78 0.16 245 / 0.45)' }}
            />
            <div className="font-display text-[18px] font-semibold tracking-tight text-white">{brand}</div>
            <div className="relative mt-auto flex h-full flex-col justify-end pt-12">
                <p className="font-display text-5xl font-semibold tracking-[-0.04em] sm:text-[68px]">{metric}</p>
                <p className="mt-2 text-sm text-white/80">{label}</p>
            </div>
        </div>
    )
}

function QuoteCard({ story }: { story: BrandStory }) {
    return (
        <div className="relative grid overflow-hidden rounded-[24px] bg-[oklch(0.96_0.012_78)] sm:grid-cols-[1fr_1.2fr]">
            {/* Portrait */}
            <div className="relative min-h-[260px] bg-[oklch(0.92_0.018_78)] sm:min-h-[360px]">
                <img
                    src={"/satesoft_ceo.jpeg".replace('w=200&h=200', 'w=600&h=800')}
                    alt={story.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover object-top"
                />
            </div>
            {/* Quote */}
            <div className="relative flex flex-col justify-between p-6 sm:p-9">
                <div>
                    <div className="font-display text-[15px] font-semibold tracking-tight text-ink">
                        {story.company}
                    </div>
                    <p className="font-display mt-5 text-[20px] leading-[1.35] tracking-[-0.012em] text-ink sm:text-[24px]">
                        <span className="text-ink-soft/40">“</span>
                        {story.quote.split(' saved us ')[0]} <span className="font-semibold">saved us nearly $42K</span>{' '}
                        in wasted spend.
                        <span className="text-ink-soft/40">”</span>
                    </p>
                </div>
                <div className="mt-6 flex items-end justify-between">
                    <div className="leading-tight">
                        <p className="text-sm font-semibold text-ink">{story.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {story.role}, {story.company}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-4 rounded-full bg-ink" />
                        <span className="h-1.5 w-1.5 rounded-full bg-ink/40" />
                        <span className="h-1.5 w-1.5 rounded-full bg-ink/40" />
                        <span className="h-1.5 w-4 rounded-full bg-ink/15" />
                    </div>
                </div>
            </div>
        </div>
    )
}

function ImageMetricCard({
    brand,
    metric,
    label,
    image,
    gradient,
}: {
    brand: string
    metric: string
    label: string
    image?: string
    gradient?: string
}) {
    return (
        <div
            className="group relative min-h-[280px] overflow-hidden rounded-[24px] p-6 text-white sm:p-7"
            style={{ background: gradient ?? 'oklch(0.22 0.022 265)' }}
        >
            {image && (
                <img
                    src={image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.04]"
                />
            )}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    background: image
                        ? 'linear-gradient(180deg, oklch(0.22 0.022 265 / 0.05) 0%, oklch(0.22 0.022 265 / 0.65) 100%)'
                        : 'linear-gradient(180deg, transparent 50%, oklch(0.22 0.022 265 / 0.35) 100%)',
                }}
            />
            <div className="relative flex h-full min-h-[240px] flex-col">
                <span className="font-display text-base font-semibold tracking-tight">{brand}</span>
                <div className="mt-auto">
                    <p className="font-display text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">{metric}</p>
                    <p className="mt-1.5 text-[13px] text-white/85">{label}</p>
                </div>
            </div>
        </div>
    )
}

/* ───────── Creators: marquee testimonials ───────── */

function CreatorsTestimonials() {
    // Use 1 col on mobile, 2 on tablet, 3 on desktop — split data accordingly
    const cols3: CreatorTestimonial[][] = [[], [], []]
    creatorTestimonials.forEach((t, i) => cols3[i % 3].push(t))
    const cols2: CreatorTestimonial[][] = [[], []]
    creatorTestimonials.forEach((t, i) => cols2[i % 2].push(t))
    const cols1: CreatorTestimonial[][] = [creatorTestimonials]

    return (
        <section id="testimonials" className="relative overflow-hidden py-16 sm:py-24">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]"
                style={{
                    background: 'radial-gradient(60% 80% at 50% 0%, oklch(0.745 0.175 22 / 0.18) 0%, transparent 70%)',
                }}
            />

            <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
                <SectionHeader
                    eyebrow="Creator Community"
                    heading={
                        <>
                            Loved by <span className="text-gradient-primary">Creators</span>
                            <br />
                            Across Africa.
                        </>
                    }
                    sub="Hear from how content creators will earn through Goheza while working with brands they genuinely enjoy promoting."
                />

                <div className="relative mt-12">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 sm:h-24"
                        style={{ background: 'linear-gradient(to bottom, var(--color-background), transparent)' }}
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 sm:h-24"
                        style={{ background: 'linear-gradient(to top, var(--color-background), transparent)' }}
                    />

                    {/* Mobile: single column, contained height */}
                    <div className="group grid h-[520px] grid-cols-1 gap-4 overflow-hidden sm:hidden">
                        {cols1.map((col, i) => (
                            <MarqueeColumn key={`m-${i}`} items={col} direction="up" duration={42} />
                        ))}
                    </div>
                    {/* Tablet: 2 columns */}
                    <div className="group hidden h-[580px] grid-cols-2 gap-4 overflow-hidden sm:grid lg:hidden">
                        {cols2.map((col, i) => (
                            <MarqueeColumn
                                key={`t-${i}`}
                                items={col}
                                direction={i % 2 === 0 ? 'up' : 'down'}
                                duration={36 + i * 6}
                            />
                        ))}
                    </div>
                    {/* Desktop: 3 columns */}
                    <div className="group hidden h-[640px] grid-cols-3 gap-6 overflow-hidden lg:grid">
                        {cols3.map((col, i) => (
                            <MarqueeColumn
                                key={`d-${i}`}
                                items={col}
                                direction={i % 2 === 0 ? 'up' : 'down'}
                                duration={32 + i * 6}
                            />
                        ))}
                    </div>
                </div>

                <SectionCta audience="creators" />
            </div>

            <style>{`
        @keyframes goheza-marquee-up {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        @keyframes goheza-marquee-down {
          from { transform: translateY(-50%); }
          to { transform: translateY(0); }
        }
        .goheza-marquee-track { will-change: transform; }
        .group:hover .goheza-marquee-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .goheza-marquee-track { animation: none !important; }
        }
      `}</style>
        </section>
    )
}

function MarqueeColumn({
    items,
    direction,
    duration,
}: {
    items: CreatorTestimonial[]
    direction: 'up' | 'down'
    duration: number
}) {
    const loop = [...items, ...items]
    return (
        <div className="relative h-full overflow-hidden">
            <div
                className="goheza-marquee-track flex flex-col gap-4 lg:gap-6"
                style={{
                    animation: `${
                        direction === 'up' ? 'goheza-marquee-up' : 'goheza-marquee-down'
                    } ${duration}s linear infinite`,
                }}
            >
                {loop.map((t, i) => (
                    <CreatorCard key={`${t.handle}-${i}`} t={t} />
                ))}
            </div>
        </div>
    )
}

function CreatorCard({ t }: { t: CreatorTestimonial }) {
    return (
        <div className="group/card relative rounded-2xl border border-hairline bg-surface-elevated p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-[oklch(0.78_0.16_55_/_0.45)] hover:shadow-elevated">
            <div className="flex items-start gap-3">
                <img
                    src={t.avatar}
                    alt={t.name}
                    loading="lazy"
                    className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-[var(--color-background)]"
                    style={{ background: toneBg[t.tone] }}
                />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-ink">{t.name}</p>
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[var(--color-signal)]" />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{t.handle}</p>
                </div>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-ink/85">{t.body}</p>
            <div
                className="mt-3 flex items-center gap-0.5 text-[12px] text-[var(--color-signal)]"
                aria-label="5 star rating"
            >
                {'★★★★★'}
            </div>
        </div>
    )
}
