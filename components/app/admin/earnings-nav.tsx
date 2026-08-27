'use client'

import { ChevronRight, Building2, Layers, User } from 'lucide-react'
import type { AdminBrandSummary, AdminCampaignSummary, AdminCreatorSummary } from '@/types/admin-earnings'

function formatMoney(n: number) {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n)
}

export function AdminEarningsBreadcrumb({
    brand,
    campaign,
    creator,
    onReset,
    onSelectBrand,
    onSelectCampaign,
}: {
    brand: AdminBrandSummary | null
    campaign: AdminCampaignSummary | null
    creator: AdminCreatorSummary | null
    onReset: () => void
    onSelectBrand: () => void
    onSelectCampaign: () => void
}) {
    return (
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className={brand ? 'cursor-pointer text-ink-soft hover:underline' : 'text-ink'} onClick={onReset}>
                Brands
            </span>
            {brand && (
                <>
                    <ChevronRight className="h-3 w-3 text-ink-soft" />
                    <span
                        className={campaign ? 'cursor-pointer text-ink-soft hover:underline' : 'text-ink'}
                        onClick={onSelectBrand}
                    >
                        {brand.brandName}
                    </span>
                </>
            )}
            {campaign && (
                <>
                    <ChevronRight className="h-3 w-3 text-ink-soft" />
                    <span
                        className={creator ? 'cursor-pointer text-ink-soft hover:underline' : 'text-ink'}
                        onClick={onSelectCampaign}
                    >
                        {campaign.campaignName}
                    </span>
                </>
            )}
            {creator && (
                <>
                    <ChevronRight className="h-3 w-3 text-ink-soft" />
                    <span className="text-ink">{creator.creatorName}</span>
                </>
            )}
        </div>
    )
}

export function AdminBrandGrid({
    brands,
    onSelect,
}: {
    brands: AdminBrandSummary[]
    onSelect: (b: AdminBrandSummary) => void
}) {
    if (brands.length === 0) {
        return (
            <div className="rounded-2xl border border-hairline bg-background p-8 text-center text-sm text-muted-foreground">
                No earnings recorded yet.
            </div>
        )
    }
    return (
        <div className="grid gap-3">
            {brands.map((b) => (
                <div
                    key={b.brandUserId}
                    onClick={() => onSelect(b)}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-hairline bg-background p-4 hover:bg-ink/[0.02]"
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
                                {b.campaigns.length} campaign{b.campaigns.length !== 1 ? 's' : ''}
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

export function AdminCampaignGrid({
    brand,
    onSelect,
}: {
    brand: AdminBrandSummary
    onSelect: (c: AdminCampaignSummary) => void
}) {
    if (brand.campaigns.length === 0) {
        return (
            <div className="rounded-2xl border border-hairline bg-background p-8 text-center text-sm text-muted-foreground">
                No campaigns here.
            </div>
        )
    }
    return (
        <div className="grid gap-3">
            {brand.campaigns.map((c) => (
                <div
                    key={c.campaignId}
                    onClick={() => onSelect(c)}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-hairline bg-background p-4 hover:bg-ink/[0.02]"
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
                            <p className="text-xs text-muted-foreground">
                                {c.creators.length} creator{c.creators.length !== 1 ? 's' : ''}
                            </p>
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

export function AdminCreatorGrid({
    campaign,
    onSelect,
    onSettle,
}: {
    campaign: AdminCampaignSummary
    onSelect: (c: AdminCreatorSummary) => void
    onSettle: (c: AdminCreatorSummary) => void
}) {
    if (campaign.creators.length === 0) {
        return (
            <div className="rounded-2xl border border-hairline bg-background p-8 text-center text-sm text-muted-foreground">
                No creators here.
            </div>
        )
    }
    return (
        <div className="grid gap-3">
            {campaign.creators.map((c) => (
                <div
                    key={c.creatorId}
                    className="flex items-center justify-between rounded-2xl border border-hairline bg-background p-4"
                >
                    <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-3" onClick={() => onSelect(c)}>
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink/5 text-ink">
                            <User className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{c.creatorName}</p>
                            <p className="text-xs text-muted-foreground">
                                {c.totalViews.toLocaleString()} views · accruing {formatMoney(c.accruingNet)} · paid{' '}
                                {formatMoney(c.paidNet)}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        <p className="font-display text-sm font-semibold text-ink">{formatMoney(c.totalNet)}</p>
                        <button
                            onClick={() => onSettle(c)}
                            className="rounded-full border border-hairline bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5"
                        >
                            Settle Manually
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}

export function AdminCreatorEntryList({ creator }: { creator: AdminCreatorSummary }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-elevated">
            <div className="grid grid-cols-3 gap-3 border-b border-hairline p-4 sm:grid-cols-4">
                <MiniStat label="Accruing" value={formatMoney(creator.accruingNet)} />
                <MiniStat label="Settled" value={formatMoney(creator.settledNet)} />
                <MiniStat label="Paid" value={formatMoney(creator.paidNet)} />
                <MiniStat label="Total Views" value={creator.totalViews.toLocaleString()} />
            </div>
            <ul className="divide-y divide-hairline">
                {creator.entries.map((e) => (
                    <li key={e.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
                        <div>
                            <p className="font-medium text-ink">{e.viewsCounted.toLocaleString()} views</p>
                            <p className="text-xs text-muted-foreground">
                                {new Date(e.createdAt).toLocaleDateString()}
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
    )
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="font-display mt-1 text-sm font-semibold text-ink">{value}</p>
        </div>
    )
}
