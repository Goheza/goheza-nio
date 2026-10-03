'use client'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, Wallet as WalletIcon, X } from 'lucide-react'
import { DashCard, PageHeader, StatCard } from '@/components/app/creator/dash-ui'
import { EarningsBreadcrumb, BrandGrid, CampaignGrid, CampaignEarningsDetail } from '@/components/app/creator/earning-nav'
import { supabase } from '@/lib/supabase'
import { getEarningsByBrand } from '@/lib/api/creator-earnings'
import { getWalletSnapshot, requestWithdrawal } from '@/lib/api/creator-wallet'
import type { CreatorEarningsByBrand, CreatorEarningsByCampaign } from '@/types/earnings'
import type { CreatorWalletSnapshot } from '@/types/creator-wallet'
import { DevelopmentNotice } from '@/components/app/developmentNotice'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n)
}

export default function WalletPage() {
  const [brands, setBrands] = useState<CreatorEarningsByBrand[] | null>(null)
  const [wallet, setWallet] = useState<CreatorWalletSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  const [selectedBrand, setSelectedBrand] = useState<CreatorEarningsByBrand | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<CreatorEarningsByCampaign | null>(null)

  async function load() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) throw new Error('Not signed in.')
    const [b, w] = await Promise.all([getEarningsByBrand(userData.user.id), getWalletSnapshot(userData.user.id)])
    setBrands(b)
    setWallet(w)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await load()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load wallet.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    setError(null)
    try {
      await load()
      setLastRefreshed(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh wallet.')
    } finally {
      setRefreshing(false)
    }
  }

  const liveBrand = selectedBrand ? brands?.find((b) => b.brandUserId === selectedBrand.brandUserId) ?? null : null
  const liveCampaign =
    liveBrand && selectedCampaign ? liveBrand.campaigns.find((c) => c.campaignId === selectedCampaign.campaignId) ?? null : null

  if (error) return <DashCard className="text-center text-sm text-muted-foreground">{error}</DashCard>
  if (!brands || !wallet) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DevelopmentNotice/>
      <PageHeader title="Wallet" subtitle="Where your earnings come from, and what's ready to withdraw." />

      <DashCard className="overflow-hidden bg-gradient-to-br from-[oklch(0.97_0.04_55)] to-surface-elevated">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-glow" style={{ backgroundImage: 'var(--gradient-primary)' }}>
              <WalletIcon className="h-5 w-5 text-primary-foreground" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Available Balance</p>
              <p className="font-display text-2xl font-semibold text-ink">{formatMoney(wallet.availableBalance)}</p>
            </div>
          </div>
          <button
            onClick={() => setWithdrawOpen(true)}
            disabled={wallet.availableBalance <= 0}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Withdraw
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <WalletStat label="Pending Balance" value={formatMoney(wallet.pendingBalance)} />
          <WalletStat label="Total Withdrawn" value={formatMoney(wallet.totalWithdrawn)} />
          <WalletStat
            label="Last Withdrawal"
            value={
              wallet.recentWithdrawals[0]
                ? `${formatMoney(wallet.recentWithdrawals[0].amount)} · ${new Date(wallet.recentWithdrawals[0].requestedAt).toLocaleDateString()}`
                : '—'
            }
          />
        </div>
      </DashCard>

      {wallet.recentWithdrawals.length > 0 && (
        <DashCard>
          <p className="text-sm font-semibold text-ink">Withdrawal History</p>
          <ul className="mt-3 divide-y divide-hairline">
            {wallet.recentWithdrawals.map((w) => (
              <li key={w.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{formatMoney(w.amount)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(w.requestedAt).toLocaleDateString()}</p>
                </div>
                <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {w.status}
                </span>
              </li>
            ))}
          </ul>
        </DashCard>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <EarningsBreadcrumb
          brand={liveBrand}
          campaign={liveCampaign}
          onReset={() => {
            setSelectedBrand(null)
            setSelectedCampaign(null)
          }}
          onSelectBrand={() => setSelectedCampaign(null)}
        />
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="rounded-lg border border-hairline bg-background px-3 py-2 text-xs text-muted-foreground">
              Updated {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-hairline bg-background px-4 py-2 text-sm font-medium text-ink shadow-sm hover:bg-ink/5 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {!liveBrand && <BrandGrid brands={brands} onSelect={setSelectedBrand} />}
      {liveBrand && !liveCampaign && <CampaignGrid brand={liveBrand} onSelect={setSelectedCampaign} />}
      {liveCampaign && <CampaignEarningsDetail campaign={liveCampaign} />}

      {withdrawOpen && (
        <WithdrawModal
          availableBalance={wallet.availableBalance}
          onClose={() => setWithdrawOpen(false)}
          onConfirm={async (amount) => {
            const {
              data: { user },
            } = await supabase.auth.getUser()
            if (!user) throw new Error('Not signed in.')
            await requestWithdrawal(user.id, amount)
            await load()
            setWithdrawOpen(false)
          }}
        />
      )}
    </div>
  )
}

function WalletStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-elevated/80 p-3 backdrop-blur-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-base font-semibold text-ink">{value}</p>
    </div>
  )
}

function WithdrawModal({
  availableBalance,
  onClose,
  onConfirm,
}: {
  availableBalance: number
  onClose: () => void
  onConfirm: (amount: number) => Promise<void>
}) {
  const [amount, setAmount] = useState(String(availableBalance))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface-elevated shadow-card">
        <div className="flex items-center justify-between border-b border-hairline p-5">
          <p className="font-display text-lg font-semibold text-ink">Request Withdrawal</p>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Amount (UGX)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            max={availableBalance}
            min={0}
            className="w-full rounded-xl border border-hairline bg-background px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-xs text-muted-foreground">Available: {formatMoney(availableBalance)}</p>
          <p className="text-xs text-muted-foreground">Your request will be reviewed and processed by the Goheza team.</p>
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
                await onConfirm(Number(amount))
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to submit request.')
              } finally {
                setSubmitting(false)
              }
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
            style={{ backgroundImage: 'var(--gradient-primary)' }}
          >
            {submitting ? 'Submitting…' : 'Confirm Withdrawal'}
          </button>
        </div>
      </div>
    </div>
  )
}