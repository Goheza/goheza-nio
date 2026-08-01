'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Wallet, Megaphone, Clock, ArrowUpRight, Sparkles, Loader2, DollarSign, Globe2 } from 'lucide-react'
import { DashCard, StatCard, StatusPill, BrandAvatar } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { getCreatorDashboardData, type CreatorDashboardData } from '@/lib/api/creator-dashboard'
import { submissionStatusToCreatorUi } from '@/lib/api/status-mapping'

function formatMoney(n: number) {
    return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        maximumFractionDigits: 0,
    }).format(n)
}

export default function DashboardHome() {
    const [data, setData] = useState<CreatorDashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const { data: userData } = await supabase.auth.getUser()
                if (!userData?.user) throw new Error('Not signed in.')
                const dashboard = await getCreatorDashboardData(userData.user.id)
                if (!cancelled) setData(dashboard)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    if (error || !data) {
        return (
            <DashCard className="text-center text-sm text-muted-foreground">
                {error ?? 'Something went wrong.'}
            </DashCard>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm text-muted-foreground">Welcome back,</p>
                <h1 className="font-display text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">
                    {data.creatorName || 'creator'} 👋
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">Here's what's happening with your campaigns today.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Lifetime Earnings"
                    value={formatMoney(data.lifetimeEarnings)}
                    icon={<DollarSign className="h-4 w-4" />}
                    tone="orange"
                />
                <StatCard
                    label="Wallet Balance"
                    value=""
                    delta="(Coming Soon)"
                    icon={<Wallet className="h-4 w-4" />}
                    tone="green"
                />
                <StatCard
                    label="Active Campaigns"
                    value={String(data.activeApplicationsCount)}
                    icon={<Megaphone className="h-4 w-4" />}
                    tone="indigo"
                />
                <StatCard
                    label="Pending Reviews"
                    value={String(data.pendingReviewCount)}
                    icon={<Clock className="h-4 w-4" />}
                />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <DashCard className="lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-ink">Earnings Trend</p>
                            <p className="text-xs text-muted-foreground">Coming soon</p>
                        </div>
                        <Link
                            href="/app/creator/earnings"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                        >
                            Details <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="mt-4 flex h-56 items-center justify-center rounded-2xl border border-dashed border-hairline">
                        <p className="text-sm text-muted-foreground">
                            Earnings-over-time chart will appear here once view tracking is connected.
                        </p>
                    </div>
                </DashCard>

                <DashCard>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">Wallet Snapshot</p>
                        <Link
                            href="/app/creator/wallet"
                            className="text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                        >
                            Manage
                        </Link>
                    </div>
                    <p className="font-display mt-4 text-3xl font-semibold text-ink">
                        UGX 35680
                    </p>
                    <p className="text-xs text-muted-foreground">Available balance</p>
                    <ul className="mt-5 space-y-2.5 text-sm">
                        <li className="flex justify-between">
                            <span className="text-muted-foreground">Pending</span>
                            <span className="font-semibold text-ink">  UGX 35680</span>
                        </li>
                        <li className="flex justify-between">
                            <span className="text-muted-foreground">Total withdrawn</span>
                            <span className="font-semibold text-ink"> UGX 35680 </span>
                        </li>
                    </ul>
                </DashCard>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <DashCard className="lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">Recent Submissions</p>
                        <Link
                            href="/app/creator/submissions"
                            className="text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                        >
                            View all
                        </Link>
                    </div>
                    <ul className="mt-4 divide-y divide-hairline">
                        {data.submissions.slice(0, 4).map((s) => {
                            const uiStatus = submissionStatusToCreatorUi(s.status)
                            return (
                                <li key={s.id} className="flex items-center gap-3 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-ink">
                                            {s.campaign_name ?? 'Campaign'}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            Submitted {new Date(s.submitted_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <StatusPill status={uiStatus!} />
                                </li>
                            )
                        })}
                        {data.submissions.length === 0 && (
                            <li className="py-6 text-center text-sm text-muted-foreground">No submissions yet.</li>
                        )}
                    </ul>
                </DashCard>

                <DashCard>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">Latest Payments</p>
                        <Link
                            href="/app/creator/wallet"
                            className="text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                        >
                            Wallet
                        </Link>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">Payment history will appear here once payouts start.</p>
                </DashCard>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                {/* <DashCard>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">Recent Notifications</p>
                        <Link
                            href="/app/creator/notifications"
                            className="text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                        >
                            View all
                        </Link>
                    </div>
                    <ul className="mt-4 space-y-3">
                        {data.notifications.slice(0, 4).map((n) => (
                            <li key={n.id} className="flex gap-3">
                                <span
                                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${!n.read ? 'bg-primary' : 'bg-ink/20'}`}
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-ink">{n.title}</p>
                                    {n.body && <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                                </div>
                                <p className="text-[11px] text-muted-foreground/80">
                                    {new Date(n.created_at).toLocaleDateString()}
                                </p>
                            </li>
                        ))}
                        {data.notifications.length === 0 && (
                            <li className="py-6 text-center text-sm text-muted-foreground">No notifications yet.</li>
                        )}
                    </ul>
                </DashCard> */}

                <DashCard className="lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">Suggested Campaigns</p>
                        <Sparkles className="h-4 w-4 text-[oklch(0.55_0.18_45)]" />
                    </div>
                    <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                        {data.suggestedCampaigns.map((c) => (
                            <li key={c.id}>
                                <Link
                                    href={`/app/creator/campaigns/${c.id}`}
                                    className="group flex h-full flex-col gap-2 rounded-xl border border-hairline bg-background p-3 hover:border-primary/40"
                                >
                                    <div className="flex items-center gap-2">
                                        {c.brandLogoUrl ? (
                                            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
                                                <Image src={c.brandLogoUrl} alt="" fill className="object-cover" />
                                            </div>
                                        ) : (
                                            <BrandAvatar
                                                initial={(c.brandName ?? '?').slice(0, 1).toUpperCase()}
                                                color="oklch(0.66 0.20 42)"
                                                size={32}
                                            />
                                        )}
                                        <p className="truncate text-xs font-medium text-muted-foreground">
                                            {c.brandName ?? 'Brand'}
                                        </p>
                                    </div>
                                    <p className="line-clamp-2 text-sm font-semibold text-ink">{c.name}</p>
                                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1">
                                            <DollarSign className="h-3.5 w-3.5" /> {formatMoney(c.rewardPerK)}/1K
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <Globe2 className="h-3.5 w-3.5" />
                                            {c.countries === 'global' ? 'Global' : c.countries.length}
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                        {data.suggestedCampaigns.length === 0 && (
                            <li className="py-6 text-center text-sm text-muted-foreground sm:col-span-3">
                                No new campaigns match your profile right now.
                            </li>
                        )}
                    </ul>
                </DashCard>
            </div>
        </div>
    )
}