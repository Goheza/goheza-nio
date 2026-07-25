'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import { DashCard, PageHeader, StatusPill } from '@/components/app/creator/dash-ui'
import { formatMoney, formatNumber, CAMPAIGN_TYPE_META } from '@/components/app/brand/brand-constants'
import { getCampaignsForBrand, refreshBrandAnalytics, type AdminBrandCampaignRow } from '@/lib/admin-analytics'

const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft',
    inreview: 'In Review',
    submission_review: 'Submission Review',
    live: 'Live',
    paused: 'Paused',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
}

export default function AdminBrandAnalyticsPage() {
    const params = useParams()
    const brandUserId = params.brandUserId as string

    const [campaigns, setCampaigns] = useState<AdminBrandCampaignRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [refreshErrors, setRefreshErrors] = useState<string[]>([])

    async function load() {
        try {
            const rows = await getCampaignsForBrand(brandUserId)
            setCampaigns(rows)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load campaigns.')
        }
    }

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            setLoading(true)
            await load()
            if (!cancelled) setLoading(false)
        })()
        return () => {
            cancelled = true
        }
    }, [brandUserId])

    async function handleRefreshAll() {
        setRefreshing(true)
        setRefreshErrors([])
        setError(null)
        try {
            const result = await refreshBrandAnalytics(brandUserId)
            setRefreshErrors(result.errors)
            await load()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to refresh analytics.')
        } finally {
            setRefreshing(false)
        }
    }

    const totals = campaigns.reduce(
        (acc, c) => ({ views: acc.views + c.views, spend: acc.spend + c.budgetUsed }),
        { views: 0, spend: 0 }
    )

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Link
                href="/app/admin/analytics"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> All brands
            </Link>

            <div className="flex flex-wrap items-start justify-between gap-3">
                <PageHeader
                    title="Brand analytics"
                    subtitle={`${formatNumber(totals.views)} total views · ${formatMoney(totals.spend)} total spend`}
                />
                <button
                    onClick={handleRefreshAll}
                    disabled={refreshing || campaigns.length === 0}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing all campaigns…' : 'Refresh all campaigns'}
                </button>
            </div>

            {error && (
                <div className="rounded-xl bg-[oklch(0.97_0.03_25)] px-4 py-3 text-sm text-[oklch(0.5_0.18_25)]">
                    {error}
                </div>
            )}
            {refreshErrors.length > 0 && (
                <div className="rounded-xl bg-[oklch(0.97_0.04_55)] px-4 py-3 text-xs text-[oklch(0.5_0.18_45)]">
                    <p className="font-semibold">Some creators couldn't be synced:</p>
                    <ul className="mt-1 list-disc pl-4">
                        {refreshErrors.map((e, i) => (
                            <li key={i}>{e}</li>
                        ))}
                    </ul>
                </div>
            )}

            {campaigns.length === 0 ? (
                <DashCard className="text-center text-sm text-muted-foreground">
                    This brand has no campaigns yet.
                </DashCard>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {campaigns.map((c) => (
                        <DashCard key={c.id} className="p-0 overflow-hidden">
                            <div className="relative aspect-[16/9] overflow-hidden bg-ink">
                                {c.cover && <img src={c.cover} alt={c.name} className="h-full w-full object-cover" />}
                                <span className="absolute left-3 top-3">
                                    <StatusPill status={STATUS_LABEL[c.status] ?? c.status} />
                                </span>
                            </div>
                            <div className="p-4">
                                <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                                    <Stat label="Views" value={formatNumber(c.views)} />
                                    <Stat label="Spend" value={formatMoney(c.budgetUsed)} />
                                    <Stat label="Approved" value={String(c.approvedVideos)} />
                                </div>
                            </div>
                        </DashCard>
                    ))}
                </div>
            )}
        </div>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-ink/5 px-2 py-1.5">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
            <p className="text-xs font-semibold text-ink">{value}</p>
        </div>
    )
}