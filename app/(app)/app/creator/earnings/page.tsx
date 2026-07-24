'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Wallet, Loader2 } from "lucide-react"
import { DashCard, PageHeader, StatCard } from "@/components/creator/dash-ui"
import { supabase } from "@/lib/supabase"
import { getWalletSnapshot, listTransactions } from "@/lib/api/creator-wallet"
import type { CreatorWalletSnapshot, CreatorWalletTransaction } from "@/types/creator-wallet"

const QUICK_FILTERS = ["Today", "This Week", "This Month", "Last Month", "This Year", "Lifetime"] as const
type QuickFilter = typeof QUICK_FILTERS[number]

function formatMoney(n: number): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n)
}

function startOfRange(filter: QuickFilter): Date | null {
    const now = new Date()
    switch (filter) {
        case "Today":
            return new Date(now.getFullYear(), now.getMonth(), now.getDate())
        case "This Week": {
            const d = new Date(now)
            d.setDate(d.getDate() - d.getDay())
            d.setHours(0, 0, 0, 0)
            return d
        }
        case "This Month":
            return new Date(now.getFullYear(), now.getMonth(), 1)
        case "Last Month":
            return new Date(now.getFullYear(), now.getMonth() - 1, 1)
        case "This Year":
            return new Date(now.getFullYear(), 0, 1)
        case "Lifetime":
            return null
    }
}

function endOfRange(filter: QuickFilter): Date | null {
    if (filter !== "Last Month") return null
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
}

export default function EarningsPage() {
    const [filter, setFilter] = useState<QuickFilter>("This Month")
    const [from, setFrom] = useState<string>("")
    const [to, setTo] = useState<string>("")
    const [wallet, setWallet] = useState<CreatorWalletSnapshot | null>(null)
    const [transactions, setTransactions] = useState<CreatorWalletTransaction[]>([])
    const [loading, setLoading] = useState<boolean>(true)

    const customActive = !!(from && to)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData?.user) return
            
            const [snap, txs] = await Promise.all([
                getWalletSnapshot(userData.user.id),
                listTransactions(userData.user.id),
            ])
            
            if (!cancelled) {
                setWallet(snap)
                setTransactions(txs)
                setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    const lifetime = useMemo<number>(
        () => transactions.filter((t) => t.kind === "credit").reduce((s, t) => s + Number(t.amount), 0),
        [transactions],
    )

    const periodTotal = useMemo<number>(() => {
        const credits = transactions.filter((t) => t.kind === "credit")
        if (customActive) {
            const fromD = new Date(from)
            const toD = new Date(to)
            return credits
                .filter((t) => new Date(t.created_at) >= fromD && new Date(t.created_at) <= toD)
                .reduce((s, t) => s + Number(t.amount), 0)
        }
        const start = startOfRange(filter)
        const end = endOfRange(filter)
        return credits
            .filter((t) => {
                const d = new Date(t.created_at)
                if (start && d < start) return false
                if (end && d >= end) return false
                return true
            })
            .reduce((s, t) => s + Number(t.amount), 0)
    }, [transactions, filter, customActive, from, to])

    if (loading || !wallet) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Earnings" subtitle="Your financial dashboard — track, filter, and withdraw what you've earned." />

            <DashCard>
                <div className="flex flex-wrap items-center gap-2">
                    {QUICK_FILTERS.map((f) => {
                        const active = !customActive && f === filter
                        return (
                            <button
                                key={f}
                                type="button"
                                onClick={() => {
                                    setFilter(f)
                                    setFrom("")
                                    setTo("")
                                }}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                                    active
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "border border-hairline bg-background text-ink hover:bg-ink/5"
                                }`}
                                style={active ? { backgroundImage: "var(--gradient-primary)" } : undefined}
                            >
                                {f}
                            </button>
                        )
                    })}
                </div>
                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-hairline pt-4">
                    <div>
                        <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">From</label>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="mt-1 rounded-xl border border-hairline bg-background px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">To</label>
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
                <StatCard label="Lifetime Earnings" value={formatMoney(lifetime)} tone="orange" />
                <StatCard label="Available Balance" value={formatMoney(wallet.availableBalance)} delta="Ready to withdraw" tone="green" />
                <StatCard label="Pending Earnings" value={formatMoney(wallet.pendingBalance)} tone="indigo" />
                <StatCard label="Total Withdrawn" value={formatMoney(wallet.totalWithdrawn)} delta="Lifetime" />
            </div>

            <DashCard className="overflow-hidden bg-gradient-to-br from-[oklch(0.97_0.04_55)] to-surface-elevated">
                <div className="flex flex-wrap items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-glow" style={{ backgroundImage: "var(--gradient-primary)" }}>
                            <Wallet className="h-5 w-5 text-primary-foreground" />
                        </span>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Wallet Summary</p>
                            <p className="font-display text-xl font-semibold text-ink">Your earnings, ready to move.</p>
                        </div>
                    </div>
                    <Link href="/creator/wallet" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/85">
                        Go to Wallet <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </DashCard>

            <DashCard>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-ink">Earnings — {customActive ? `${from} → ${to}` : filter}</p>
                        <p className="text-xs text-muted-foreground">Chart view coming soon</p>
                    </div>
                    <p className="font-display text-2xl font-semibold text-ink">{formatMoney(periodTotal)}</p>
                </div>
                <div className="mt-4 flex h-56 items-center justify-center rounded-2xl border border-dashed border-hairline">
                    <p className="text-sm text-muted-foreground">Earnings-over-time chart will appear here once view tracking is connected.</p>
                </div>
            </DashCard>
        </div>
    )
}