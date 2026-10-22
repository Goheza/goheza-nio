'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, RefreshCw, Search } from 'lucide-react'
import {
  formatMoney,
  getDispatchStatus,
  getPayoutsOverview,
  isFullAdmin,
  setAutoPayouts,
  type AdminWallet,
  type DispatchStatus,
  type AdminWithdrawal,
  type PayoutsOverview,
} from '@/lib/api/admin-payouts'
import { CantPayModal, CreatePayoutModal, MarkPaidModal, PickCreatorModal } from '@/components/app/admin/payouts/action-modals'
import { AutomaticTab, HistoryTab, ToPayTab, WalletsTab, WithdrawalDrawer } from '@/components/app/admin/payouts/tabs'
import { ErrorText, buttonPrimary } from '@/components/app/admin/payouts/shared'

const REFRESH_MS = 20_000
type Tab = 'to_pay' | 'automatic' | 'history' | 'wallets'

function Stat({
  label,
  value,
  sub,
  tone = 'plain',
  onClick,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'plain' | 'warn' | 'danger'
  onClick?: () => void
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-[oklch(0.8_0.1_25)] bg-[oklch(0.98_0.02_25)]'
      : tone === 'warn'
        ? 'border-[oklch(0.85_0.10_55)] bg-[oklch(0.98_0.04_55)]'
        : 'border-hairline bg-surface-elevated'
  return (
    <button onClick={onClick} className={`rounded-2xl border p-4 text-left transition-colors hover:bg-ink/[0.02] ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </button>
  )
}

export default function AdminPayoutsPage() {
  const [tab, setTab] = useState<Tab>('to_pay')
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [data, setData] = useState<PayoutsOverview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const [paying, setPaying] = useState<AdminWithdrawal | null>(null)
  const [failing, setFailing] = useState<AdminWithdrawal | null>(null)
  const [recording, setRecording] = useState<AdminWallet | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [dispatch, setDispatch] = useState<DispatchStatus>({ mode: 'fake', enabled: false })

  // Whether "Dispatch payment" works: only when KaCyber is live.
  useEffect(() => {
    let cancelled = false
    getDispatchStatus().then((d) => {
      if (!cancelled) setDispatch(d)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // ?pay=<creatorId> (from Earnings → Record payout) opens the payout form
  // for that creator once their wallet has loaded.
  const payFor = useRef<string | null>(
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('pay'),
  )

  const reload = () => {
    setRefreshing(true)
    setReloadKey((k) => k + 1)
  }

  // Loads on search and after every action, then every 20 seconds so new
  // requests and automatic payouts show up without reloading the page.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const overview = await getPayoutsOverview(applied)
        if (cancelled) return
        setData(overview)
        setLoadError(null)
        if (payFor.current) {
          const wallet = overview.wallets.find((w) => w.user_id === payFor.current)
          payFor.current = null
          window.history.replaceState(null, '', window.location.pathname)
          if (wallet) {
            setTab('wallets')
            setRecording(wallet)
          } else {
            setActionError('That creator has no wallet activity to pay out.')
          }
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load payouts.')
      } finally {
        if (!cancelled) setRefreshing(false)
      }
    }
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [applied, reloadKey])

  if (!data) {
    return loadError ? (
      <p className="py-10 text-center text-sm text-muted-foreground">{loadError}</p>
    ) : (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
      </div>
    )
  }

  const { stats, config, viewer } = data
  const feeRate = Number(config.withdraw_platform_fee_rate ?? 0.15)
  const autoOn = config.kacyber_auto_payouts === 'on'
  const opened = data.withdrawals.find((w) => w.id === openId) ?? null
  const done = () => {
    setPaying(null)
    setFailing(null)
    setActionError(null)
    reload()
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'to_pay', label: 'To pay', count: stats.to_pay_count },
    { key: 'automatic', label: 'Automatic', count: stats.auto_issues || undefined },
    { key: 'history', label: 'History' },
    { key: 'wallets', label: 'Creator balances' },
  ]

  async function toggleAuto() {
    const next = !autoOn
    const ok = window.confirm(
      next
        ? 'Turn automatic payouts ON? Verified creators will be paid through KaCyber as soon as they withdraw.'
        : 'Turn automatic payouts OFF? New withdrawals from verified creators will go to the manual "To pay" queue.',
    )
    if (!ok) return
    setSwitching(true)
    try {
      await setAutoPayouts(next)
      reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to change automatic payouts.')
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Payouts</h1>
          <p className="text-sm text-muted-foreground">Pay creators, record payouts and follow automatic transfers.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={isFullAdmin(viewer) ? toggleAuto : undefined}
            disabled={switching || !isFullAdmin(viewer)}
            title={isFullAdmin(viewer) ? 'Switch automatic payouts' : 'Only full admins can switch this'}
            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink disabled:cursor-default"
          >
            <span className={`h-2 w-2 rounded-full ${autoOn ? 'bg-[oklch(0.65_0.16_150)]' : 'bg-ink/30'}`} />
            Automatic payouts {autoOn ? 'on' : 'off'}
          </button>
          {dispatch.mode === 'fake' && (
            <span
              title="KACYBER_MODE is fake: automatic payouts are simulated and no real money moves."
              className="rounded-full bg-[oklch(0.96_0.06_85)] px-3 py-1.5 text-[11px] font-bold uppercase text-[oklch(0.45_0.12_70)]"
            >
              Test mode · no real money
            </span>
          )}
          <button onClick={() => setPicking(true)} className={`${buttonPrimary} py-1.5 text-xs`}>
            Record a payout
          </button>
          <button onClick={reload} aria-label="Refresh" className="grid h-8 w-8 place-items-center rounded-full border border-hairline bg-background hover:bg-ink/5">
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="To pay now"
          value={String(stats.to_pay_count)}
          sub={`${formatMoney(stats.to_pay_total)} to send`}
          tone={stats.to_pay_count > 0 ? 'warn' : 'plain'}
          onClick={() => setTab('to_pay')}
        />
        <Stat
          label="Overdue (24h)"
          value={String(stats.overdue_count)}
          sub={stats.overdue_count > 0 ? 'Past the 24-hour promise' : 'All on time'}
          tone={stats.overdue_count > 0 ? 'danger' : 'plain'}
          onClick={() => setTab('to_pay')}
        />
        <Stat
          label="Paid today"
          value={String(stats.paid_today_count)}
          sub={formatMoney(stats.paid_today_total)}
          onClick={() => setTab('history')}
        />
        <Stat
          label="Automatic issues"
          value={String(stats.auto_issues)}
          sub={stats.auto_issues > 0 ? 'Need a look' : 'None'}
          tone={stats.auto_issues > 0 ? 'danger' : 'plain'}
          onClick={() => setTab('automatic')}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-hairline bg-background p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === t.key ? 'text-primary-foreground shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
              style={tab === t.key ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
            >
              {t.label}
              {t.count ? <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-xs">{t.count}</span> : null}
            </button>
          ))}
        </div>
        <form
          className="relative w-full max-w-xs"
          onSubmit={(e) => {
            e.preventDefault()
            setApplied(search)
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              if (!e.target.value) setApplied('')
            }}
            placeholder="Find a creator (name or email)"
            className="w-full rounded-full border border-hairline bg-background py-2 pl-9 pr-4 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </form>
      </div>

      {applied && (
        <p className="text-sm text-ink-soft">
          Showing <span className="font-semibold text-ink">{applied}</span>.{' '}
          <button
            onClick={() => {
              setSearch('')
              setApplied('')
            }}
            className="font-semibold text-primary hover:underline"
          >
            Show everyone
          </button>
        </p>
      )}
      <ErrorText error={actionError ?? loadError} />

      {tab === 'to_pay' && (
        <ToPayTab
          withdrawals={data.withdrawals}
          viewer={viewer}
          dispatchEnabled={dispatch.enabled}
          onMarkPaid={setPaying}
          onCantPay={setFailing}
          onOpen={(w) => setOpenId(w.id)}
          onChanged={() => {
            setActionError(null)
            reload()
          }}
          onError={setActionError}
        />
      )}
      {tab === 'automatic' && <AutomaticTab withdrawals={data.withdrawals} onOpen={(w) => setOpenId(w.id)} />}
      {tab === 'history' && <HistoryTab withdrawals={data.withdrawals} onOpen={(w) => setOpenId(w.id)} />}
      {tab === 'wallets' && (
        <WalletsTab wallets={data.wallets} withdrawals={data.withdrawals} feeRate={feeRate} onPay={setRecording} />
      )}

      {paying && <MarkPaidModal w={paying} onClose={() => setPaying(null)} onDone={done} />}
      {failing && <CantPayModal w={failing} onClose={() => setFailing(null)} onDone={done} />}
      {picking && (
        <PickCreatorModal
          onClose={() => setPicking(false)}
          onPick={(w) => {
            setPicking(false)
            setRecording(w)
          }}
        />
      )}
      {recording && (
        <CreatePayoutModal
          creator={recording}
          feeRate={feeRate}
          onClose={() => setRecording(null)}
          onDone={() => {
            setRecording(null)
            reload()
          }}
        />
      )}
      {opened && (
        <WithdrawalDrawer w={opened} notifications={data.notifications} events={data.events} onClose={() => setOpenId(null)} />
      )}
    </div>
  )
}
