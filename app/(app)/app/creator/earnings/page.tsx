'use client'

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Loader2, RefreshCw } from 'lucide-react'
import { DashCard, PageHeader, StatCard } from '@/components/app/creator/dash-ui'
import {
    EarningsBreadcrumb,
    BrandGrid,
    CampaignGrid,
    CampaignEarningsDetail,
} from '@/components/app/creator/earning-nav'
import { supabase } from '@/lib/supabase'
import { getEarningsByBrand } from '@/lib/api/creator-earnings'
import { getWalletSnapshot } from '@/lib/api/creator-wallet'
import { getDateRangeForFilter, type QuickFilter } from '@/lib/date-filters'
import { filterEarningsTree } from '@/lib/earnings-filter'
import type { CreatorEarningsByBrand, CreatorEarningsByCampaign } from '@/types/earnings'
import type { CreatorWalletSnapshot } from '@/types/creator-wallet'
import { DevelopmentNotice } from '@/components/app/developmentNotice'

const QUICK_FILTERS: QuickFilter[] = [
    'Today',
    'This Week',
    'This Month',
    'Last Month',
    'Last 3 Months',
    'This Year',
    'Lifetime',
]

function formatMoney(n: number) {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n)
}

export default function EarningsPage() {
    const [allBrands, setAllBrands] = useState<CreatorEarningsByBrand[] | null>(null)
    const [wallet, setWallet] = useState<CreatorWalletSnapshot | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

    const [filter, setFilter] = useState<QuickFilter>('This Month')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const customActive = !!(from && to)

    const [selectedBrand, setSelectedBrand] = useState<CreatorEarningsByBrand | null>(null)
    const [selectedCampaign, setSelectedCampaign] = useState<CreatorEarningsByCampaign | null>(null)

    async function load() {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) throw new Error('Not signed in.')
        const [brands, snapshot] = await Promise.all([
            getEarningsByBrand(userData.user.id),
            getWalletSnapshot(userData.user.id),
        ])
        setAllBrands(brands)
        setWallet(snapshot)
    }

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                await load()
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load earnings.')
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    async function handleRefresh() {
        setRefreshing(true)
        setError(null)
        try {
            await load()
            setLastRefreshed(new Date())
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to refresh earnings.')
        } finally {
            setRefreshing(false)
        }
    }

    const { rangeFrom, rangeTo } = useMemo(() => {
        if (customActive) return { rangeFrom: new Date(from), rangeTo: new Date(`${to}T23:59:59`) }
        const { from: f, to: t } = getDateRangeForFilter(filter)
        return { rangeFrom: f, rangeTo: t }
    }, [filter, customActive, from, to])

    const filteredBrands = useMemo(
        () => (allBrands ? filterEarningsTree(allBrands, rangeFrom, rangeTo) : null),
        [allBrands, rangeFrom, rangeTo]
    )

    const periodTotal = useMemo(() => (filteredBrands ?? []).reduce((s, b) => s + b.totalNet, 0), [filteredBrands])
    const lifetimeTotal = useMemo(() => (allBrands ?? []).reduce((s, b) => s + b.totalNet, 0), [allBrands])

    const chartData = useMemo(() => {
        if (!filteredBrands) return []
        const entries = filteredBrands.flatMap((b) => b.campaigns.flatMap((c) => c.entries))
        const bucketKey = (d: Date) => {
            if (filter === 'Today') return d.toLocaleTimeString('en-UG', { hour: 'numeric' })
            if (filter === 'This Week') return d.toLocaleDateString('en-UG', { weekday: 'short' })
            if (filter === 'This Month' || filter === 'Last Month') return `Wk ${Math.ceil(d.getDate() / 7)}`
            return d.toLocaleDateString('en-UG', { month: 'short', year: '2-digit' })
        }
        const bucketed = new Map<string, number>()
        for (const e of entries) {
            const key = bucketKey(new Date(e.createdAt))
            bucketed.set(key, (bucketed.get(key) ?? 0) + e.netAmount)
        }
        return Array.from(bucketed.entries()).map(([month, earnings]) => ({ month, earnings }))
    }, [filteredBrands, filter])

    // Reselect the live (filtered) versions of brand/campaign after any reload
    // or filter change, so the drilled-in view stays in sync with the period.
    const liveBrand = selectedBrand
        ? filteredBrands?.find((b) => b.brandUserId === selectedBrand.brandUserId) ?? null
        : null
    const liveCampaign =
        liveBrand && selectedCampaign
            ? liveBrand.campaigns.find((c) => c.campaignId === selectedCampaign.campaignId) ?? null
            : null

    if (error) return <DashCard className="text-center text-sm text-muted-foreground">{error}</DashCard>
    if (!filteredBrands || !wallet) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <DevelopmentNotice/>
            <PageHeader
                title="Earnings"
                subtitle="Your financial dashboard — track, filter, and withdraw what you've earned."
            />

            <DashCard>
                <div className="flex flex-wrap items-center gap-2">
                    {QUICK_FILTERS.map((f) => {
                        const active = !customActive && f === filter
                        return (
                            <button
                                key={f}
                                onClick={() => {
                                    setFilter(f)
                                    setFrom('')
                                    setTo('')
                                }}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                                    active
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'border border-hairline bg-background text-ink hover:bg-ink/5'
                                }`}
                                style={active ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
                            >
                                {f}
                            </button>
                        )
                    })}
                </div>
                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-hairline pt-4">
                    <div>
                        <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            From
                        </label>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="mt-1 rounded-xl border border-hairline bg-background px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            To
                        </label>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="mt-1 rounded-xl border border-hairline bg-background px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </div>
                    {customActive && (
                        <span className="rounded-full bg-[oklch(0.94_0.07_55)] px-3 py-1.5 text-xs font-semibold text-[oklch(0.5_0.18_45)]">
                            Custom range active
                        </span>
                    )}
                </div>
            </DashCard>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Lifetime Earnings" value={formatMoney(lifetimeTotal)} tone="orange" />
                <StatCard
                    label="Available Balance"
                    value={formatMoney(wallet.availableBalance)}
                    delta="Ready to withdraw"
                    tone="green"
                />
                <StatCard
                    label="Pending Earnings"
                    value={formatMoney(wallet.pendingBalance)}
                    delta="Not yet withdrawable"
                    tone="indigo"
                />
                <StatCard label="Total Withdrawn" value={formatMoney(wallet.totalWithdrawn)} delta="Lifetime" />
            </div>

            <DashCard>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-ink">Earnings Over Time</p>
                        <p className="text-xs text-muted-foreground">{customActive ? `${from} → ${to}` : filter}</p>
                    </div>
                    <p className="font-display text-2xl font-semibold text-ink">{formatMoney(periodTotal)}</p>
                </div>
                <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="ea" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="oklch(0.66 0.20 42)" stopOpacity={0.35} />
                                    <stop offset="100%" stopColor="oklch(0.66 0.20 42)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.02 80)" />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                            />
                            <Tooltip
                                formatter={(v) => formatMoney(Number(v ?? 0))}
                                contentStyle={{
                                    borderRadius: 12,
                                    border: '1px solid var(--color-hairline)',
                                    background: 'var(--color-surface-elevated)',
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="earnings"
                                stroke="oklch(0.66 0.20 42)"
                                strokeWidth={3}
                                fill="url(#ea)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </DashCard>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <EarningsBreadcrumb
                    brand={liveBrand}
                    campaign={liveCampaign}
                    onReset={() => {
                        setSelectedBrand(null)
                        setSelectedCampaign(null)
                    }}
                    onSelectBrand={() => setSelectedCampaign(null)}
                />
                <div className="flex items-center gap-3">
                    {lastRefreshed && (
                        <span className="rounded-lg border border-hairline bg-background px-3 py-2 text-xs text-muted-foreground">
                            Updated {lastRefreshed.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 rounded-xl border border-hairline bg-background px-4 py-2 text-sm font-medium text-ink shadow-sm hover:bg-ink/5 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>
            </div>

            {!liveBrand && <BrandGrid brands={filteredBrands} onSelect={setSelectedBrand} />}
            {liveBrand && !liveCampaign && <CampaignGrid brand={liveBrand} onSelect={setSelectedCampaign} />}
            {liveCampaign && <CampaignEarningsDetail campaign={liveCampaign} />}
        </div>
    )
}
