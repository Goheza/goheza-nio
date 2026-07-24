'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { DashCard, PageHeader, StatCard } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { listSubmissionsForCreator } from '@/lib/api/creator-submissions'
import { getCampaignsByIds } from '@/lib/api/creator-campaigns'
import type { CampaignSubmission } from '@/types/submission'
import type { CreatorCampaignSummary } from '@/types/campaign'

function formatMoney(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}
function formatNumber(n: number) {
    return new Intl.NumberFormat('en-US', {
        notation: n >= 10000 ? 'compact' : 'standard',
        maximumFractionDigits: 1,
    }).format(n)
}

export default function Analytics() {
    const [submissions, setSubmissions] = useState<CampaignSubmission[]>([])
    const [campaigns, setCampaigns] = useState<Record<string, CreatorCampaignSummary>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData?.user) return
            const subs = await listSubmissionsForCreator(userData.user.id)
            const campaignMap = await getCampaignsByIds(subs.map((s) => s.campaign_id))
            if (!cancelled) {
                setSubmissions(subs)
                setCampaigns(campaignMap)
                setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    const live = useMemo(() => submissions.filter((s) => s.status === 'live'), [submissions])
    const totalViews = live.reduce((s, x) => s + x.views, 0)
    const totalEarnings = live.reduce((sum, s) => {
        const rate = campaigns[s.campaign_id]?.rewardPerK ?? 0
        return sum + (s.views / 1000) * rate
    }, 0)

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Analytics"
                subtitle="Your performance hub — views and earnings across live submissions."
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Views" value={formatNumber(totalViews)} tone="orange" />
                <StatCard label="Live Videos" value={String(live.length)} tone="indigo" />
                <StatCard
                    label="Avg Views / Video"
                    value={formatNumber(live.length ? Math.round(totalViews / live.length) : 0)}
                />
                <StatCard label="Total Earnings" value={formatMoney(totalEarnings)} tone="green" />
            </div>

            <DashCard>
                <p className="text-sm font-semibold text-ink">Engagement & audience insights</p>
                <div className="mt-4 flex h-40 items-center justify-center rounded-2xl border border-dashed border-hairline">
                    <p className="max-w-md text-center text-sm text-muted-foreground">
                        Likes, comments, shares, and audience demographics need a connection to each platform's native
                        analytics — not tracked yet. Views and earnings above are real; everything else here is pending
                        that integration.
                    </p>
                </div>
            </DashCard>

            <DashCard className="p-0 overflow-hidden">
                <div className="p-5 sm:p-6">
                    <p className="text-sm font-semibold text-ink">Per-Video Performance</p>
                    <p className="text-xs text-muted-foreground">Every live video, with views and earnings.</p>
                </div>

                <ul className="space-y-3 px-4 pb-5 md:hidden">
                    {live.map((s) => {
                        const campaign = campaigns[s.campaign_id]
                        const earned = (s.views / 1000) * (campaign?.rewardPerK ?? 0)
                        return (
                            <li key={s.id} className="rounded-2xl border border-hairline bg-background p-3">
                                <p className="truncate text-sm font-semibold text-ink">
                                    {campaign?.name ?? 'Campaign'}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                    {campaign?.brandName ?? 'Brand'} · {new Date(s.submitted_at).toLocaleDateString()}
                                </p>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                                    <MiniStat label="Views" value={formatNumber(s.views)} />
                                    <MiniStat label="Earnings" value={formatMoney(earned)} />
                                </div>
                            </li>
                        )
                    })}
                </ul>

                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[600px] text-sm">
                        <thead className="border-y border-hairline bg-[oklch(0.97_0.012_78)] text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            <tr>
                                <th className="px-5 py-3">Video</th>
                                <th className="px-3 py-3 text-right">Views</th>
                                <th className="px-3 py-3 text-right">Earnings</th>
                                <th className="px-5 py-3 text-right">CPM</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {live.map((s) => {
                                const campaign = campaigns[s.campaign_id]
                                const earned = (s.views / 1000) * (campaign?.rewardPerK ?? 0)
                                return (
                                    <tr key={s.id} className="hover:bg-ink/[0.02]">
                                        <td className="px-5 py-3">
                                            <p className="font-semibold text-ink">{campaign?.name ?? 'Campaign'}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {campaign?.brandName ?? 'Brand'}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold text-ink">
                                            {formatNumber(s.views)}
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold text-ink">
                                            {formatMoney(earned)}
                                        </td>
                                        <td className="px-5 py-3 text-right text-muted-foreground">
                                            {formatMoney(campaign?.rewardPerK ?? 0)}
                                        </td>
                                    </tr>
                                )
                            })}
                            {live.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                                        No live videos yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </DashCard>
        </div>
    )
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-ink/5 px-2 py-1.5">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
            <p className="text-xs font-semibold text-ink">{value}</p>
        </div>
    )
}
