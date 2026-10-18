'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { listPendingWithdrawals, settleWithdrawal, type AdminPendingWithdrawal } from '@/lib/api/admin-wallet'

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount)
}

const TRIGGER_LABEL: Record<string, string> = {
  required_views: 'On View Threshold',
  weekly: 'Weekly',
  monthly: 'Monthly',
  campaign_end: 'Campaign End',
}

export default function AdminWalletPage() {
  const [payouts, setPayouts] = useState<AdminPendingWithdrawal[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function reload() {
    const rows = await listPendingWithdrawals()
    setPayouts(rows)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await reload()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load payouts.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const total = useMemo(() => (payouts ?? []).reduce((sum, p) => sum + p.amount, 0), [payouts])

  async function handleSettle(withdrawalId: string) {
    try {
      setBusyId(withdrawalId)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in.')
      await settleWithdrawal(withdrawalId, user.id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to settle payout.')
    } finally {
      setBusyId(null)
    }
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{error}</p>
  }

  if (!payouts) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Wallet & Finance</h1>
        <p className="text-sm text-muted-foreground">
          Creator withdrawal requests — settle them once payment has been sent.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[oklch(0.85_0.10_55)] bg-[oklch(0.98_0.04_55)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Total Pending Payouts
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink">{formatMoney(total)}</p>
        </div>

        <div className="rounded-2xl border border-hairline bg-surface-elevated p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Requests Awaiting Settlement
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink">{payouts.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface-elevated">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-hairline bg-[oklch(0.97_0.012_78)] text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Creator</th>
              <th className="px-3 py-3">Requested</th>
              <th className="px-3 py-3">Payout Cycle</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Amount</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-hairline">
            {payouts.map((payout) => (
              <tr key={payout.id} className="hover:bg-ink/[0.02]">
                <td className="px-5 py-3 font-semibold text-ink">{payout.creatorName}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {new Date(payout.requestedAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {payout.paymentTrigger ? TRIGGER_LABEL[payout.paymentTrigger] : '—'}
                </td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-[oklch(0.95_0.04_268)] px-2.5 py-1 text-[10px] font-bold uppercase text-[oklch(0.4_0.14_268)]">
                    {payout.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-semibold text-ink">{formatMoney(payout.amount)}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleSettle(payout.id)}
                    disabled={busyId === payout.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-ink/85 disabled:opacity-50"
                  >
                    {busyId === payout.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                    )}
                    Settle
                  </button>
                </td>
              </tr>
            ))}

            {payouts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No pending payouts right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}