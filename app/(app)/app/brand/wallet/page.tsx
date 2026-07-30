'use client'

import { useState } from 'react'
import { Download, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { DashCard, PageHeader, StatCard } from '@/components/app/creator/dash-ui'
import { brand, brandCampaigns, brandInvoices, brandTransactions, formatMoney } from '@/components/app/brand/brand-data'
import { ComingSoon } from '@/components/app/comming-soon'

export default function WalletPage() {
    const reservedByCampaign = brandCampaigns.map((c) => ({
        id: c.id,
        name: c.name,
        allocated: c.budgetTotal,
        spent: c.budgetUsed,
        remaining: Math.max(0, c.budgetTotal - c.budgetUsed),
        active: c.status === 'Live' || c.status === 'Submission & Review',
    }))
    const totalReserved = reservedByCampaign.reduce((s, c) => s + (c.allocated - c.spent), 0)
    const totalRemaining = reservedByCampaign.reduce((s, c) => s + c.remaining, 0)
    const activeConsuming = reservedByCampaign.filter((c) => c.active)

    const [openReserved, setOpenReserved] = useState(false)
    const [openRemaining, setOpenRemaining] = useState(false)

    return (
        <div className="space-y-6">
          <ComingSoon title='Wallet'/>
            <PageHeader
                title="Wallet"
                subtitle="Top up funds, track campaign spend and download invoices."
                action={
                    <button
                        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.02]"
                        style={{ backgroundImage: 'var(--gradient-primary)' }}
                    >
                        <Plus className="h-4 w-4" /> Add Funds
                    </button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    label="Available Balance"
                    value={formatMoney(brand.walletBalance)}
                    tone="orange"
                    delta="Ready to deploy"
                />
                <button onClick={() => setOpenReserved((v) => !v)} className="text-left">
                    <StatCard label="Reserved Campaign Budget ↓" value={formatMoney(totalReserved)} tone="indigo" />
                </button>
                <button onClick={() => setOpenRemaining((v) => !v)} className="text-left">
                    <StatCard label="Remaining Campaign Budget ↓" value={formatMoney(totalRemaining)} tone="green" />
                </button>
            </div>

            {openReserved && (
                <DashCard>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">Reserved breakdown by campaign</p>
                        <button
                            onClick={() => setOpenReserved(false)}
                            className="text-xs text-muted-foreground hover:text-ink"
                        >
                            <ChevronDown className="h-4 w-4" />
                        </button>
                    </div>
                    <ul className="mt-4 space-y-2">
                        {reservedByCampaign.map((c) => {
                            const pct = c.allocated > 0 ? (c.spent / c.allocated) * 100 : 0
                            return (
                                <li key={c.id} className="rounded-xl border border-hairline bg-background p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                                        <p className="shrink-0 text-xs text-muted-foreground">
                                            {formatMoney(c.spent)} / {formatMoney(c.allocated)}
                                        </p>
                                    </div>
                                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${Math.min(100, pct)}%`,
                                                backgroundImage: 'var(--gradient-primary)',
                                            }}
                                        />
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                                        Remaining:{' '}
                                        <span className="font-semibold text-ink">{formatMoney(c.remaining)}</span>
                                    </p>
                                </li>
                            )
                        })}
                    </ul>
                </DashCard>
            )}

            {openRemaining && (
                <DashCard>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">Remaining campaign funds</p>
                        <button
                            onClick={() => setOpenRemaining(false)}
                            className="text-xs text-muted-foreground hover:text-ink"
                        >
                            <ChevronDown className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Unused funds reserved for upcoming creator payouts.
                    </p>
                    <ul className="mt-4 divide-y divide-hairline">
                        {activeConsuming.map((c) => (
                            <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    <ChevronRight className="h-3 w-3 shrink-0 text-ink-soft" />
                                    <p className="truncate text-sm text-ink">{c.name}</p>
                                </div>
                                <p className="shrink-0 text-sm font-semibold text-ink">{formatMoney(c.remaining)}</p>
                            </li>
                        ))}
                        {activeConsuming.length === 0 && (
                            <p className="py-4 text-center text-xs text-muted-foreground">
                                No active campaigns consuming funds.
                            </p>
                        )}
                    </ul>
                </DashCard>
            )}

            <DashCard>
                <p className="text-sm font-semibold text-ink">Transactions</p>

                <ul className="mt-4 space-y-2 md:hidden">
                    {brandTransactions.map((t) => (
                        <li
                            key={t.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-background p-3"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-ink">{t.desc}</p>
                                <p className="text-[11px] text-muted-foreground">{t.date}</p>
                            </div>
                            <p
                                className={`shrink-0 text-sm font-semibold ${
                                    t.kind === 'credit' ? 'text-[oklch(0.45_0.14_152)]' : 'text-ink'
                                }`}
                            >
                                {t.kind === 'credit' ? '+' : ''}
                                {formatMoney(t.amount)}
                            </p>
                        </li>
                    ))}
                </ul>

                <div className="mt-4 hidden md:block">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                <th className="py-2">Date</th>
                                <th className="py-2">Description</th>
                                <th className="py-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {brandTransactions.map((t) => (
                                <tr key={t.id}>
                                    <td className="py-3 text-muted-foreground">{t.date}</td>
                                    <td className="py-3 text-ink">{t.desc}</td>
                                    <td
                                        className={`py-3 text-right font-semibold ${
                                            t.kind === 'credit' ? 'text-[oklch(0.45_0.14_152)]' : 'text-ink'
                                        }`}
                                    >
                                        {t.kind === 'credit' ? '+' : ''}
                                        {formatMoney(t.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </DashCard>

            <DashCard>
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">Invoices</p>
                    <button className="text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline">
                        Download all
                    </button>
                </div>
                <ul className="mt-4 divide-y divide-hairline">
                    {brandInvoices.map((inv) => (
                        <li key={inv.id} className="flex items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink">{inv.number}</p>
                                <p className="text-[11px] text-muted-foreground">
                                    {inv.date} · {inv.status}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-sm font-semibold text-ink">{formatMoney(inv.amount)}</span>
                                <button className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5">
                                    <Download className="h-3 w-3" /> PDF
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </DashCard>
        </div>
    )
}
