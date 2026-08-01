'use client'

import { ArrowDownToLine } from 'lucide-react'
import { DashCard, PageHeader, StatCard } from '@/components/app/creator/dash-ui'
import { formatMoney, transactions } from '@/components/app/creator/dash-data'
import { ComingSoon } from '@/components/app/comming-soon'

export default function WalletPage() {
    const totalWithdrawn = transactions.filter((t) => t.kind === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)

    return (
        <div className="space-y-6">
            <ComingSoon title="Wallet" />

            <PageHeader
                title="Wallet"
                subtitle="Manage your balance and withdraw your earnings to your linked payout method."
                action={
                    <button
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.02]"
                        style={{ backgroundImage: 'var(--gradient-primary)' }}
                    >
                        <ArrowDownToLine className="h-4 w-4" /> Withdraw Funds
                    </button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    label="Available Balance"
                    value={formatMoney(818.9)}
                    tone="orange"
                    delta="Ready to withdraw"
                />
                <StatCard label="Pending Balance" value={formatMoney(412.5)} tone="indigo" delta="Releases in 7 days" />
                <StatCard label="Total Withdrawn" value={formatMoney(totalWithdrawn)} tone="green" delta="Lifetime" />
            </div>

            <DashCard>
                <p className="text-sm font-semibold text-ink">Recent Transactions</p>

                {/* Mobile cards */}
                <ul className="mt-4 space-y-2 md:hidden">
                    {transactions.map((t) => (
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

                {/* Desktop table */}
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
                            {transactions.map((t) => (
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
        </div>
    )
}
