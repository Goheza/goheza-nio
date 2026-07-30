import type { CampaignType } from '@/types/campaign'

export function formatMoney(amount: number): string {
    return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        maximumFractionDigits: 0,
    }).format(amount)
}

export function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

export const CAMPAIGN_TYPE_META: Record<CampaignType, { label: string; tagline: string; comingSoon?: boolean }> = {
    creator: {
        label: 'Creator Campaign',
        tagline: 'Vetted creators produce original content promoting your brand. Pay per 1,000 verified views.',
    },
    referral: {
        label: 'Referral Campaign',
        tagline: 'Creators earn commissions when their audience completes a referral action. Flat fee per creator.',
    },
    logo: {
        label: 'Logo / Flyer Placement',
        tagline: 'Creators place your logo, flyer or visual asset inside their existing content.',
    },
    clipping: {
        label: 'Clipping Campaign',
        tagline: 'Creators repost or clip your existing content for performance-based reach.',
    },
    ambassador: {
        label: 'Ambassador Campaign',
        tagline: 'Long-term partnerships with select creators across multiple campaigns.',
        comingSoon: true,
    },
    event: {
        label: 'Event Activation',
        tagline: 'On-the-ground creator coverage and content from your events.',
        comingSoon: true,
    },
}

export const COUNTRIES = [
    'Uganda',
    'Kenya',
    'Nigeria',
    'Ghana',
    'South Africa',
    'Tanzania',
    'Rwanda',
    'Egypt',
    'United States',
    'United Kingdom',
    'Canada',
    'Other',
]
