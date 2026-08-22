import { supabaseAdmin } from '@/lib/supabase-admin'

export type CreatorSocialAccountWithName = {
    user_id: string
    platform: string
    status: string
    token_status: string | null
    external_username: string | null
    token_expires_at: string | null
    last_token_refresh_at: string | null
    creatorName: string
}

/**
 * Every creator_social_accounts row, joined (in JS — no FK between the two
 * tables) with creator_profiles for a human-readable name. Optionally
 * scoped to one platform.
 */
export async function getCreatorSocialAccountsWithNames(platform?: string): Promise<CreatorSocialAccountWithName[]> {
    let query = supabaseAdmin
        .from('creator_social_accounts')
        .select('user_id, platform, status, token_status, external_username, token_expires_at, last_token_refresh_at')

    if (platform) query = query.eq('platform', platform)

    const { data: accounts, error } = await query
    if (error) throw error
    if (!accounts || accounts.length === 0) return []

    const nameByUser = await getCreatorNamesByUserIds([...new Set(accounts.map((a) => a.user_id))])

    return accounts.map((a) => ({
        ...a,
        creatorName: nameByUser.get(a.user_id) ?? 'Unknown creator',
    }))
}

/**
 * Convenience lookup for when you already have a list of user ids (e.g.
 * resolving a batch of UUIDs from a script's output into names) and don't
 * need the full account rows.
 */
export async function getCreatorNamesByUserIds(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map()

    const { data: profiles, error } = await supabaseAdmin
        .from('creator_profiles')
        .select('user_id, display_name, full_name')
        .in('user_id', userIds)
    if (error) throw error

    return new Map((profiles ?? []).map((p) => [p.user_id, p.full_name ?? 'Unknown creator']))
}