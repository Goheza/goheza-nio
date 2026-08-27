'use client'

import { ChevronRight, Building2, Layers } from 'lucide-react'
import type { CreatorEarningsByBrand, CreatorEarningsByCampaign } from '@/types/earnings'
import { ViewsProgress } from '../viewsprogress'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n)
}

export function EarningsBreadcrumb({
  brand,
  campaign,
  onReset,
  onSelectBrand,
}: {
  brand: CreatorEarningsByBrand | null
  campaign: CreatorEarningsByCampaign | null
  onReset: () => void
  onSelectBrand: () => void
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold">
      <span className={brand ? 'cursor-pointer text-ink-soft hover:underline' : 'text-ink'} onClick={onReset}>
        Brands
      </span>
      {brand && (
        <>
          <ChevronRight className="h-3 w-3 text-ink-soft" />
          <span className={campaign ? 'cursor-pointer text-ink-soft hover:underline' : 'text-ink'} onClick={onSelectBrand}>
            {brand.brandName}
          </span>
        </>
      )}
      {campaign && (
        <>
          <ChevronRight className="h-3 w-3 text-ink-soft" />
          <span className="text-ink">{campaign.campaignName}</span>
        </>
      )}
    </div>
  )
}

export function BrandGrid({
  brands,
  onSelect,
}: {
  brands: CreatorEarningsByBrand[]
  onSelect: (b: CreatorEarningsByBrand) => void
}) {
  if (brands.length === 0) {
    return (
      <div className="rounded-2xl border border-hairline bg-background p-8 text-center text-sm text-muted-foreground">
        No earnings in this period.
      </div>
    )
  }
  return (
    <div className="grid gap-3">
      {brands.map((b) => (
        <div
          key={b.brandUserId}
          onClick={() => onSelect(b)}
          className="flex cursor-pointer items-center justify-between rounded-2xl border border-hairline bg-background p-4 transition-all hover:bg-ink/[0.02]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-ink/5 ring-1 ring-hairline">
              {b.brandLogoUrl ? (
                <img src={b.brandLogoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-4 w-4 text-ink-soft" />
              )}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{b.brandName}</p>
              <p className="text-xs text-muted-foreground">
                {b.campaigns.length} campaign{b.campaigns.length !== 1 ? 's' : ''} · {b.totalViews.toLocaleString()} views
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="font-display text-sm font-semibold text-ink">{formatMoney(b.totalNet)}</p>
            <ChevronRight className="h-4 w-4 text-ink-soft" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CampaignGrid({
  brand,
  onSelect,
}: {
  brand: CreatorEarningsByBrand
  onSelect: (c: CreatorEarningsByCampaign) => void
}) {
  if (brand.campaigns.length === 0) {
    return (
      <div className="rounded-2xl border border-hairline bg-background p-8 text-center text-sm text-muted-foreground">
        No campaigns in this period.
      </div>
    )
  }
  return (
    <div className="grid gap-3">
      {brand.campaigns.map((c) => (
        <div
          key={c.campaignId}
          onClick={() => onSelect(c)}
          className="flex cursor-pointer items-center justify-between rounded-2xl border border-hairline bg-background p-4 transition-all hover:bg-ink/[0.02]"
        >
          <div className="flex items-center gap-3">
            {c.campaignCover ? (
              <img src={c.campaignCover} alt="" className="h-10 w-14 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink/5 text-ink">
                <Layers className="h-4 w-4" />
              </span>
            )}
            <div>
              <p className="text-sm font-semibold text-ink">{c.campaignName}</p>
              <p className="text-xs text-muted-foreground">{c.totalViews.toLocaleString()} views</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="font-display text-sm font-semibold text-ink">{formatMoney(c.totalNet)}</p>
            <ChevronRight className="h-4 w-4 text-ink-soft" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CampaignEarningsDetail({ campaign }: { campaign: CreatorEarningsByCampaign }) {
  return (
    <div className="space-y-6">
      <ViewsProgress current={campaign.totalViews} required={campaign.requiredViews} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatBlock label="Total Views" value={campaign.totalViews.toLocaleString()} />
        <StatBlock label="Net Earnings" value={formatMoney(campaign.totalNet)} />
        <StatBlock label="Submissions" value={String(campaign.entries.length)} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-elevated">
        <div className="border-b border-hairline px-5 py-4">
          <p className="text-sm font-semibold text-ink">Earning Entries</p>
        </div>
        <ul className="divide-y divide-hairline">
          {campaign.entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
              <div>
                <p className="font-medium text-ink">{e.viewsCounted.toLocaleString()} views</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleDateString()} · gross {formatMoney(e.grossAmount)} · fee {formatMoney(e.platformFee)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-ink">{formatMoney(e.netAmount)}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{e.status}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-background p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="font-display mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  )
}