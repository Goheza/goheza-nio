import { type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { DashCard , StatCard, StatusPill, BrandAvatar, PageHeader } from '@/components/app/creator/dash-ui'
import type { BrandCampaign } from './brand-data'
import { CampaignSummary } from '@/types/campaign'

export function PhaseTimeline({ campaign }: { campaign: CampaignSummary }) {
    const { phase, liveStartsAt, liveEndsAt } = campaign
    const phases = [
        { id: 'submission' as const, label: 'Submission & Review', caption: 'Brands review and approve creators' },
        { id: 'live' as const, label: 'Live Campaign', caption: `${liveStartsAt} → ${liveEndsAt}` },
        { id: 'completed' as const, label: 'Completed', caption: 'Final analytics & payouts' },
    ]
    const idx = phases.findIndex((p) => p.id === phase)
    return (
        <DashCard>
            <p className="text-sm font-semibold text-ink">Campaign Lifecycle</p>
            <p className="mt-1 text-xs text-muted-foreground">
                The Live phase begins after your 2-week submission & review window ends.
            </p>
            <ol className="mt-5 space-y-3">
                {phases.map((p, i) => {
                    const done = i < idx
                    const current = i === idx
                    return (
                        <li
                            key={p.id}
                            className="flex items-start gap-3"
                        >
                            <span
                                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                    done || current ? 'text-white' : 'bg-ink/10 text-ink/40'
                                } ${current ? 'ring-2 ring-primary/30 ring-offset-2 ring-offset-surface-elevated' : ''}`}
                                style={done || current ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
                            >
                                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p
                                    className={`text-sm font-semibold ${done || current ? 'text-ink' : 'text-muted-foreground'}`}
                                >
                                    {p.label}
                                </p>
                                <p className="text-[11px] text-muted-foreground">{p.caption}</p>
                            </div>
                            {current && (
                                <span className="rounded-full bg-[oklch(0.94_0.07_55)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.5_0.18_45)]">
                                    Current
                                </span>
                            )}
                        </li>
                    )
                })}
            </ol>
        </DashCard>
    )
}

export function CampaignTypeCard({
    title,
    description,
    icon,
    onClick,
    comingSoon = false,
    learnMoreHref,
}: {
    title: string
    description: string
    icon: ReactNode
    onClick?: () => void
    comingSoon?: boolean
    learnMoreHref?: string
}) {
    return (
        <div
            className={`group relative flex flex-col rounded-2xl border border-hairline bg-surface-elevated p-6 shadow-card transition-all ${
                comingSoon ? 'opacity-75' : 'hover:-translate-y-0.5 hover:border-primary/30 cursor-pointer'
            }`}
            onClick={comingSoon ? undefined : onClick}
        >
            {comingSoon && (
                <span className="absolute right-4 top-4 rounded-full bg-ink/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                    Coming Soon
                </span>
            )}
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[oklch(0.94_0.07_55)] text-[oklch(0.55_0.18_45)]">
                {icon}
            </span>
            <p className="font-display mt-4 text-lg font-semibold text-ink">{title}</p>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            {!comingSoon && (
                <p className="mt-4 text-xs font-semibold text-[oklch(0.55_0.18_45)] group-hover:underline">
                    Learn more →
                </p>
            )}
            {learnMoreHref && null}
        </div>
    )
}

export function PricingSummary({
    rows,
    total,
    footnote,
}: {
    rows: { label: string; value: string; muted?: boolean }[]
    total: { label: string; value: string }
    footnote?: string
}) {
    return (
        <DashCard className="sticky top-20">
            <p className="text-sm font-semibold text-ink">Pricing summary</p>
            <ul className="mt-4 divide-y divide-hairline">
                {rows.map((r) => (
                    <li
                        key={r.label}
                        className="flex items-center justify-between py-3 text-sm"
                    >
                        <span className={r.muted ? 'text-muted-foreground' : 'text-ink'}>{r.label}</span>
                        <span className={`font-semibold ${r.muted ? 'text-muted-foreground' : 'text-ink'}`}>
                            {r.value}
                        </span>
                    </li>
                ))}
            </ul>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-ink p-4 text-white">
                <span className="text-sm font-semibold">{total.label}</span>
                <span className="font-display text-xl font-semibold">{total.value}</span>
            </div>
            {footnote && <p className="mt-3 text-[11px] text-muted-foreground">{footnote}</p>}
        </DashCard>
    )
}
