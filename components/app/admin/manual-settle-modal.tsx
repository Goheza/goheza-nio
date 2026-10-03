'use client'

import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import type { ManualSettlementResult } from '@/lib/api/admin-earnings'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n)
}

export function ManualSettleModal({
  creatorName,
  onClose,
  onConfirm,
}: {
  creatorName: string
  onClose: () => void
  onConfirm: (amount: number, notes: string) => Promise<ManualSettlementResult>
}) {
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ManualSettlementResult | null>(null)

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface-elevated shadow-card">
        <div className="flex items-center justify-between border-b border-hairline p-5">
          <div>
            <p className="font-display text-lg font-semibold text-ink">Settle Manually</p>
            <p className="text-xs text-muted-foreground">{creatorName}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!result ? (
          <>
            <div className="space-y-3 p-5">
              <div className="flex items-start gap-2 rounded-xl border border-[oklch(0.85_0.1_55)] bg-[oklch(0.97_0.04_55)] p-3 text-xs text-ink-soft">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.55_0.16_45)]" />
                <span>
                  Use this only for payments already sent outside the platform. This marks the creator's oldest
                  accruing earnings as paid and logs the reconciliation — it does not send any money.
                </span>
              </div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Amount already paid (UGX)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                className="w-full rounded-xl border border-hairline bg-background px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Notes (reference number, method, etc.)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-hairline bg-background px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {error && <p className="text-sm font-medium text-red-500">{error}</p>}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-hairline p-5">
              <button onClick={onClose} className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5">
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={async () => {
                  try {
                    setSubmitting(true)
                    setError(null)
                    const res = await onConfirm(Number(amount), notes)
                    setResult(res)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to settle.')
                  } finally {
                    setSubmitting(false)
                  }
                }}
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-50"
              >
                {submitting ? 'Settling…' : 'Confirm Settlement'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3 p-5 text-sm">
            <p className="font-semibold text-ink">Settlement recorded.</p>
            <p className="text-ink-soft">
              Marked {result.earningsMarkedPaid} earning{result.earningsMarkedPaid !== 1 ? 's' : ''} as paid, totalling{' '}
              {formatMoney(result.totalMarked)}.
            </p>
            {!result.matchedExactly && (
              <p className="rounded-xl border border-[oklch(0.85_0.1_55)] bg-[oklch(0.97_0.04_55)] p-3 text-xs text-ink-soft">
                Note: this doesn't line up exactly with the amount you entered, since earnings are marked whole
                (one submission at a time) rather than split. That's expected if your external payment doesn't
                land precisely on a submission boundary.
              </p>
            )}
            <button
              onClick={onClose}
              className="mt-2 w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/85"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}