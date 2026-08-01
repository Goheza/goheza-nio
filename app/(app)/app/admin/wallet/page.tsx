'use client'

import { useMemo, useState } from 'react'
import { ArrowDownToLine, Loader2 } from 'lucide-react'

type PendingPayoutRow = {
  creatorId: string
  creatorName: string
  transactionIds: string[]
  totalPending: number
}

const mockPayouts: PendingPayoutRow[] = [
  {
    creatorId: '1',
    creatorName: 'Sarah Johnson',
    transactionIds: ['tx_001', 'tx_002', 'tx_003'],
    totalPending: 245.5,
  },
  {
    creatorId: '2',
    creatorName: 'Michael Brown',
    transactionIds: ['tx_004'],
    totalPending: 120,
  },
  {
    creatorId: '3',
    creatorName: 'Emily Davis',
    transactionIds: ['tx_005', 'tx_006'],
    totalPending: 510,
  },
  {
    creatorId: '4',
    creatorName: 'James Wilson',
    transactionIds: ['tx_007', 'tx_008', 'tx_009', 'tx_010'],
    totalPending: 865.75,
  },
]

function formatMoney(amount: number) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  })
}

export default function AdminWalletPage() {
  const [payouts] = useState(mockPayouts)
  const [busyId, setBusyId] = useState<string | null>(null)

  const total = useMemo(
    () => payouts.reduce((sum, p) => sum + p.totalPending, 0),
    [payouts]
  )

  async function handleSettle(creatorId: string) {
    setBusyId(creatorId)

    // Fake loading
    await new Promise((resolve) => setTimeout(resolve, 1500))

    console.log('Settled payout for', creatorId)

    setBusyId(null)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          Wallet & Finance
        </h1>

        <p className="text-sm text-muted-foreground">
          Weekly creator payout batch — settle pending earnings so they become
          withdrawable.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[oklch(0.85_0.10_55)] bg-[oklch(0.98_0.04_55)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Total Pending Payouts
          </p>

          <p className="mt-1 font-display text-2xl font-semibold text-ink">
            {formatMoney(total)}
          </p>
        </div>

        <div className="rounded-2xl border border-hairline bg-surface-elevated p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Creators Awaiting Settlement
          </p>

          <p className="mt-1 font-display text-2xl font-semibold text-ink">
            {payouts.length}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface-elevated">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="border-b border-hairline bg-[oklch(0.97_0.012_78)] text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Creator</th>
              <th className="px-3 py-3">Pending Items</th>
              <th className="px-3 py-3 text-right">Amount</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-hairline">
            {payouts.map((payout) => (
              <tr key={payout.creatorId} className="hover:bg-ink/[0.02]">
                <td className="px-5 py-3 font-semibold text-ink">
                  {payout.creatorName}
                </td>

                <td className="px-3 py-3 text-muted-foreground">
                  {payout.transactionIds.length}
                </td>

                <td className="px-3 py-3 text-right font-semibold text-ink">
                  {formatMoney(payout.totalPending)}
                </td>

                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleSettle(payout.creatorId)}
                    disabled={busyId === payout.creatorId}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-ink/85 disabled:opacity-50"
                  >
                    {busyId === payout.creatorId ? (
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
                <td
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
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