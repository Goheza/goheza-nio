'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, Wallet } from 'lucide-react'
import { DashCard, PageHeader, StatCard } from '@/components/app/creator/dash-ui'
import { earningsTrend, formatMoney } from '@/components/app/creator/dash-data'
import { ComingSoon } from '@/components/app/comming-soon'

const QUICK_FILTERS = [
    'Today',
    'This Week',
    'This Month',
    'Last Month',
    'Last 3 Months',
    'This Year',
    'Lifetime',
] as const
type QuickFilter = (typeof QUICK_FILTERS)[number]

// Realistic multipliers vs the "This Month" baseline
const MULT: Record<QuickFilter, number> = {
    Today: 0.05,
    'This Week': 0.32,
    'This Month': 1,
    'Last Month': 0.84,
    'Last 3 Months': 2.7,
    'This Year': 5.4,
    Lifetime: 4.42, // 4.42 ≈ sum / 1840
}

export default function EarningsPage() {
    const [filter, setFilter] = useState<QuickFilter>('This Month')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const customActive = !!(from && to)

    const baseline = 1840
    const periodTotal = useMemo(() => {
        if (customActive) return Math.round(baseline * 0.6)
        return Math.round(baseline * MULT[filter])
    }, [filter, customActive])

    const chartData = useMemo(() => {
        if (filter === 'Lifetime' || filter === 'This Year') return earningsTrend
        if (filter === 'Last 3 Months') return earningsTrend.slice(-3)
        if (filter === 'This Month' || filter === 'Last Month') {
            return [
                { month: 'W1', earnings: Math.round(periodTotal * 0.18) },
                { month: 'W2', earnings: Math.round(periodTotal * 0.22) },
                { month: 'W3', earnings: Math.round(periodTotal * 0.27) },
                { month: 'W4', earnings: Math.round(periodTotal * 0.33) },
            ]
        }
        if (filter === 'This Week') {
            return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => ({
                month: d,
                earnings: Math.round(periodTotal * [0.08, 0.11, 0.14, 0.13, 0.18, 0.2, 0.16][i]),
            }))
        }
        if (filter === 'Today') {
            return ['6a', '10a', '2p', '6p', '10p'].map((d, i) => ({
                month: d,
                earnings: Math.round(periodTotal * [0.05, 0.15, 0.25, 0.3, 0.25][i]),
            }))
        }
        return earningsTrend
    }, [filter, periodTotal])

    const lifetime = earningsTrend.reduce((s, e) => s + e.earnings, 0)
    const avgPerCampaign = 412
    const avgPerK = 4.6

    return (
        <div className="space-y-6">
            <ComingSoon title="Wallet" />

            <PageHeader
                title="Earnings"
                subtitle="Your financial dashboard — track, filter, and withdraw what you've earned."
            />

            {/* Filters */}
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

            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <StatCard label="Lifetime Earnings" value={formatMoney(lifetime)} tone="orange" />
                <StatCard label="Available Balance" value={formatMoney(0)} delta="Ready to withdraw" tone="green" />
                <StatCard label="Pending Earnings" value={formatMoney(0)} delta="Releases in 7d" tone="indigo" />
                <StatCard label="Total Withdrawn" value={formatMoney(0)} delta="Lifetime" />
                <StatCard label="Avg / Campaign" value={formatMoney(avgPerCampaign)} />
                <StatCard label="Avg / 1k Views" value={formatMoney(avgPerK)} />
            </div>

            {/* Wallet summary */}
            <DashCard className="overflow-hidden bg-gradient-to-br from-[oklch(0.97_0.04_55)] to-surface-elevated">
                <div className="flex flex-wrap items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <span
                            className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-glow"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            <Wallet className="h-5 w-5 text-primary-foreground" />
                        </span>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                Wallet Summary
                            </p>
                            <p className="font-display text-xl font-semibold text-ink">Your earnings, ready to move.</p>
                        </div>
                    </div>
                    <Link
                        href="/creator/wallet"
                        className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/85"
                    >
                        Go to Wallet <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <WalletStat label="Available Balance" value={formatMoney(0)} />
                    <WalletStat label="Pending Balance" value={formatMoney(0)} />
                    <WalletStat label="Last Withdrawal" value={`${formatMoney(0)} · Jun 10`} />
                    <WalletStat label="Next Eligible Withdrawal" value="Jun 30, 2026" />
                </div>
            </DashCard>

            {/* Charts */}
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
                            />{' '}
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

            <DashCard>
                <p className="text-sm font-semibold text-ink">Earnings by Period</p>
                <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
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
                            <Bar dataKey="earnings" fill="oklch(0.55 0.18 268)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </DashCard>
        </div>
    )
}

function WalletStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-hairline bg-surface-elevated/80 p-3 backdrop-blur-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-base font-semibold text-ink">{value}</p>
        </div>
    )
}
