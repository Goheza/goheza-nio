'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Copy, Hand, LayoutGrid, List, Loader2, Send, ShieldCheck, Undo2, X } from 'lucide-react'
import {
  claimWithdrawal,
  dispatchWithdrawal,
  isFullAdmin,
  formatMoney,
  formatPhone,
  isVerified,
  releaseWithdrawal,
  sendTo,
  type AdminKacyberEvent,
  type AdminPayoutNotification,
  type AdminWallet,
  type AdminWithdrawal,
  type PayoutsViewer,
  type WithdrawalStatus,
} from '@/lib/api/admin-payouts'
import { MoneyRow, Pill, RouteLabel, StatusPill, buttonDanger, buttonPrimary, buttonSecondary, formatWhen, relative } from './shared'

const shell = 'rounded-2xl border border-hairline bg-surface-elevated'
const thead =
  'border-b border-hairline bg-[oklch(0.97_0.012_78)] text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground'

function Empty({ children }: { children: React.ReactNode }) {
  return <div className={`${shell} p-10 text-center text-sm text-muted-foreground`}>{children}</div>
}

/* ------------------------------------------------------------------ To pay */

const DISPATCH_STATES: Record<string, string> = {
  dispatch_refused: 'KaCyber refused the last dispatch',
  awaiting_float: 'Last dispatch waited on a low KaCyber balance',
  config_error: 'KaCyber rejected our request',
  retrying: "KaCyber didn't respond to the last dispatch",
  fee_exceeds_amount: 'The transfer fee is more than the amount',
}

export type PayCardActions = {
  viewer: PayoutsViewer
  dispatchEnabled: boolean
  onMarkPaid: (w: AdminWithdrawal) => void
  onCantPay: (w: AdminWithdrawal) => void
  onOpen?: (w: AdminWithdrawal) => void
  onChanged: () => void
  onError: (message: string) => void
}

