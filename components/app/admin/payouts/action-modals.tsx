'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import {
  createPayout,
  failWithdrawal,
  formatMoney,
  formatPhone,
  getPayoutsOverview,
  markWithdrawalPaid,
  sendTo,
  type AdminWallet,
  type AdminWithdrawal,
} from '@/lib/api/admin-payouts'
import {
  ErrorText,
  Field,
  Modal,
  MoneyRow,
  buttonDanger,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from './shared'

function SendToCard({ w }: { w: AdminWithdrawal }) {
  const to = sendTo(w)
  return (
    <div className="rounded-2xl border border-hairline bg-background p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Send to</p>
      <p className="mt-1 font-display text-xl font-semibold tracking-wide text-ink">{to.number}</p>
      <p className="text-sm text-ink-soft">
        {to.label} · <span className="font-medium text-ink">{to.name}</span>
      </p>
    </div>
  )
}

/** Paid: needs the transaction reference from the receipt. */
export function MarkPaidModal({
  w,
  onClose,
  onDone,
}: {
  w: AdminWithdrawal
  onClose: () => void
  onDone: () => void
}) {
  const expected = w.payout_net ?? w.amount
  const [reference, setReference] = useState('')
  const [differentAmount, setDifferentAmount] = useState(false)
  const [sent, setSent] = useState(String(expected))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = reference.trim().length >= 4 && (!differentAmount || Number(sent) > 0)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await markWithdrawalPaid(w.id, reference.trim(), differentAmount ? Number(sent) : undefined)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark paid.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Mark as paid"
      subtitle={w.creator ?? undefined}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={buttonSecondary}>
            Cancel
          </button>
          <button onClick={submit} disabled={!ready || busy} className={buttonPrimary}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm paid {formatMoney(differentAmount ? Number(sent) || 0 : expected)}
          </button>
        </>
      }
    >
      <SendToCard w={w} />
      <div className="rounded-2xl border border-hairline p-4">
        <MoneyRow label="Withdrawn from balance" value={formatMoney(w.withdrawn)} />
        {w.platform_fee != null && <MoneyRow label="Platform fee (15%)" value={`−${formatMoney(w.platform_fee)}`} />}
        <MoneyRow
          label="Transfer fee"
          value={w.transfer_fee == null ? 'Not quoted' : `−${formatMoney(w.transfer_fee)}`}
        />
        <div className="my-2 h-px bg-hairline" />
        <MoneyRow label="Amount to send" value={formatMoney(expected)} bold />
      </div>
      <Field label="Transaction reference" hint="From the mobile money or bank receipt. The creator sees it.">
        <input
          autoFocus
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. MP241017.1352.A12345"
          className={inputClass}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={differentAmount} onChange={(e) => setDifferentAmount(e.target.checked)} />
        I sent a different amount (the network charged a different fee)
      </label>
      {differentAmount && (
        <Field label="Amount actually sent (UGX)">
          <input type="number" min={1} value={sent} onChange={(e) => setSent(e.target.value)} className={inputClass} />
        </Field>
      )}
      <ErrorText error={error} />
    </Modal>
  )
}

const REASONS = [
  'The mobile money number is not registered.',
  'The name on the account does not match the creator.',
  'The payout details are incomplete. Please update them and request again.',
]

