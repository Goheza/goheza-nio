'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'
import {
  formatMoney,
  formatPhone,
  getCreatorWallet,
  getDispatchStatus,
  getPayoutSchedules,
  isVerified,
  scheduleLine,
  type AdminWithdrawal,
  type PayoutSchedule,
  type CreatorWalletDetail,
  type DispatchStatus,
} from '@/lib/api/admin-payouts'
import { CantPayModal, CreatePayoutModal, MarkPaidModal } from '@/components/app/admin/payouts/action-modals'
import { PayCard, WithdrawalDrawer } from '@/components/app/admin/payouts/tabs'
import { ErrorText, Pill, RouteLabel, StatusPill, buttonPrimary, formatWhen } from '@/components/app/admin/payouts/shared'

const shell = 'rounded-2xl border border-hairline bg-surface-elevated'
const thead =
  'border-b border-hairline bg-[oklch(0.97_0.012_78)] text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground'


function Figure({ label, value, sub, strong = false }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className={`${shell} p-4`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display font-semibold text-ink ${strong ? 'text-3xl' : 'text-xl'}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

export default function AdminWalletDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<CreatorWalletDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [dispatch, setDispatch] = useState<DispatchStatus>({ mode: 'fake', enabled: false })
  const [schedule, setSchedule] = useState<PayoutSchedule | null>(null)

  useEffect(() => {
    getPayoutSchedules([id])
      .then((s) => setSchedule(s[id] ?? null))
      .catch(() => setSchedule(null))
  }, [id, reloadKey])
  const [paying, setPaying] = useState<AdminWithdrawal | null>(null)
  const [failing, setFailing] = useState<AdminWithdrawal | null>(null)
  const [recording, setRecording] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const wallet = await getCreatorWallet(id)
        if (!cancelled) {
          setData(wallet)
          setLoadError(null)
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load wallet.')
      }
    }
    load()
    const timer = setInterval(load, 20_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [id, reloadKey])

  useEffect(() => {
    let cancelled = false
    getDispatchStatus().then((d) => {
      if (!cancelled) setDispatch(d)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!data) {
    return loadError ? (
      <p className="py-10 text-center text-sm text-muted-foreground">{loadError}</p>
    ) : (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
      </div>
    )
  }

  const { profile, kacyber, balance, viewer } = data
  const verified = isVerified(kacyber?.status)
  const open = data.withdrawals.filter((w) => w.status === 'requested' || w.status === 'processing')
  const openManual = open.filter((w) => w.route === 'manual' && !w.dispatched_by)
  const openAuto = open.filter((w) => !openManual.includes(w))
  const history = data.withdrawals.filter((w) => !open.includes(w))
  const opened = data.withdrawals.find((w) => w.id === openId) ?? null
  const done = () => {
    setPaying(null)
    setFailing(null)
    setActionError(null)
    reload()
  }

  return (
    <div className="space-y-8">
      <Link href="/app/admin/payouts" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Payouts
      </Link>

      {/* Who, and how they get paid */}
      <header className={`${shell} flex flex-wrap items-start justify-between gap-6 p-5 sm:p-6`}>
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <span
              className="grid h-14 w-14 place-items-center rounded-full text-lg font-bold text-white"
              style={{ backgroundImage: 'var(--gradient-primary)' }}
            >
              {(profile.name || '?').charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">{profile.name || 'Creator'}</h1>
            <p className="text-sm text-muted-foreground">
              {profile.email}
              {profile.username && ` · @${profile.username}`}
            </p>
            {profile.account_status === 'suspended' && (
              <Pill className="mt-1 bg-[oklch(0.95_0.04_25)] text-[oklch(0.5_0.16_25)]">Suspended</Pill>
            )}
          </div>
        </div>

        <div className="min-w-[260px] space-y-1 text-sm">
          {verified && kacyber ? (
            <>
              <Pill className="bg-[oklch(0.95_0.05_150)] text-[oklch(0.4_0.12_150)]">
                <ShieldCheck className="h-3 w-3" /> Verified · KaCyber wallet
              </Pill>
              <p className="pt-1 font-semibold text-ink">
                {kacyber.network} · {formatPhone(kacyber.msisdn)}
              </p>
              <p className="text-ink-soft">Registered to {kacyber.registered_name ?? '—'}</p>
              <p className="text-xs text-muted-foreground">
                Verified {formatWhen(kacyber.verified_at)}
                {kacyber.nin_last4 && ` · NIN •••• ${kacyber.nin_last4}`} · withdrawals are paid automatically
              </p>
            </>
          ) : (
            <>
              <Pill className="bg-ink/5 text-ink-soft">
                Unverified{kacyber ? ` · KaCyber ${kacyber.status.replace('_', ' ')}` : ''}
              </Pill>
              <p className="pt-1 font-semibold text-ink">
                {profile.payout_method === 'bank'
                  ? `${profile.bank_name ?? 'Bank'} · ${profile.bank_account ?? '—'}`
                  : profile.mobile_number
                    ? `Mobile Money · ${formatPhone(profile.mobile_number)}`
                    : 'No payout details'}
              </p>
              <p className="text-ink-soft">
                {profile.payout_method === 'bank' ? profile.bank_account_name : profile.mobile_name}
              </p>
              <p className="text-xs text-muted-foreground">Paid by an admin within 24 hours of each request</p>
            </>
          )}
        </div>
      </header>

      {/* Money */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Figure
          label={verified ? 'Available · automatic' : 'Available · on request'}
          value={formatMoney(balance.available_shown)}
          sub={`${formatMoney(balance.available_net)} after the ${Math.round(balance.fee_rate * 100)}% fee`}
          strong
        />
        <Figure
          label="Pending · in campaigns"
          value={formatMoney(balance.pending_shown)}
          sub={scheduleLine(schedule ?? undefined, balance.fee_rate) || undefined}
        />
        <Figure label="Requests in progress" value={formatMoney(balance.in_flight)} sub={`${open.length} open`} />
        <Figure label="Paid out" value={formatMoney(balance.paid_out)} sub={`Lifetime earned ${formatMoney(balance.earned_gross)}`} />
      </div>
      <div className="flex justify-end">
        <button onClick={() => setRecording(true)} className={buttonPrimary}>
          Record a payout…
        </button>
      </div>
      <ErrorText error={actionError} />

      <Section title="Active requests" subtitle={open.length ? undefined : 'No open withdrawals.'}>
        {openManual.map((w) => (
          <PayCard
            key={w.id}
            w={w}
            viewer={viewer}
            dispatchEnabled={dispatch.enabled}
            onMarkPaid={setPaying}
            onCantPay={setFailing}
            onOpen={(x) => setOpenId(x.id)}
            onChanged={() => {
              setActionError(null)
              reload()
            }}
            onError={setActionError}
          />
        ))}
        {openAuto.map((w) => (
          <button
            key={w.id}
            onClick={() => setOpenId(w.id)}
            className={`${shell} flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-ink/[0.02]`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusPill w={w} />
                <span className="text-sm text-ink-soft">Sending through KaCyber · {w.provider_state ?? 'queued'}</span>
              </div>
              <p className="text-xs text-muted-foreground">Requested {formatWhen(w.requested_at)}</p>
            </div>
            <p className="font-display text-lg font-semibold text-ink">{formatMoney(w.payout_net ?? w.amount)}</p>
          </button>
        ))}
      </Section>

      <Section title="Payment history">
        <div className={`${shell} overflow-x-auto`}>
          <table className="w-full min-w-[760px] text-sm">
            <thead className={thead}>
              <tr>
                <th className="px-5 py-3">Requested</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Withdrawn</th>
                <th className="px-3 py-3 text-right">Sent</th>
                <th className="px-5 py-3">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {history.map((w) => (
                <tr key={w.id} onClick={() => setOpenId(w.id)} className="cursor-pointer hover:bg-ink/[0.02]">
                  <td className="px-5 py-3 text-muted-foreground">{formatWhen(w.requested_at)}</td>
                  <td className="px-3 py-3 text-ink-soft">
                    <RouteLabel w={w} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill w={w} />
                  </td>
                  <td className="px-3 py-3 text-right">{formatMoney(w.withdrawn)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-ink">
                    {w.status === 'paid' ? formatMoney(w.payout_net ?? w.amount) : '—'}
                  </td>
                  <td className="max-w-[200px] truncate px-5 py-3 text-xs text-muted-foreground">{w.payout_reference ?? w.notes ?? '—'}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No payments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-8 xl:grid-cols-2">
        <Section title="Earnings" subtitle="Before the platform fee, as the creator sees them.">
          <ul className={`${shell} divide-y divide-hairline`}>
            {data.earnings.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{e.campaign ?? 'Campaign'}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.views.toLocaleString()} views · {formatWhen(e.created_at)} · {e.status}
                  </p>
                </div>
                <p className="font-semibold text-ink">{formatMoney(e.gross)}</p>
              </li>
            ))}
            {data.earnings.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">No earnings yet.</li>}
          </ul>
        </Section>

        <Section title="Notifications" subtitle="Payment messages this creator received.">
          <ul className={`${shell} divide-y divide-hairline`}>
            {data.notifications.map((n) => (
              <li key={n.id} className="px-5 py-3">
                <div className="flex justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{n.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(n.created_at)}</span>
                </div>
                {n.body && <p className="mt-0.5 text-sm text-ink-soft">{n.body}</p>}
              </li>
            ))}
            {data.notifications.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">No payment notifications yet.</li>
            )}
          </ul>
        </Section>
      </div>

      {paying && <MarkPaidModal w={paying} onClose={() => setPaying(null)} onDone={done} />}
      {failing && <CantPayModal w={failing} onClose={() => setFailing(null)} onDone={done} />}
      {recording && (
        <CreatePayoutModal
          creator={{ ...profile, available_shown: balance.available_shown }}
          feeRate={balance.fee_rate}
          onClose={() => setRecording(false)}
          onDone={() => {
            setRecording(false)
            reload()
          }}
        />
      )}
      {opened && (
        <WithdrawalDrawer
          w={opened}
          notifications={data.notifications.map((n) => ({ ...n, user_id: profile.user_id, role: 'creator', email: profile.email }))}
          events={[]}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}
