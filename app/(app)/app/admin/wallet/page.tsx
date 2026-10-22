'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, Loader2, Plus, RefreshCw } from 'lucide-react'
import {
    formatMoney,
    getMerchantWalletBalance,
    getPlatformWallet,
    recordWalletEntry,
    type PlatformWallet,
    type StatementRow,
    type WalletEntry,
    type MerchantWalletBalance,
} from '@/lib/api/admin-payouts'
import {
    ErrorText,
    Field,
    Modal,
    MoneyRow,
    buttonPrimary,
    buttonSecondary,
    formatWhen,
    inputClass,
} from '@/components/app/admin/payouts/shared'

const shell = 'rounded-2xl border border-hairline bg-surface-elevated'
const thead =
    'border-b border-hairline bg-[oklch(0.97_0.012_78)] text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground'

type Period = 'all' | 'this_month' | 'last_month' | '30d'
const PERIODS: { key: Period; label: string }[] = [
    { key: 'this_month', label: 'This month' },
    { key: 'last_month', label: 'Last month' },
    { key: '30d', label: 'Last 30 days' },
    { key: 'all', label: 'All time' },
]

function periodRange(p: Period): [number, number] {
    const now = new Date()
    if (p === 'this_month') return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), Infinity]
    if (p === 'last_month')
        return [
            new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
            new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
        ]
    if (p === '30d') return [now.getTime() - 30 * 86_400_000, Infinity]
    return [-Infinity, Infinity]
}

// Owed totals from the database are after the 15% platform fee (the
// ledger); creators see them before it. Show what creators see.
const shown = (net: number, feeRate: number) => Math.round(net / (1 - feeRate))

type Line = StatementRow & { balance: number }