/** One open manual withdrawal: who to pay, how much, and what to do. */
export function PayCard({ w, ...a }: { w: AdminWithdrawal } & PayCardActions) {
  const [busy, setBusy] = useState(false)
  const to = sendTo(w)
  const mine = w.claimed_by === a.viewer.user_id
  const takenByOther = w.status === 'processing' && !mine
  const canOverride = isFullAdmin(a.viewer)
  const dispatching = w.status === 'processing' && w.dispatched_by
  const lastDispatch = w.status === 'requested' && w.provider_state ? DISPATCH_STATES[w.provider_state] : null

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
      a.onChanged()
    } catch (err) {
      a.onError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function dispatch() {
    if (!window.confirm(`Send ${formatMoney(w.payout_net ?? w.amount)} to ${to.number} (${to.name}) through KaCyber now?`)) return
    setBusy(true)
    try {
      const r = await dispatchWithdrawal(w.id)
      if (r.outcome === 'paid' || r.outcome === 'dispatched') a.onChanged()
      else {
        a.onChanged()
        a.onError(`Not sent: ${r.reason ?? r.outcome}. It's back in To pay.`)
      }
    } catch (err) {
      a.onError(err instanceof Error ? err.message : 'Dispatch failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`${shell} p-4 sm:p-5 ${w.overdue ? 'border-[oklch(0.8_0.1_25)]' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill w={w} />
            <span className="font-semibold text-ink">{w.creator || 'Creator'}</span>
            <span className="text-xs text-muted-foreground">{w.email}</span>
          </div>
          <p className="font-display text-lg font-semibold tracking-wide text-ink">{to.number}</p>
          <p className="text-sm text-ink-soft">
            {to.label} · <span className="font-medium text-ink">{to.name}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Requested {formatWhen(w.requested_at)}
            {w.pay_by && (
              <>
                {' · '}
                <span className={w.overdue ? 'font-semibold text-[oklch(0.5_0.16_25)]' : ''}>due {relative(w.pay_by)}</span>
              </>
            )}
            {w.status === 'processing' &&
              (dispatching ? (
                <> · being sent by KaCyber</>
              ) : (
                <> · being paid by {mine ? 'you' : w.claimed_by_name || 'another admin'}</>
              ))}
          </p>
          {w.campaigns && w.campaigns.length > 0 && (
            <p className="text-xs text-muted-foreground">
              From {w.campaigns.map((c) => c.name.replace(/^Think First, Click Safe\s*[-—]\s*/, '')).join(', ')}
            </p>
          )}
          {lastDispatch && (
            <p className="text-xs font-medium text-[oklch(0.5_0.14_45)]">
              {lastDispatch}
              {w.provider_last_error ? `: ${w.provider_last_error}` : ''}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Send</p>
          <p className="font-display text-2xl font-semibold text-ink">{formatMoney(w.payout_net ?? w.amount)}</p>
          <p className="text-xs text-muted-foreground">
            {formatMoney(w.withdrawn)}
            {w.platform_fee != null && ` − ${formatMoney(w.platform_fee)} fee`}
            {w.transfer_fee != null ? ` − ${formatMoney(w.transfer_fee)} transfer` : ' · transfer fee not quoted'}
          </p>
        </div>
      </div>

      {!dispatching && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {to.kind === 'mobile' && (w.status === 'requested' || mine) && (
            <button
              onClick={dispatch}
              disabled={busy || !a.dispatchEnabled}
              title={a.dispatchEnabled ? 'Send it through KaCyber' : 'Available when KaCyber payments are live'}
              className={buttonPrimary}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Dispatch payment
            </button>
          )}
          {w.status === 'requested' && (
            <button onClick={() => run(() => claimWithdrawal(w.id))} disabled={busy} className={buttonSecondary}>
              <Hand className="h-4 w-4" />
              I&apos;m paying this by hand
            </button>
          )}
          {w.status === 'processing' && (mine || canOverride) && (
            <>
              <button onClick={() => a.onMarkPaid(w)} className={buttonSecondary}>
                Mark paid…
              </button>
              <button onClick={() => run(() => releaseWithdrawal(w.id))} disabled={busy} className={buttonSecondary}>
                <Undo2 className="h-4 w-4" />
                Hand back
              </button>
            </>
          )}
          {takenByOther && !canOverride && (
            <span className="text-sm text-muted-foreground">Taken by {w.claimed_by_name || 'another admin'}</span>
          )}
          {(!takenByOther || canOverride) && (
            <button onClick={() => a.onCantPay(w)} className={buttonDanger}>
              Can&apos;t pay…
            </button>
          )}
          {a.onOpen && (
            <button
              onClick={() => a.onOpen?.(w)}
              className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
            >
              Details <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      {!a.dispatchEnabled && to.kind === 'mobile' && w.status === 'requested' && (
        <p className="mt-2 text-xs text-muted-foreground">Dispatch is available once KaCyber payments are live.</p>
      )}
    </div>
  )
}

export function ToPayTab({ withdrawals, ...actions }: { withdrawals: AdminWithdrawal[] } & PayCardActions) {
  const queue = useMemo(
    () =>
      withdrawals
        .filter((w) => w.route === 'manual' && (w.status === 'requested' || w.status === 'processing'))
        .sort((a, b) => (a.pay_by ?? a.requested_at).localeCompare(b.pay_by ?? b.requested_at)),
    [withdrawals],
  )
  if (queue.length === 0) return <Empty>Nothing to pay right now. New manual withdrawals show up here.</Empty>
  return (
    <div className="space-y-3">
      {queue.map((w) => (
        <PayCard key={w.id} w={w} {...actions} />
      ))}
    </div>
  )
}

/* --------------------------------------------------------------- Automatic */

const ISSUE: Record<string, string> = {
  awaiting_float: 'Waiting: KaCyber balance too low. Top up the float.',
  needs_admin: 'Gave up after repeated failures. Check KaCyber, then pay by hand or mark failed.',
  config_error: 'KaCyber refused the request. Check the keys and allow list.',
  retrying: 'KaCyber had a problem; retrying every few minutes.',
}

export function AutomaticTab({
  withdrawals,
  onOpen,
}: {
  withdrawals: AdminWithdrawal[]
  onOpen: (w: AdminWithdrawal) => void
}) {
  const auto = withdrawals.filter((w) => w.route === 'kacyber_auto')
  const open = auto.filter((w) => w.status === 'requested' || w.status === 'processing')
  const recent = auto.filter((w) => !(w.status === 'requested' || w.status === 'processing')).slice(0, 30)

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-ink">In progress</h3>
        {open.length === 0 ? (
          <Empty>No automatic payouts in progress.</Empty>
        ) : (
          open.map((w) => (
            <button key={w.id} onClick={() => onOpen(w)} className={`${shell} flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-ink/[0.02]`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusPill w={w} />
                  <span className="font-semibold text-ink">{w.creator}</span>
                </div>
                <p className="text-sm text-ink-soft">
                  {(w.provider_state && ISSUE[w.provider_state]) || `Sending · ${w.provider_state ?? 'queued'}`}
                </p>
                <p className="text-xs text-muted-foreground">Requested {relative(w.requested_at)}</p>
              </div>
              <p className="font-display text-lg font-semibold text-ink">{formatMoney(w.payout_net ?? w.amount)}</p>
            </button>
          ))
        )}
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-ink">Recent</h3>
        {recent.length === 0 ? (
          <Empty>No automatic payouts yet.</Empty>
        ) : (
          <WithdrawalsTable withdrawals={recent} onOpen={onOpen} />
        )}
      </section>
    </div>
  )
}

/* ----------------------------------------------------------------- History */

const FILTERS: { key: 'all' | WithdrawalStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'failed', label: "Couldn't pay" },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'requested', label: 'To pay' },
  { key: 'processing', label: 'Sending' },
]

export function HistoryTab({ withdrawals, onOpen }: { withdrawals: AdminWithdrawal[]; onOpen: (w: AdminWithdrawal) => void }) {
  const [filter, setFilter] = useState<'all' | WithdrawalStatus>('all')
  const rows = filter === 'all' ? withdrawals : withdrawals.filter((w) => w.status === filter)

  function exportCsv() {
    const header = ['Requested', 'Creator', 'Email', 'Route', 'Status', 'Withdrawn', 'Platform fee', 'Transfer fee', 'Sent', 'Reference', 'Paid by', 'Closed']
    const lines = rows.map((w) =>
      [
        w.requested_at,
        w.creator ?? '',
        w.email ?? '',
        w.route === 'kacyber_auto' ? 'Automatic' : w.source === 'admin_manual' ? 'Admin payout' : 'Manual',
        w.status,
        w.withdrawn,
        w.platform_fee ?? '',
        w.transfer_fee ?? '',
        w.payout_net ?? w.amount,
        w.payout_reference ?? '',
        w.processed_by_name ?? '',
        w.processed_at ?? '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `goheza-payouts-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filter === f.key ? 'border-ink bg-ink text-white' : 'border-hairline bg-background text-ink hover:bg-ink/5'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button onClick={exportCsv} disabled={rows.length === 0} className={`${buttonSecondary} ml-auto text-xs`}>
          Export CSV
        </button>
      </div>
      {rows.length === 0 ? <Empty>No withdrawals match.</Empty> : <WithdrawalsTable withdrawals={rows} onOpen={onOpen} />}
    </div>
  )
}

function WithdrawalsTable({ withdrawals, onOpen }: { withdrawals: AdminWithdrawal[]; onOpen: (w: AdminWithdrawal) => void }) {
  return (
    <div className={`${shell} overflow-x-auto`}>
      <table className="w-full min-w-[860px] text-sm">
        <thead className={thead}>
          <tr>
            <th className="px-5 py-3">Creator</th>
            <th className="px-3 py-3">Requested</th>
            <th className="px-3 py-3">Type</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3 text-right">Withdrawn</th>
            <th className="px-3 py-3 text-right">Sent</th>
            <th className="px-5 py-3">Reference</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {withdrawals.map((w) => (
            <tr key={w.id} onClick={() => onOpen(w)} className="cursor-pointer hover:bg-ink/[0.02]">
              <td className="px-5 py-3">
                <p className="font-semibold text-ink">{w.creator || 'Creator'}</p>
                <p className="text-xs text-muted-foreground">{w.payout_method}</p>
              </td>
              <td className="px-3 py-3 text-muted-foreground">{formatWhen(w.requested_at)}</td>
              <td className="px-3 py-3 text-ink-soft">
                <RouteLabel w={w} />
              </td>
              <td className="px-3 py-3">
                <StatusPill w={w} />
              </td>
              <td className="px-3 py-3 text-right">{formatMoney(w.withdrawn)}</td>
              <td className="px-3 py-3 text-right font-semibold text-ink">
                {w.status === 'failed' || w.status === 'cancelled' ? '—' : formatMoney(w.payout_net ?? w.amount)}
              </td>
              <td className="max-w-[180px] truncate px-5 py-3 text-xs text-muted-foreground">{w.payout_reference ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ----------------------------------------------------------------- Wallets */

function VerifiedBadge({ wallet }: { wallet: Pick<AdminWallet, 'kacyber_status'> }) {
  return isVerified(wallet.kacyber_status) ? (
    <Pill className="bg-[oklch(0.95_0.05_150)] text-[oklch(0.4_0.12_150)]">
      <ShieldCheck className="h-3 w-3" /> Verified · KaCyber
    </Pill>
  ) : (
    <Pill className="bg-ink/5 text-ink-soft">Unverified · manual</Pill>
  )
}

function payoutLine(w: AdminWallet) {
  if (isVerified(w.kacyber_status)) return `Mobile Money · ${formatPhone(w.kacyber_msisdn ?? '')}`
  if (w.payout_method === 'bank') return `${w.bank_name ?? 'Bank'} · ${w.bank_account ?? '—'}`
  if (w.mobile_number) return `Mobile Money · ${formatPhone(w.mobile_number)}`
  return 'No payout details'
}

export function WalletsTab({
  wallets,
  withdrawals,
  feeRate,
  onPay,
}: {
  wallets: AdminWallet[]
  withdrawals: AdminWithdrawal[]
  feeRate: number
  onPay: (w: AdminWallet) => void
}) {
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [show, setShow] = useState<'all' | 'verified' | 'unverified'>('all')
  const open = useMemo(() => {
    const m = new Map<string, number>()
    for (const w of withdrawals) {
      if (w.status === 'requested' || w.status === 'processing') m.set(w.user_id, (m.get(w.user_id) ?? 0) + 1)
    }
    return m
  }, [withdrawals])
  const rows = wallets.filter((w) =>
    show === 'all' ? true : show === 'verified' ? isVerified(w.kacyber_status) : !isVerified(w.kacyber_status),
  )
  const pendingShown = (w: AdminWallet) => Math.round(w.pending_net / (1 - feeRate))

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {(['all', 'verified', 'unverified'] as const).map((k) => (
        <button
          key={k}
          onClick={() => setShow(k)}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${
            show === k ? 'border-ink bg-ink text-white' : 'border-hairline bg-background text-ink hover:bg-ink/5'
          }`}
        >
          {k}
        </button>
      ))}
      <div className="ml-auto flex rounded-full border border-hairline bg-background p-0.5">
        {(['cards', 'table'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            aria-label={`${v} view`}
            className={`grid h-7 w-8 place-items-center rounded-full ${view === v ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}`}
          >
            {v === 'cards' ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
          </button>
        ))}
      </div>
    </div>
  )

  if (wallets.length === 0) return <Empty>No creators match.</Empty>

  return (
    <div className="space-y-3">
      {toolbar}
      {rows.length === 0 && <Empty>No {show} wallets.</Empty>}
      {view === 'cards' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((w) => {
            const verified = isVerified(w.kacyber_status)
            const requests = open.get(w.user_id) ?? 0
            return (
              <Link
                key={w.user_id}
                href={`/app/admin/payouts/wallets/${w.user_id}`}
                className={`${shell} group flex flex-col gap-4 p-5 transition-shadow hover:shadow-card`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundImage: 'var(--gradient-primary)' }}
                    >
                      {(w.name || '?').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{w.name || 'Creator'}</p>
                      <p className="truncate text-xs text-muted-foreground">{w.email}</p>
                    </div>
                  </div>
                  <VerifiedBadge wallet={w} />
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {verified ? 'Available · paid out automatically' : 'Available · paid on request'}
                  </p>
                  <p className="font-display text-2xl font-semibold text-ink">{formatMoney(w.available_shown)}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Pending (in campaigns)</p>
                    <p className="font-semibold text-ink">{formatMoney(pendingShown(w))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paid out</p>
                    <p className="font-semibold text-ink">{formatMoney(w.withdrawn)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{payoutLine(w)}</span>
                  {requests > 0 ? (
                    <Pill className="bg-[oklch(0.95_0.04_268)] text-[oklch(0.4_0.14_268)]">
                      {requests} open request{requests > 1 ? 's' : ''}
                    </Pill>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-ink-soft transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className={`${shell} overflow-x-auto`}>
          <table className="w-full min-w-[960px] text-sm">
            <thead className={thead}>
              <tr>
                <th className="px-5 py-3">Creator</th>
                <th className="px-3 py-3">Wallet</th>
                <th className="px-3 py-3 text-right">Available</th>
                <th className="px-3 py-3 text-right">Pending</th>
                <th className="px-3 py-3 text-right">Earned</th>
                <th className="px-3 py-3 text-right">Paid out</th>
                <th className="px-3 py-3">Open</th>
                <th className="px-5 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((w) => (
                <tr key={w.user_id} className="hover:bg-ink/[0.02]">
                  <td className="px-5 py-3">
                    <Link href={`/app/admin/payouts/wallets/${w.user_id}`} className="block">
                      <p className="font-semibold text-ink hover:underline">{w.name || 'Creator'}</p>
                      <p className="text-xs text-muted-foreground">{w.email}</p>
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <VerifiedBadge wallet={w} />
                    <p className="mt-1 text-xs text-muted-foreground">{payoutLine(w)}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-ink">{formatMoney(w.available_shown)}</td>
                  <td className="px-3 py-3 text-right text-ink-soft">{formatMoney(pendingShown(w))}</td>
                  <td className="px-3 py-3 text-right text-ink-soft">{formatMoney(w.earned_gross)}</td>
                  <td className="px-3 py-3 text-right text-ink-soft">{formatMoney(w.withdrawn)}</td>
                  <td className="px-3 py-3 text-ink-soft">{open.get(w.user_id) ?? '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => onPay(w)} className={`${buttonSecondary} text-xs`}>
                      Record payout…
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ Detail panel */

export function WithdrawalDrawer({
  w,
  notifications,
  events,
  onClose,
}: {
  w: AdminWithdrawal
  notifications: AdminPayoutNotification[]
  events: AdminKacyberEvent[]
  onClose: () => void
}) {
  const to = sendTo(w)
  const told = notifications.filter((n) => n.user_id === w.user_id && n.kind.startsWith('withdrawal_') && n.created_at >= w.requested_at)
  const callbacks = events.filter((e) => e.withdrawal_id === w.id)
  const returned = w.status === 'failed' || w.status === 'cancelled'

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/40" onClick={onClose}>
      <aside className="h-full w-full max-w-md overflow-y-auto bg-surface-elevated p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <StatusPill w={w} />
            <p className="mt-2 font-display text-xl font-semibold text-ink">{w.creator || 'Creator'}</p>
            <p className="text-xs text-muted-foreground">{w.email}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-hairline p-4">
          <MoneyRow label="Withdrawn from balance" value={formatMoney(w.withdrawn)} />
          {returned ? (
            <MoneyRow label="Returned to balance" value={`+${formatMoney(w.withdrawn)}`} bold />
          ) : (
            <>
              <MoneyRow label="Platform fee (15%)" value={w.platform_fee == null ? 'Included' : `−${formatMoney(w.platform_fee)}`} />
              <MoneyRow label="Transfer fee" value={w.transfer_fee == null ? 'Not quoted' : `−${formatMoney(w.transfer_fee)}`} />
              <div className="my-2 h-px bg-hairline" />
              <MoneyRow label={w.status === 'paid' ? 'Sent' : 'To send'} value={formatMoney(w.payout_net ?? w.amount)} bold />
            </>
          )}
        </div>

        {w.campaigns && w.campaigns.length > 0 && (
          <div className="mt-5 rounded-2xl border border-hairline p-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Taken from</p>
            {w.campaigns.map((c) => (
              <MoneyRow
                key={c.campaign_id}
                label={c.name}
                value={formatMoney(c.requested_amount ?? Math.round(c.amount / 0.85))}
              />
            ))}
          </div>
        )}

        <dl className="mt-5 space-y-2 text-sm">
          {[
            ['To', `${to.label} · ${to.number} · ${to.name}`],
            ['Type', w.route === 'kacyber_auto' ? 'Automatic (KaCyber)' : w.source === 'admin_manual' ? 'Admin payout' : 'Manual'],
            ['Requested', formatWhen(w.requested_at)],
            ...(w.pay_by ? [['Due by', formatWhen(w.pay_by)]] : []),
            ...(w.claimed_by_name && w.status === 'processing' ? [['Being paid by', w.claimed_by_name]] : []),
            ...(w.processed_at ? [['Closed', `${formatWhen(w.processed_at)}${w.processed_by_name ? ` by ${w.processed_by_name}` : ''}`]] : []),
            ...(w.payout_reference ? [['Reference', w.payout_reference]] : []),
            ...(w.notes ? [[w.status === 'failed' ? 'Reason' : 'Note', w.notes]] : []),
            ...(w.provider_state ? [['KaCyber state', w.provider_state]] : []),
            ...(w.provider_last_error ? [['Last error', w.provider_last_error]] : []),
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[110px_1fr] gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="break-words text-ink">{v}</dd>
            </div>
          ))}
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <dt className="text-muted-foreground">Withdrawal ID</dt>
            <dd className="flex items-center gap-2 text-ink">
              <span className="truncate font-mono text-xs">{w.id}</span>
              <button onClick={() => navigator.clipboard.writeText(w.id)} aria-label="Copy ID" className="text-ink-soft hover:text-ink">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </dd>
          </div>
        </dl>

        <h4 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">What the creator was told</h4>
        <ul className="mt-2 space-y-2">
          {told.map((n) => (
            <li key={n.id} className="rounded-xl border border-hairline p-3">
              <div className="flex justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{n.title}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(n.created_at)}</span>
              </div>
              {n.body && <p className="mt-0.5 text-sm text-ink-soft">{n.body}</p>}
            </li>
          ))}
          {told.length === 0 && <li className="text-sm text-muted-foreground">Nothing yet.</li>}
        </ul>

        {w.route === 'kacyber_auto' && (
          <>
            <h4 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">KaCyber callbacks</h4>
            <ul className="mt-2 space-y-1 text-sm">
              {callbacks.map((e) => (
                <li key={e.id} className="flex justify-between gap-2">
                  <span className="text-ink">{e.state ?? '—'}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatWhen(e.received_at)} · signature {e.signature_ok ? 'ok' : 'bad'}
                  </span>
                </li>
              ))}
              {callbacks.length === 0 && <li className="text-muted-foreground">None.</li>}
            </ul>
          </>
        )}
      </aside>
    </div>
  )
}
