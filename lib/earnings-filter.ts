import type { CreatorEarningsByBrand } from '@/types/earnings'

// Re-derives brand/campaign roll-ups from the raw entries after filtering
// by date, rather than trusting the pre-aggregated totals from the API —
// those totals are lifetime and don't know about the selected period.
export function filterEarningsTree(
    brands: CreatorEarningsByBrand[],
    from: Date | null,
    to: Date
): CreatorEarningsByBrand[] {
    const result: CreatorEarningsByBrand[] = []

    for (const brand of brands) {
        const campaigns = []

        for (const campaign of brand.campaigns) {
            const entries = campaign.entries.filter((e) => {
                const created = new Date(e.createdAt)
                if (from && created < from) return false
                if (created > to) return false
                return true
            })
            if (entries.length === 0) continue

            campaigns.push({
                ...campaign,
                entries,
                totalNet: entries.reduce((s, e) => s + e.netAmount, 0),
                totalViews: entries.reduce((s, e) => s + e.viewsCounted, 0),
            })
        }

        if (campaigns.length === 0) continue

        result.push({
            ...brand,
            campaigns,
            totalNet: campaigns.reduce((s, c) => s + c.totalNet, 0),
            totalViews: campaigns.reduce((s, c) => s + c.totalViews, 0),
        })
    }

    return result.sort((a, b) => b.totalNet - a.totalNet)
}
