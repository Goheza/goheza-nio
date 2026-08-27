'use client'

import { ArrowLeft, ChevronRight } from 'lucide-react'
import { BrandAvatar } from '@/components/app/creator/dash-ui'
import type { CreatorEarningsByBrand, CreatorEarningsByCampaign } from '@/types/earnings'

export type DrillState =
    | { level: 'brands' }
    | { level: 'campaigns'; brand: CreatorEarningsByBrand }
    | { level: 'detail'; brand: CreatorEarningsByBrand; campaign: CreatorEarningsByCampaign }

function formatMoney(n: number) {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n)
}

export function DrillHeader({
    drill,
    onNavigate,
    title,
}: {
    drill: DrillState
    onNavigate: (target: DrillState) => void
    title: string
}) {
    if (drill.level === 'brands') {
        return <p className="text-sm font-semibold text-ink">{title}</p>
    }
    if (drill.level === 'campaigns') {
        return (
            <button
                onClick={() => onNavigate({ level: 'brands' })}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-primary"
            >
                <ArrowLeft className="h-4 w-4" /> {drill.brand.brandName}
            </button>
        )
    }
    return (
        <button
            onClick={() => onNavigate({ level: 'campaigns', brand: drill.brand })}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-primary"
        >
            <ArrowLeft className="h-4 w-4" /> {drill.campaign.campaignName}
        </button>
    )
}

export function BrandList({
    brands,
    onSelect,
}: {
    brands: CreatorEarningsByBrand[]
    onSelect: (b: CreatorEarningsByBrand) => void
}) {
    if (brands.length === 0) {
        return <p className="py-8 text-center text-sm text-muted-foreground">No activity in this period.</p>
    }
    return (
        <ul className="divide-y divide-hairline">
            {brands.map((b) => (
                <li key={b.brandUserId}>
                    <button
                        onClick={() => onSelect(b)}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-ink/5"
                    >
                        <BrandAvatar
                            initial={(b.brandName ?? '?').slice(0, 1).toUpperCase()}
                            color="oklch(0.66 0.20 42)"
                            size={40}
                        />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">{b.brandName}</p>
                            <p className="text-xs text-muted-foreground">
                                {b.campaigns.length} campaign{b.campaigns.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <p className="shrink-0 font-display text-sm font-semibold text-ink">
                            {formatMoney(b.totalNet)}
                        </p>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                </li>
            ))}
        </ul>
    )
}

export function CampaignList({
    brand,
    onSelect,
}: {
    brand: CreatorEarningsByBrand
    onSelect: (c: CreatorEarningsByCampaign) => void
}) {
    if (brand.campaigns.length === 0) {
        return <p className="py-8 text-center text-sm text-muted-foreground">No campaigns in this period.</p>
    }
    return (
        <ul className="divide-y divide-hairline">
            {brand.campaigns.map((c) => (
                <li key={c.campaignId}>
                    <button
                        onClick={() => onSelect(c)}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-ink/5"
                    >
                        {c.campaignCover ? (
                            <img src={c.campaignCover} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                        ) : (
                            <div className="h-10 w-14 shrink-0 rounded-lg bg-ink/5" />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">{c.campaignName}</p>
                            <p className="text-xs text-muted-foreground">{c.totalViews.toLocaleString()} views</p>
                        </div>
                        <p className="shrink-0 font-display text-sm font-semibold text-ink">
                            {formatMoney(c.totalNet)}
                        </p>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                </li>
            ))}
        </ul>
    )
}

export function EarningsDetail({ campaign }: { campaign: CreatorEarningsByCampaign }) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-hairline bg-background p-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Total Views
                    </p>
                    <p className="font-display mt-1 text-lg font-semibold text-ink">
                        {campaign.totalViews.toLocaleString()}
                    </p>
                </div>
                <div className="rounded-xl border border-hairline bg-background p-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Net Earnings
                    </p>
                    <p className="font-display mt-1 text-lg font-semibold text-ink">{formatMoney(campaign.totalNet)}</p>
                </div>
            </div>
            <ul className="divide-y divide-hairline">
                {campaign.entries.map((e) => (
                    <li key={e.id} className="flex items-center justify-between py-3 text-sm">
                        <div>
                            <p className="font-medium text-ink">{e.viewsCounted.toLocaleString()} views</p>
                            <p className="text-xs text-muted-foreground">
                                {new Date(e.createdAt).toLocaleDateString()} · gross {formatMoney(e.grossAmount)} · fee{' '}
                                {formatMoney(e.platformFee)}
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
