'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
    Building2,
    Users,
    Megaphone,
    Inbox,
    ShieldAlert,
    ShieldCheck,
    ArrowRight,
    Loader2,
} from 'lucide-react'
import { DashCard, StatCard, StatusPill } from '@/components/app/creator/dash-ui'
import { formatNumber } from '@/components/app/brand/brand-constants'
import { supabase } from '@/lib/supabase'
import { getAdminDashboardData, type AdminDashboardData } from '@/lib/admin-dashboard'
import { UserNameEntry } from '@/scripts/backfill-tiktok-usernames'

export default function AdminHome() {
    const [data, setData] = useState<AdminDashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const runThisShit = () => {
            UserNameEntry().catch((err) => {
                console.error('Backfill script crashed:', err)
                process.exit(1)
            })
        }
    

    const initializeAdminHome = async () => {
        try {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData?.user) {
                router.push('/app/auth/login')
                return
            }
            const dashboard = await getAdminDashboardData(userData.user.id)
            setData(dashboard)
            setLoading(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        }
    }

    useEffect(() => {
        // runThisShit();
        initializeAdminHome()
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
                {error ?? 'Something went wrong loading the admin dashboard.'}
            </DashCard>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm text-muted-foreground">Welcome back,</p>
                <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-3xl lg:text-4xl">
                    {data.adminName} 👋
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Here's what needs your attention across the platform today.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <StatCard
                    label="Pending Verifications"
                    value={String(data.stats.pendingVerifications)}
                    delta="Brands awaiting review"
                    icon={<Building2 className="h-4 w-4" />}
                    tone="orange"
                />
                <StatCard
                    label="Campaigns in Review"
                    value={String(data.stats.campaignsInReview)}
                    delta="Awaiting approval"
                    icon={<Megaphone className="h-4 w-4" />}
                    tone="orange"
                />
                <StatCard
                    label="Submissions to Review"
                    value={String(data.stats.submissionsNeedingReview)}
                    icon={<Inbox className="h-4 w-4" />}
                    tone="indigo"
                />
                <StatCard
                    label="Total Brands"
                    value={formatNumber(data.stats.totalBrands)}
                    icon={<Building2 className="h-4 w-4" />}
                />
                <StatCard
                    label="Total Creators"
                    value={formatNumber(data.stats.totalCreators)}
                    icon={<Users className="h-4 w-4" />}
                />
                <StatCard
                    label="Suspended Accounts"
                    value={String(data.stats.suspendedBrands + data.stats.suspendedCreators)}
                    icon={<ShieldAlert className="h-4 w-4" />}
                    tone="green"
                />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <QuickAction href="/app/admin/brands?filter=pending" label="Verify Brands" icon={<Building2 className="h-4 w-4" />} primary />
                <QuickAction href="/app/admin/campaigns?filter=inreview" label="Approve Campaigns" icon={<Megaphone className="h-4 w-4" />} />
                <QuickAction href="/app/admin/creators" label="Browse Creators" icon={<Users className="h-4 w-4" />} />
                <QuickAction href="/app/admin/roster" label="Admin Roster" icon={<ShieldCheck className="h-4 w-4" />} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <DashCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-ink">Brands Awaiting Verification</p>
                            <p className="text-xs text-muted-foreground">Oldest requests first</p>
                        </div>
                        <Link
                            href="/app/admin/brands?filter=pending"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                        >
                            View all <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <ul className="mt-4 divide-y divide-hairline">
                        {data.pendingBrandVerifications.map((b) => (
                            <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-ink">
                                        {b.brand_name || 'Unnamed brand'}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">{b.brand_email}</p>
                                </div>
                                <Link
                                    href={`/app/admin/brands/${b.user_id}`}
                                    className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink/85"
                                >
                                    Review
                                </Link>
                            </li>
                        ))}
                        {data.pendingBrandVerifications.length === 0 && (
                            <li className="py-6 text-center text-sm text-muted-foreground">
                                No brands waiting on verification.
                            </li>
                        )}
                    </ul>
                </DashCard>

                <DashCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-ink">Campaigns Awaiting Approval</p>
                            <p className="text-xs text-muted-foreground">Submitted for launch review</p>
                        </div>
                        <Link
                            href="/app/admin/campaigns?filter=inreview"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                        >
                            View all <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <ul className="mt-4 divide-y divide-hairline">
                        {data.campaignsAwaitingApproval.map((c) => (
                            <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                                    </p>
                                </div>
                                <StatusPill status="In Review" />
                                <Link
                                    href={`/app/admin/campaigns/${c.id}`}
                                    className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink/85"
                                >
                                    Review
                                </Link>
                            </li>
                        ))}
                        {data.campaignsAwaitingApproval.length === 0 && (
                            <li className="py-6 text-center text-sm text-muted-foreground">
                                No campaigns waiting on approval.
                            </li>
                        )}
                    </ul>
                </DashCard>
            </div>

            <DashCard>
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">Recently Suspended</p>
                    <Link
                        href="/app/admin/brands?filter=suspended"
                        className="text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                    >
                        View all
                    </Link>
                </div>
                <ul className="mt-4 divide-y divide-hairline">
                    {data.recentlySuspended.map((s) => (
                        <li key={`${s.type}-${s.id}`} className="flex items-center justify-between gap-3 py-3">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-ink">
                                    {s.name}{' '}
                                    <span className="text-xs font-normal text-muted-foreground">
                                        · {s.type === 'brand' ? 'Brand' : 'Creator'}
                                    </span>
                                </p>
                                {s.suspension_reason && (
                                    <p className="truncate text-xs text-muted-foreground">{s.suspension_reason}</p>
                                )}
                            </div>
                            <p className="shrink-0 text-[11px] text-muted-foreground/80">
                                {s.suspended_at ? new Date(s.suspended_at).toLocaleDateString() : '—'}
                            </p>
                        </li>
                    ))}
                    {data.recentlySuspended.length === 0 && (
                        <li className="py-6 text-center text-sm text-muted-foreground">
                            No suspended accounts right now.
                        </li>
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
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">{icon}</span>
            {label}
        </Link>
    )
}