/** Can't pay: the creator sees the reason and gets the money back. */
export function CantPayModal({
  w,
  onClose,
  onDone,
}: {
  w: AdminWithdrawal
  onClose: () => void
  onDone: () => void
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await failWithdrawal(w.id, reason.trim())
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Can't pay this withdrawal"
      subtitle={`${w.creator ?? 'Creator'} · ${formatMoney(w.withdrawn)}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={buttonSecondary}>
            Keep it
          </button>
          <button onClick={submit} disabled={reason.trim().length < 5 || busy} className={buttonDanger}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Don&apos;t pay · return {formatMoney(w.withdrawn)}
          </button>
        </>
      }
    >
      <p className="flex items-start gap-2 rounded-xl border border-[oklch(0.85_0.1_55)] bg-[oklch(0.97_0.04_55)] p-3 text-xs text-ink-soft">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.55_0.16_45)]" />
        Nothing is sent. The full {formatMoney(w.withdrawn)} goes back to the creator&apos;s balance and they&apos;re
        notified with your reason.
      </p>
      <div className="flex flex-wrap gap-2">
        {REASONS.map((r) => (
          <button key={r} onClick={() => setReason(r)} className="rounded-full border border-hairline px-3 py-1.5 text-xs text-ink hover:bg-ink/5">
            {r}
          </button>
        ))}
      </div>
      <Field label="Reason the creator will see">
        <textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
      </Field>
      <ErrorText error={error} />
    </Modal>
  )
}

/**
 * A payout an admin has already sent outside a creator request (replaces
 * "Settle manually"). Same 15% platform fee, reference and notice.
 */
export function CreatePayoutModal({
  creator,
  feeRate,
  onClose,
  onDone,
}: {
  creator: Pick<AdminWallet, 'user_id' | 'name' | 'available_shown'> &
    Partial<Pick<AdminWallet, 'payout_method' | 'mobile_number' | 'mobile_name' | 'bank_name' | 'bank_account' | 'bank_account_name'>>
  feeRate: number
  onClose: () => void
  onDone: () => void
}) {
  const [amount, setAmount] = useState(creator.available_shown > 0 ? String(creator.available_shown) : '')
  const [transferFee, setTransferFee] = useState('0')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const gross = Math.floor(Number(amount) || 0)
  const platformFee = Math.round(gross * feeRate)
  const tfee = Math.max(0, Math.floor(Number(transferFee) || 0))
  const sent = gross - platformFee - tfee
  const beyondBalance = gross > creator.available_shown
  const ready = gross > 0 && sent > 0 && reference.trim().length >= 4

  const destination =
    creator.payout_method === 'bank'
      ? `${creator.bank_name ?? 'Bank'} · ${creator.bank_account ?? '—'} · ${creator.bank_account_name ?? ''}`
      : creator.mobile_number
        ? `Mobile Money · ${formatPhone(creator.mobile_number)} · ${creator.mobile_name ?? ''}`
        : 'No payout details on the profile'

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await createPayout({ creatorId: creator.user_id, amount: gross, reference: reference.trim(), transferFee: tfee, notes })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payout.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Modal title="Payout recorded" subtitle={creator.name ?? undefined} onClose={onDone}>
        <p className="flex items-start gap-2 text-sm text-ink">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.5_0.14_150)]" />
          {formatMoney(sent)} recorded as paid with reference {reference.trim()}. The creator has been notified and
          their balance is down by {formatMoney(gross)}.
        </p>
        <button onClick={onDone} className={`${buttonPrimary} w-full`}>
          Done
        </button>
      </Modal>
    )
  }

  return (
    <Modal
      title="Record a payout"
      subtitle={creator.name ?? undefined}
      onClose={onClose}
      wide
      footer={
        <>
          <button onClick={onClose} className={buttonSecondary}>
            Cancel
          </button>
          <button onClick={submit} disabled={!ready || busy} className={buttonPrimary}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Record {formatMoney(Math.max(sent, 0))} paid
          </button>
        </>
      }
    >
      <p className="flex items-start gap-2 rounded-xl border border-[oklch(0.85_0.1_55)] bg-[oklch(0.97_0.04_55)] p-3 text-xs text-ink-soft">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.55_0.16_45)]" />
        Send the money first. This records a payment you&apos;ve already made, takes it from the creator&apos;s balance and
        notifies them. It doesn&apos;t send anything.
      </p>
      <div className="rounded-2xl border border-hairline bg-background p-4 text-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Their payout details</p>
        <p className="mt-1 text-ink">{destination}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Available to withdraw: {formatMoney(creator.available_shown)}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From their balance (UGX)" hint="Before the 15% platform fee, as the creator sees it.">
          <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Transfer fee charged (UGX)">
          <input type="number" min={0} value={transferFee} onChange={(e) => setTransferFee(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="rounded-2xl border border-hairline p-4">
        <MoneyRow label="From their balance" value={formatMoney(gross)} />
        <MoneyRow label={`Platform fee (${Math.round(feeRate * 100)}%)`} value={`−${formatMoney(platformFee)}`} />
        <MoneyRow label="Transfer fee" value={`−${formatMoney(tfee)}`} />
        <div className="my-2 h-px bg-hairline" />
        <MoneyRow label="Amount you sent" value={formatMoney(Math.max(sent, 0))} bold />
      </div>
      {beyondBalance && gross > 0 && (
        <p className="text-xs text-[oklch(0.5_0.14_60)]">
          More than their available balance: earnings that aren&apos;t withdrawable yet will be marked paid to cover it.
        </p>
      )}
      <Field label="Transaction reference" hint="From the mobile money or bank receipt. The creator sees it.">
        <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Internal note (optional)">
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. paid early at the creator's request" className={inputClass} />
      </Field>
      <ErrorText error={error} />
    </Modal>
  )
}

/** Find a creator to record a payout for (any creator, not just ones on screen). */
export function PickCreatorModal({
  onClose,
  onPick,
}: {
  onClose: () => void
  onPick: (wallet: AdminWallet) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminWallet[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search() {
    if (query.trim().length < 2) return
    setBusy(true)
    setError(null)
    try {
      setResults((await getPayoutsOverview(query)).wallets)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Record a payout" subtitle="Who did you pay?" onClose={onClose}>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          search()
        }}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Creator name or email"
          className={inputClass}
        />
        <button type="submit" disabled={busy || query.trim().length < 2} className={buttonPrimary}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find'}
        </button>
      </form>
      <ErrorText error={error} />
      {results && (
        <ul className="divide-y divide-hairline rounded-2xl border border-hairline">
          {results.map((w) => (
            <li key={w.user_id}>
              <button onClick={() => onPick(w)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ink/[0.02]">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{w.name || 'Creator'}</span>
                  <span className="block truncate text-xs text-muted-foreground">{w.email}</span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  Available
                  <span className="block text-sm font-semibold text-ink">{formatMoney(w.available_shown)}</span>
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No creators match.</li>}
        </ul>
      )}
    </Modal>
  )
}
