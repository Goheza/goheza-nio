'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Plus, MapPin, Loader2 } from 'lucide-react'
import { DashCard, PageHeader, StatusPill } from '@/components/app/creator/dash-ui'
import { formatMoney, formatNumber, CAMPAIGN_TYPE_META  } from '@/components/app/brand/brand-constants'
import { supabase } from '@/lib/supabase'
import { listCampaignsWithStats } from '@/lib/api/campaigns'
import type { CampaignSummary, CampaignUiStatus } from '@/types/campaign'

const FILTERS: ('All' | CampaignUiStatus)[] = ['All', 'Live', 'Submission & Review', 'Completed', 'Paused', 'Draft']

function daysBetween(a: string, b: string) {
    return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000))
}

export default function Campaigns() {
    const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
    const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const { data: userData } = await supabase.auth.getUser()
                if (!userData?.user) throw new Error('Not signed in.')
                const list = await listCampaignsWithStats(userData.user.id)
                if (!cancelled) setCampaigns(list)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load campaigns.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [])

    const list = useMemo(() => campaigns.filter((c) => filter === 'All' || c.status === filter), [filter, campaigns])
    const today = new Date().toISOString().slice(0, 10)

    return (
        <div className="space-y-6">
            <PageHeader
                title="Campaigns"
                subtitle="All campaigns you've created, with live status, budget and creator progress."
                action={
                    <Link
                        href="/app/brand/create"
                        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.02]"
                        style={{ backgroundImage: 'var(--gradient-primary)' }}
                    >
                        <Plus className="h-4 w-4" /> Create Campaign
                    </Link>
                }
            />

            <DashCard>
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                filter === f
                                    ? 'text-primary-foreground shadow-sm'
                                    : 'border border-hairline bg-background text-ink hover:bg-ink/5'
                            }`}
                            style={filter === f ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </DashCard>

            {loading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                </div>
            )}

            {error && <DashCard className="text-center text-sm text-muted-foreground">{error}</DashCard>}

            {!loading && !error && (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {list.map((c) => {
                        const meta = CAMPAIGN_TYPE_META[c.type]
                        const remaining = Math.max(0, c.budgetTotal - c.budgetUsed)
                        const daysLeft =
                            c.phase === 'live'
                                ? c.liveEndsAt
                                    ? daysBetween(today, c.liveEndsAt)
                                    : 0
                                : c.phase === 'submission'
                                ? c.submissionDeadline
                                    ? daysBetween(today, c.submissionDeadline)
                                    : 0
                                : 0
                        const countriesLabel =
                            c.countries === 'global'
                                ? '🌍 Global'
                                : `📍 ${c.countries.slice(0, 2).join(', ')}${
                                      c.countries.length > 2 ? ` +${c.countries.length - 2}` : ''
                                  }`
                        return (
                            <article
                                key={c.id}
                                className="flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface-elevated shadow-card"
                            >
                                <div className="relative aspect-[16/9] overflow-hidden bg-ink">
                                    {c.cover && (
                                        <img
                                            src={c.cover}
                                            alt={c.name}
                                            loading="lazy"
                                            className="h-full w-full object-cover"
                                        />
                                    )}
                                    <span className="absolute left-3 top-3">
                                        <StatusPill status={c.status} />
                                    </span>
                                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink shadow-card backdrop-blur">
                                        {meta.label}
                                    </span>
                                </div>
                                <div className="flex flex-1 flex-col p-5">
                                    <p className="font-display text-lg font-semibold tracking-[-0.01em] text-ink">
                                        {c.name}
                                    </p>
                                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <MapPin className="h-3 w-3" /> {countriesLabel}
                                    </p>

                                    <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                        <Stat
                                            label="Creators selected"
                                            value={`${c.approvedVideos} / ${c.creatorsRequested}`}
                                        />
                                        <Stat label="Videos approved" value={String(c.approvedVideos)} />
                                        <Stat label="Views generated" value={formatNumber(c.views)} />
                                        <Stat label="Budget used" value={formatMoney(c.budgetUsed)} />
                                        <Stat label="Budget remaining" value={formatMoney(remaining)} />
                                        <Stat
                                            label={
                                                c.phase === 'live'
                                                    ? 'Days remaining'
                                                    : c.phase === 'submission'
                                                    ? 'Days to Live phase'
                                                    : 'Status'
                                            }
                                            value={
                                                c.phase === 'completed'
                                                    ? 'Ended'
                                                    : c.phase === null
                                                    ? c.status
                                                    : `${daysLeft}d`
                                            }
                                        />
                                    </dl>

                                    <Link
                                        href={`/app/brand/campaigns/${c.id}`}
                                        className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/85"
                                    >
                                        Manage Campaign
                                    </Link>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}

            {!loading && !error && list.length === 0 && (
                <DashCard className="text-center text-sm text-muted-foreground">
                    No campaigns match this filter.
                </DashCard>
            )}
        </div>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-[13px] font-semibold text-ink">{value}</dd>
        </div>
    )
}
