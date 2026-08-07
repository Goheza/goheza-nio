'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
    Megaphone,
    Inbox,
    CheckCircle2,
    DollarSign,
    Wallet,
    Eye,
    Plus,
    ArrowRight,
    MessageSquare,
    Loader2,
} from 'lucide-react'
import { DashCard, StatCard, StatusPill } from '@/components/app/creator/dash-ui'
import { formatMoney, formatNumber } from '@/components/app/brand/brand-constants'
import { supabase } from '@/lib/supabase'
import { getBrandDashboardData, type BrandDashboardData } from '@/lib/api/brand-dashboard'
import { submissionStatusToUi } from '@/lib/api/status-mapping'

export default function BrandHome() {
    const [data, setData] = useState<BrandDashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const intializeBrandHome = async () => {
        try {
            const { data: userData } = await supabase.auth.getUser()

            if (userData?.user) {
                const dashboard = await getBrandDashboardData(userData.user.id)
                setData(dashboard)
                setLoading(false)
            } else {
                router.push('/app/auth/login')
            }
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message)
            } else {
                setError(error as string)
            }
        }
    }

    useEffect(() => {
        intializeBrandHome()
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
                {error ?? 'Something went wrong loading your dashboard.'}
            </DashCard>
        )
    }

    const activeCampaigns = data.campaigns.filter((c) => c.status !== 'Completed')

    return (
        <div className="space-y-6 px-4 sm:px-0">
            <div>
                <p className="text-sm text-muted-foreground">Welcome back,</p>
                <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-3xl lg:text-4xl">
                    {data.brandName || 'there'} 👋
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">Here's the snapshot of your campaigns today.</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:overflow-x-auto hide-scrollbar sm:pb-2">
                <div className="sm:min-w-[240px]">
                    <StatCard
                        label="Active Campaigns"
                        value={String(data.activeCampaignsCount)}
                        icon={<Megaphone className="h-4 w-4" />}
                        tone="indigo"
                    />
                </div>

                <div className="sm:min-w-[240px]">
                    <StatCard
                        label="Pending Submissions"
                        value={String(data.pendingSubmissionsCount)}
                        icon={<Inbox className="h-4 w-4" />}
                        tone="orange"
                    />
                </div>

                <div className="sm:min-w-[240px]">
                    <StatCard
                        label="Approved Videos"
                        value={String(data.approvedVideosCount)}
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        tone="green"
                    />
                </div>

                <div className="sm:min-w-[240px]">
                    <StatCard
                        label="Campaign Spend"
                        value={formatMoney(0)}
                        icon={<DollarSign className="h-4 w-4" />}
                    />
                </div>

                <div className="sm:min-w-[240px]">
                    <StatCard
                        label="Wallet Balance"
                        value={formatMoney(0)}
                        delta="(Coming Soon)"
                        icon={<Wallet className="h-4 w-4" />}
                        tone="green"
                    />
                </div>

                <div className="sm:min-w-[240px]">
                    <StatCard
                        label="Total Views"
                        value={formatNumber(data.totalViews)}
                        icon={<Eye className="h-4 w-4" />}
                        tone="orange"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4">
                <QuickAction
                    href="/app/brand/create"
                    label="Create Campaign"
                    icon={<Plus className="h-4 w-4" />}
                    primary
                />
                <QuickAction
                    href="/app/brand/submissions"
                    label="View Submissions"
                    icon={<Inbox className="h-4 w-4" />}
                />
                <QuickAction href="/app/brand/wallet" label="Add Funds" icon={<Wallet className="h-4 w-4" />} />
                <QuickAction
                    href="/schedule"
                    label=" Talk to Sales Book a 30-minute strategy call."
                    icon={<MessageSquare className="h-4 w-4" />}
                />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <DashCard className="lg:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="text-sm font-semibold text-ink">Campaign Performance</p>
                            <p className="text-xs text-muted-foreground">Views trend — coming soon</p>
                        </div>
                        <Link
                            href="/app/brand/analytics"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                        >
                            Open analytics <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="mt-4 flex h-48 items-center justify-center rounded-2xl border border-dashed border-hairline px-4 text-center sm:h-56 lg:h-64">
                        <p className="text-sm text-muted-foreground">
                            Views-over-time chart will appear here once analytics tracking is connected.
                        </p>
                    </div>
                </DashCard>

                <DashCard>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">Wallet Snapshot</p>
                        <Link
                            href="/app/brand/wallet"
                            className="text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                        >
                            Manage
                        </Link>
                    </div>
                    <p className="font-display mt-4 text-2xl font-semibold text-ink sm:text-3xl">
                        {formatMoney(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Available balance</p>
                    <ul className="mt-5 space-y-2.5 text-sm">
                        <li className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Reserved</span>
                            <span className="font-semibold text-ink">{formatMoney(0)}</span>
                        </li>
                        <li className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Total spend</span>
                            <span className="font-semibold text-ink">{formatMoney(0)}</span>
                        </li>
                    </ul>
                    <Link
                        href="/app/brand/wallet"
                        className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/85"
                    >
                        Add Funds (Coming Soon)
                    </Link>
                </DashCard>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <DashCard className="lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">Active Campaigns</p>
                        <Link
                            href="/app/brand/campaigns"
                            className="text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                        >
                            View all
                        </Link>
                    </div>
                    <ul className="mt-4 divide-y divide-hairline">
                        {activeCampaigns.slice(0, 4).map((c) => (
                            <li key={c.id} className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
                                {c.cover && (
                                    <img
                                        src={c.cover}
                                        alt=""
                                        loading="lazy"
                                        className="h-12 w-16 shrink-0 rounded-lg object-cover"
                                    />
                                )}
                                <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                                    <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {formatNumber(c.views)} views · {c.approvedVideos}/{c.creatorsRequested}{' '}
                                        approved
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <StatusPill status={c.status} />
                                    <Link
                                        href={`/app/brand/campaigns/${c.id}`}
                                        className="hidden rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink/85 sm:inline-flex"
                                    >
                                        Open
                                    </Link>
                                </div>
                            </li>
                        ))}
                        {activeCampaigns.length === 0 && (
                            <li className="py-6 text-center text-sm text-muted-foreground">No campaigns yet.</li>
                        )}
                    </ul>
                </DashCard>

                <DashCard>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">Recent Submissions</p>
                        <Link
                            href="/app/brand/submissions"
                            className="text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                        >
                            All
                        </Link>
                    </div>
                    <ul className="mt-4 space-y-3">
                        {data.recentSubmissions.map((s) => (
                            <li key={s.id} className="flex items-center gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-ink">{s.campaign_name}</p>
                                    <p className="truncate text-[11px] text-muted-foreground">
                                        Submitted {new Date(s.submitted_at).toLocaleDateString()}
                                    </p>
                                </div>
                                {submissionStatusToUi(s.status) && (
                                    <StatusPill status={submissionStatusToUi(s.status)!} />
                                )}
                            </li>
                        ))}
                        {data.recentSubmissions.length === 0 && (
                            <li className="py-6 text-center text-sm text-muted-foreground">No submissions yet.</li>
                        )}
                    </ul>
                </DashCard>
            </div>

            <DashCard>
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">Recent Notifications</p>
                    <Link
                        href="/app/brand/notifications"
                        className="text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                    >
                        View all
                    </Link>
                </div>
                <ul className="mt-4 space-y-3">
                    {data.notifications.slice(0, 5).map((n) => (
                        <li key={n.id} className="flex flex-wrap gap-3 sm:flex-nowrap">
                            <span
                                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${!n.read ? 'bg-primary' : 'bg-ink/20'}`}
                            />
                            <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                                <p className="text-sm font-medium text-ink">{n.title}</p>
                                <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                            </div>
                            <p className="shrink-0 pl-4 text-[11px] text-muted-foreground/80 sm:pl-0">
                                {new Date(n.created_at).toLocaleDateString()}
                            </p>
                        </li>
                    ))}
                    {data.notifications.length === 0 && (
                        <li className="py-6 text-center text-sm text-muted-foreground">No notifications yet.</li>
                    )}
                </ul>
            </DashCard>
        </div>
    )
}

function QuickAction({
    href,
    label,
    icon,
    primary = false,
}: {
    href: string
    label: string
    icon: React.ReactNode
    primary?: boolean
}) {
    const cls = primary
        ? 'text-primary-foreground shadow-glow'
        : 'border border-hairline bg-surface-elevated text-ink hover:bg-ink/5'
    const style = primary ? { backgroundImage: 'var(--gradient-primary)' } : undefined
    return (
        <Link
            href={href}
            className={`flex items-center gap-2.5 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${cls}`}
            style={style}
        >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">{icon}</span>
            <span className="truncate">{label}</span>
        </Link>
    )
}
