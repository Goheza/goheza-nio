import { supabase } from '@/lib/supabase'

export type CreatorStatusFilter = 'all' | 'active' | 'suspended'

export type AdminCreatorRow = {
    id: string
    user_id: string
    full_name: string
    display_name: string | null
    username: string | null
    email: string
    avatar_url: string | null
    country: string | null
    city: string | null
    content_niches: string[]
    account_status: 'active' | 'suspended'
    has_tiktok_connected: boolean
    created_at: string
    suspended_by: string | null
    suspended_at: string | null
    suspension_reason: string | null
    platforms: string[]
}

export async function listCreators(filter: CreatorStatusFilter, search: string): Promise<AdminCreatorRow[]> {
    let query = supabase
        .from('creator_profiles')
        .select(
            `id, user_id, full_name, display_name, username, email, avatar_url, country, city,
       content_niches, account_status, has_tiktok_connected, created_at,
       suspended_by, suspended_at, suspension_reason`
        )
        .order('created_at', { ascending: false })

    if (filter !== 'all') {
        query = query.eq('account_status', filter)
    }

    if (search.trim()) {
        query = query.or(
            `full_name.ilike.%${search}%,display_name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`
        )
    }

    const { data: creators, error } = await query

    if (error) throw error

    const userIds = creators?.map((c) => c.user_id) ?? []

    const { data: socials, error: socialError } = await supabase
        .from('creator_social_accounts')
        .select('user_id, platform')
        .in('user_id', userIds)

    if (socialError) throw socialError

    return (creators ?? []).map((creator) => ({
        ...creator,
        platforms: (socials ?? []).filter((s) => s.user_id === creator.user_id).map((s) => s.platform),
    })) as AdminCreatorRow[]
}

export async function suspendCreator(creatorUserId: string, adminUserId: string, reason: string) {
    const { error } = await supabase
        .from('creator_profiles')
        .update({
            account_status: 'suspended',
            suspended_by: adminUserId,
            suspended_at: new Date().toISOString(),
            suspension_reason: reason,
        })
        .eq('user_id', creatorUserId)
    if (error) throw error
}

export async function reinstateCreator(creatorUserId: string) {
    const { error } = await supabase
        .from('creator_profiles')
        .update({
            account_status: 'active',
            suspended_by: null,
            suspended_at: null,
            suspension_reason: null,
        })
        .eq('user_id', creatorUserId)
    if (error) throw error
}