function downloadCsv(lines: Line[]) {
    const esc = (v: string | number | null) => {
        const s = v == null ? '' : String(v)
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = [
        ['Date', 'Type', 'Detail', 'Reference', 'Amount (UGX)', 'KaCyber balance (UGX)', 'By'],
        ...lines.map((l) => [l.at, l.label, l.detail, l.reference, l.amount, l.from_float ? l.balance : '', l.by]),
    ]
    const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `goheza-wallet-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
}

export default function AdminWalletPage() {
    const [wallet, setWallet] = useState<PlatformWallet | null>(null)
    const [merchantWallet, setMerchantWallet] = useState<MerchantWalletBalance | null>(null)
    const [merchantWalletError, setMerchantWalletError] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const [recording, setRecording] = useState(false)
    const [period, setPeriod] = useState<Period>('this_month')

    useEffect(() => {
        let cancelled = false
        Promise.allSettled([getPlatformWallet(), getMerchantWalletBalance()])
            .then(([platformResult, merchantResult]) => {
                if (cancelled) return
                if (platformResult.status === 'fulfilled') {
                    setWallet(platformResult.value)
                    setError(null)
                } else {
                    setError(
                        platformResult.reason instanceof Error
                            ? platformResult.reason.message
                            : 'Failed to load the wallet.',
                    )
                }
                if (merchantResult.status === 'fulfilled') {
                    setMerchantWallet(merchantResult.value)
                    setMerchantWalletError(null)
                } else {
                    setMerchantWallet(null)
                    setMerchantWalletError(
                        merchantResult.reason instanceof Error
                            ? merchantResult.reason.message
                            : 'Could not load the live KaCyber wallet balance.',
                    )
                }
            })
            .finally(() => {
                if (!cancelled) setRefreshing(false)
            })
        return () => {
            cancelled = true
        }
    }, [reloadKey])

    const reload = () => {
        setRefreshing(true)
        setReloadKey((k) => k + 1)
    }

    // Running KaCyber balance, oldest first; payouts made by hand moved money
    // but not from the float, so they leave the balance unchanged.
    const lines = useMemo<Line[]>(() => {
        if (!wallet) return []
        let balance = 0
        return [...wallet.statement]
            .sort((a, b) => a.at.localeCompare(b.at))
            .map((r) => {
                if (r.from_float) balance += r.amount
                return { ...r, balance }
            })
            .reverse()
    }, [wallet])

    const visible = useMemo(() => {
        const [from, to] = periodRange(period)
        return lines.filter((l) => {
            const t = new Date(l.at).getTime()
            return t >= from && t < to
        })
    }, [lines, period])

    if (!wallet) {
        return error ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{error}</p>
        ) : (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    const t = wallet.totals
    const feeRate = Number(wallet.fee_rate ?? 0.15)
    const fullAdmin = wallet.viewer.role !== 'moderator'
    const expectedFloat = t.topped_up - t.taken_out - t.paid_kacyber
    const owedReleased = shown(t.owed_released, feeRate)
    const owedHeld = shown(t.owed_unreleased, feeRate)
    const periodIn = visible.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0)
    const periodOut = visible.filter((l) => l.amount < 0).reduce((s, l) => s - l.amount, 0)

    const card = (name: string, value: string, sub?: string, strong = false) => (
        <div className={`${shell} p-4`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{name}</p>
            <p className={`mt-1 font-display font-semibold text-ink ${strong ? 'text-3xl' : 'text-xl'}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
    )

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Wallet</h1>
                    <p className="text-sm text-muted-foreground">
                        Goheza&apos;s money: the KaCyber float, what we owe creators and every movement.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {fullAdmin && (
                        <button onClick={() => setRecording(true)} className={`${buttonPrimary} py-1.5 text-xs`}>
                            <Plus className="h-3.5 w-3.5" /> Record top-up
                        </button>
                    )}
                    <button
                        onClick={reload}
                        aria-label="Refresh"
                        className="grid h-8 w-8 place-items-center rounded-full border border-hairline bg-background hover:bg-ink/5"
                    >
                        {refreshing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
            </header>
            <ErrorText error={error} />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {card(
                    'KaCyber wallet (live)',
                    merchantWallet ? formatMoney(merchantWallet.available) : 'Unavailable',
                    merchantWallet
                        ? `Fetched ${formatWhen(merchantWallet.fetched_at)}`
                        : merchantWalletError ?? 'Live balance could not be loaded',
                    true,
                )}
                {card(
                    'KaCyber float (expected)',
                    formatMoney(expectedFloat),
                    'Top-ups − taken out − paid via KaCyber',
                    true,
                )}
                {card(
                    'Owed to creators',
                    formatMoney(owedReleased + owedHeld),
                    `${formatMoney(owedReleased)} released · ${formatMoney(owedHeld)} held`,
                )}
                {card(
                    'Paid to creators',
                    formatMoney(t.paid_kacyber + t.paid_manual),
                    `${formatMoney(t.paid_kacyber)} via KaCyber · ${formatMoney(t.paid_manual)} by hand`,
                )}
                {card('Payouts in progress', formatMoney(t.in_flight), 'Requested, not yet paid')}
            </div>
            {expectedFloat < owedReleased && (
                <p className="rounded-xl border border-[oklch(0.85_0.10_55)] bg-[oklch(0.98_0.04_55)] px-4 py-3 text-sm text-[oklch(0.45_0.12_70)]">
                    The float is {formatMoney(owedReleased - expectedFloat)} short of what creators can withdraw right
                    now. Top up KaCyber before automatic payouts run out.
                </p>
            )}
            <p className="text-xs text-muted-foreground">
                The float is what our records say should be on KaCyber. Compare it with the KaCyber dashboard; a
                difference means a top-up or withdrawal wasn&apos;t recorded here.
            </p>

            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-display text-lg font-semibold text-ink">Statement</h2>
                        <p className="text-xs text-muted-foreground">
                            {formatMoney(periodIn)} in · {formatMoney(periodOut)} out in this period
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex gap-1 rounded-full border border-hairline bg-background p-1">
                            {PERIODS.map((p) => (
                                <button
                                    key={p.key}
                                    onClick={() => setPeriod(p.key)}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        period === p.key ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => downloadCsv(visible)}
                            disabled={!visible.length}
                            className={`${buttonSecondary} text-xs`}
                        >
                            <Download className="h-3.5 w-3.5" /> CSV
                        </button>
                    </div>
                </div>
                <div className={`${shell} overflow-x-auto`}>
                    <table className="w-full min-w-[820px] text-sm">
                        <thead className={thead}>
                            <tr>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-3 py-3">Type</th>
                                <th className="px-3 py-3">Detail</th>
                                <th className="px-3 py-3 text-right">Amount</th>
                                <th className="px-3 py-3 text-right">KaCyber balance</th>
                                <th className="px-5 py-3">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {visible.map((l) => (
                                <tr key={`${l.kind}-${l.id}`}>
                                    <td className="px-5 py-3 text-muted-foreground">{formatWhen(l.at)}</td>
                                    <td className="px-3 py-3 text-ink-soft">{l.label}</td>
                                    <td className="px-3 py-3 text-xs text-muted-foreground">
                                        {l.detail ?? '—'}
                                        {l.by ? <span className="block">by {l.by}</span> : null}
                                    </td>
                                    <td
                                        className={`px-3 py-3 text-right font-semibold ${
                                            l.amount < 0 ? 'text-[oklch(0.5_0.16_25)]' : 'text-[oklch(0.45_0.12_150)]'
                                        }`}
                                    >
                                        {l.amount < 0 ? '−' : '+'}
                                        {formatMoney(Math.abs(l.amount))}
                                    </td>
                                    <td className="px-3 py-3 text-right text-ink-soft">
                                        {l.from_float ? (
                                            formatMoney(l.balance)
                                        ) : (
                                            <span className="text-xs text-muted-foreground">not from float</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-xs text-muted-foreground">{l.reference ?? '—'}</td>
                                </tr>
                            ))}
                            {visible.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                        No money moved in this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="space-y-3">
                <div>
                    <h2 className="font-display text-lg font-semibold text-ink">Owed by campaign</h2>
                    <p className="text-xs text-muted-foreground">
                        Before the platform fee, as creators see it. Follow-ups don&apos;t appear: they never pay. Open
                        a campaign to release or hold its payouts.
                    </p>
                </div>
                <div className={`${shell} overflow-x-auto`}>
                    <table className="w-full min-w-[820px] text-sm">
                        <thead className={thead}>
                            <tr>
                                <th className="px-5 py-3">Campaign</th>
                                <th className="px-3 py-3">Payouts</th>
                                <th className="px-3 py-3 text-right">Creators</th>
                                <th className="px-3 py-3 text-right">Ready to withdraw</th>
                                <th className="px-3 py-3 text-right">Held</th>
                                <th className="px-3 py-3 text-right">Pending</th>
                                <th className="px-5 py-3 text-right">Withdrawn</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {wallet.campaigns.map((c) => (
                                <tr key={c.id} className="hover:bg-ink/[0.02]">
                                    <td className="px-5 py-3">
                                        <Link
                                            href={`/app/admin/campaigns/${c.id}`}
                                            className="font-semibold text-ink hover:text-primary"
                                        >
                                            {c.name}
                                        </Link>
                                        <p className="text-xs text-muted-foreground">{c.brand ?? '—'}</p>
                                    </td>
                                    <td className="px-3 py-3">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                c.released
                                                    ? 'bg-[oklch(0.95_0.05_150)] text-[oklch(0.4_0.12_150)]'
                                                    : 'bg-[oklch(0.96_0.06_85)] text-[oklch(0.45_0.12_70)]'
                                            }`}
                                        >
                                            {c.released ? 'Released' : 'Held'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-right text-ink-soft">{c.creators}</td>
                                    <td className="px-3 py-3 text-right font-semibold text-ink">
                                        {formatMoney(c.available)}
                                    </td>
                                    <td className="px-3 py-3 text-right text-ink-soft">
                                        {formatMoney(c.awaiting_release)}
                                    </td>
                                    <td className="px-3 py-3 text-right text-ink-soft">{formatMoney(c.pending)}</td>
                                    <td className="px-5 py-3 text-right text-ink-soft">{formatMoney(c.withdrawn)}</td>
                                </tr>
                            ))}
                            {wallet.campaigns.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                        No campaign earnings yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {recording && (
                <WalletEntryModal
                    onClose={() => setRecording(false)}
                    onDone={() => {
                        setRecording(false)
                        reload()
                    }}
                />
            )}
        </div>
    )
}

function WalletEntryModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const [kind, setKind] = useState<WalletEntry['kind']>('top_up')
    const [amount, setAmount] = useState('')
    const [reference, setReference] = useState('')
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const value = Math.floor(Number(amount) || 0)

    async function submit() {
        setBusy(true)
        setError(null)
        try {
            await recordWalletEntry({ kind, amount: value, reference, note })
            onDone()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to record.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Modal
            title="Record a KaCyber float entry"
            subtitle="For money already moved outside the app"
            onClose={onClose}
            footer={
                <>
                    <button onClick={onClose} className={buttonSecondary}>
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={busy || value === 0 || reference.trim().length < 3}
                        className={buttonPrimary}
                    >
                        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                        Record {formatMoney(Math.abs(value))}
                    </button>
                </>
            }
        >
            <Field label="Type">
                <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as WalletEntry['kind'])}
                    className={inputClass}
                >
                    <option value="top_up">Top-up: money we put into KaCyber</option>
                    <option value="withdrawal">Taken out: money we moved out of KaCyber</option>
                    <option value="adjustment">Adjustment: correct a difference (+ or −)</option>
                </select>
            </Field>
            <Field label="Amount (UGX)" hint={kind === 'adjustment' ? 'Negative to reduce the balance.' : undefined}>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={inputClass}
                />
            </Field>
            <Field label="Reference" hint="Bank or mobile money reference for the deposit.">
                <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Note (optional)">
                <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
            </Field>
            <div className="rounded-2xl border border-hairline p-4">
                <MoneyRow
                    label={kind === 'withdrawal' ? 'Out of the float' : 'Into the float'}
                    value={formatMoney(Math.abs(value))}
                    bold
                />
            </div>
            <ErrorText error={error} />
        </Modal>
    )
}
