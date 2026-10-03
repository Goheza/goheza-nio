import type { CreatorEarningEntry } from '@/types/earnings'

export type PaymentTrigger = 'required_views' | 'weekly' | 'monthly' | 'campaign_end'

const VIEW_FLOOR = 1000
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

export function isViewEligible(entry: { viewsCounted: number }): boolean {
    return entry.viewsCounted >= VIEW_FLOOR
}

// campaignInfo only needed for the campaign_end trigger — pass what you have.
export function isMatured(
    entry: { viewsCounted: number; createdAt: string },
    trigger: PaymentTrigger | null,
    campaign?: { status: string; liveEndsAt: string | null }
): boolean {
    if (!isViewEligible(entry)) return false

    const effectiveTrigger = trigger ?? 'required_views'
    const ageMs = Date.now() - new Date(entry.createdAt).getTime()

    switch (effectiveTrigger) {
        case 'required_views':
            return true
        case 'weekly':
            return ageMs >= WEEK_MS
        case 'monthly':
            return ageMs >= MONTH_MS
        case 'campaign_end':
            if (!campaign) return false
            if (campaign.status === 'completed') return true
            if (campaign.liveEndsAt && new Date(campaign.liveEndsAt).getTime() < Date.now()) return true
            return false
    }
}
