'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, Loader2, RefreshCw, Info, Clock } from 'lucide-react'
import { DashCard, PageHeader, StatCard } from '@/components/app/creator/dash-ui'
import { formatMoney, formatNumber } from '@/components/app/brand/brand-constants'
import { getCampaignWithStats } from '@/lib/api/campaigns'
import { getCampaignVideoAnalytics, refreshCampaignAnalytics, type CampaignVideoRow } from '@/lib/api/brand-analytics'
import type { CampaignSummary } from '@/types/campaign'
import { supabase } from '@/lib/supabase'

export default function CampaignAnalytics() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [c, setC] = useState<CampaignSummary | null>(null)
    const [rows, setRows] = useState<CampaignVideoRow[]>([])
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [brandUserId, setBrandUserId] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [refreshError, setRefreshError] = useState<string | null>(null)
    const [refreshErrors, setRefreshErrors] = useState<string[]>([])
    const [lastRefreshedCount, setLastRefreshedCount] = useState<number | null>(null)

    async function load(uid: string) {
        const [campaign, videoRows] = await Promise.all([getCampaignWithStats(id, uid), getCampaignVideoAnalytics(id)])
        if (!campaign) {
            setNotFound(true)
            return
        }
        setC(campaign)
        setRows(videoRows)
    }

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            setLoading(true)
            const { data: userData } = await supabase.auth.getUser()
            if (!userData?.user) {
                if (!cancelled) {
                    setNotFound(true)
                    setLoading(false)
                }
                return
            }
            if (!cancelled) setBrandUserId(userData.user.id)
            await load(userData.user.id)
            if (!cancelled) setLoading(false)
        })()
        return () => {
            cancelled = true
        }
    }, [id])

    async function handleRefresh() {
        if (!brandUserId) return
        setRefreshing(true)
        setRefreshError(null)
        setRefreshErrors([])
        setLastRefreshedCount(null)
        try {
            const result = await refreshCampaignAnalytics(id)
            setRefreshErrors(result.errors)
            setLastRefreshedCount(result.synced)
            await load(brandUserId)
        } catch (err) {
            setRefreshError(err instanceof Error ? err.message : 'Failed to refresh analytics.')
        } finally {
            setRefreshing(false)
        }
    }

    if (notFound) {
        return <div className="p-8 text-center text-sm text-muted-foreground">Campaign not found.</div>
    }

    if (loading || !c) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    const postedRows = rows.filter((r) => r.posted)
    const unpostedCount = rows.length - postedRows.length

    const totals = postedRows.reduce(
        (acc, r) => ({
            likes: acc.likes + r.likes,
            comments: acc.comments + r.comments,
            shares: acc.shares + r.shares,
        }),
        { likes: 0, comments: 0, shares: 0 }
    )
    const engagementRate = c.views > 0 ? ((totals.likes + totals.comments + totals.shares) / c.views) * 100 : 0

    return (
        <div className="space-y-6">
            <Link
                href="/app/brand/analytics"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> All campaigns
            </Link>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <PageHeader
                    title={`${c.name} — Analytics`}
                    subtitle="Real performance pulled from TikTok for each approved creator's video."
                />
                <button
                    onClick={handleRefresh}
                    disabled={refreshing || postedRows.length === 0}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing…' : 'Refresh Analytics'}
                </button>
            </div>

            {refreshError && (
                <div className="rounded-xl bg-[oklch(0.97_0.03_25)] px-4 py-3 text-sm text-[oklch(0.5_0.18_25)]">
                    {refreshError}
                </div>
            )}
            {lastRefreshedCount !== null && refreshErrors.length === 0 && !refreshError && (
                <div className="rounded-xl bg-[oklch(0.97_0.03_145)] px-4 py-3 text-sm text-[oklch(0.4_0.14_145)]">
                    Synced {lastRefreshedCount} video{lastRefreshedCount === 1 ? '' : 's'} from TikTok.
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

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Views" value={formatNumber(c.views)} tone="orange" />
                <StatCard label="Likes" value={formatNumber(totals.likes)} tone="indigo" />
                <StatCard label="Comments" value={formatNumber(totals.comments)} tone="green" />
                <StatCard label="Shares" value={formatNumber(totals.shares)} />
                <StatCard label="Engagement Rate" value={`${engagementRate.toFixed(1)}%`} tone="orange" />
                <StatCard label="Spend" value={formatMoney(c.budgetUsed)} />
                <StatCard
                    label="Approved Videos"
                    value={`${c.approvedVideos} / ${c.creatorsRequested}`}
                    tone="indigo"
                />
            </div>

            <DashCard className="border-dashed">
                <div className="flex items-start gap-2.5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                        Views, likes, comments, and shares come from TikTok's Content Posting API. Audience
                        demographics, traffic source, and watch-time data aren't available — that needs TikTok's
                        separate Business/Ads API tier. Earnings per video aren't shown here yet either, pending a
                        payout model. Instagram videos aren't shown here yet since Instagram account connection isn't
                        built for creators yet.
                    </p>
                </div>
            </DashCard>

            {unpostedCount > 0 && (
                <DashCard className="border-dashed">
                    <div className="flex items-start gap-2.5">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                            {unpostedCount} approved submission{unpostedCount === 1 ? '' : 's'} not posted to TikTok
                            through Goheza yet — no analytics to show until that happens.
                        </p>
                    </div>
                </DashCard>
            )}

            {postedRows.length === 0 ? (
                <DashCard className="text-center text-sm text-muted-foreground">
                    No posted videos yet — analytics appear once creators are approved and their content is posted to
                    TikTok.
                </DashCard>
            ) : (
                <>
                    <div className="grid gap-4 md:hidden">
                        {postedRows.map((r) => (
                            <DashCard
                                key={r.id}
                                className="cursor-pointer p-4 transition-colors hover:bg-ink/[0.02]"
                               
                            >
                                <div  onClick={() => router.push(`/app/brand/analytics/${id}/${r.id}`)} className="flex items-center justify-between gap-3">
                                    <p className="truncate text-sm font-semibold text-ink">{r.creatorName}</p>
                                    {r.tiktokUrl && (
                                        <a
                                            href={r.tiktokUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[oklch(0.55_0.18_45)]"
                                        >
                                            Open post <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    {r.analyticsSyncedAt
                                        ? `Synced ${new Date(r.analyticsSyncedAt).toLocaleDateString()}`
                                        : 'Not synced yet'}
                                </p>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                                    <Stat label="Views" value={formatNumber(r.views)} />
                                    <Stat label="Likes" value={formatNumber(r.likes)} />
                                    <Stat label="Comments" value={formatNumber(r.comments)} />
                                    <Stat label="Shares" value={formatNumber(r.shares)} />
                                    <Stat label="Engage" value={`${r.engagementRate.toFixed(1)}%`} />
                                </div>
                            </DashCard>
                        ))}
                    </div>

                    <DashCard className="hidden p-0 overflow-x-auto md:block">
                        <table className="w-full min-w-[820px] text-sm">
                            <thead className="border-b border-hairline bg-[oklch(0.97_0.012_78)] text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                <tr>
                                    <th className="px-5 py-3">Creator</th>
                                    <th className="px-3 py-3 text-right">Views</th>
                                    <th className="px-3 py-3 text-right">Likes</th>
                                    <th className="px-3 py-3 text-right">Comments</th>
                                    <th className="px-3 py-3 text-right">Shares</th>
                                    <th className="px-3 py-3 text-right">Engage</th>
                                    <th className="px-5 py-3 text-right">Synced</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-hairline">
                                {postedRows.map((r) => (
                                    <tr
                                        key={r.id}
                                        onClick={() => router.push(`/app/brand/analytics/${id}/${r.id}`)}
                                        className="cursor-pointer hover:bg-ink/[0.02]"
                                    >
                                        <td className="px-5 py-3">
                                            <p className="font-semibold text-ink">{r.creatorName}</p>
                                            {r.tiktokUrl && (
                                                <a
                                                    href={r.tiktokUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="inline-flex items-center gap-1 text-[11px] text-[oklch(0.55_0.18_45)]"
                                                >
                                                    Open post <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold text-ink">
                                            {formatNumber(r.views)}
                                        </td>
                                        <td className="px-3 py-3 text-right text-ink">{formatNumber(r.likes)}</td>
                                        <td className="px-3 py-3 text-right text-ink">{formatNumber(r.comments)}</td>
                                        <td className="px-3 py-3 text-right text-ink">{formatNumber(r.shares)}</td>
                                        <td className="px-3 py-3 text-right text-ink">
                                            {r.engagementRate.toFixed(1)}%
                                        </td>
                                        <td className="px-5 py-3 text-right text-muted-foreground">
                                            {r.analyticsSyncedAt ? new Date(r.analyticsSyncedAt).toLocaleDateString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </DashCard>
                </>
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