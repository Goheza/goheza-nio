import { supabase } from '@/lib/supabase'

export type AdminRefreshResult = {
    synced: number
    errors: string[]
}

/**
 * Triggers a live TikTok pull for a campaign, as an admin — works for any
 * campaign regardless of which brand owns it. Runs server-side (see
 * /api/admin/analytics/refresh), gated on the caller having a row in the
 * admins table.
 */
export async function refreshCampaignAnalyticsAsAdmin(campaignId: string): Promise<AdminRefreshResult> {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
    if (sessionErr) throw sessionErr
    const accessToken = sessionData.session?.access_token
    if (!accessToken) throw new Error('Not signed in.')

    const res = await fetch('/api/admin/analytics/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ campaignId }),
    })
    const data = await res.json()

    if (!res.ok) {
        throw new Error(data?.error || 'Failed to refresh analytics.')
    }

    return { synced: data.synced ?? 0, errors: data.errors ?? [] }
}