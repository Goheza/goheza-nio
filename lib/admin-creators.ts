import { supabase } from '@/lib/supabase'

export type CreatorStatusFilter = 'all' | 'active' | 'suspended'
export type AdminCreatorRow = {
    id: string
    user_id: string
    full_name: string
    display_name: string | null
    username: string | null
    email: string
    bio: string | null
    avatar_url: string | null
    phone: string | null
    country: string | null
    city: string | null
    sociallinks: string | null
    languages: string[]
    content_niches: string[]
    referral_source: string | null
    account_status: 'active' | 'suspended'
    has_tiktok_connected: boolean
    has_payment_details: boolean
    payment_method: string | null
    payment_account_name: string | null
    payment_account_number: string | null
    payment_bank_name: string | null
    payment_mobilemoney_name: string | null
    payment_mobilemoney_number: string | null
    payment_frequency: string | null
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
            `id, user_id, full_name, display_name, username, email, bio, avatar_url, phone,
       country, city, sociallinks, languages, content_niches, referral_source,
       account_status, has_tiktok_connected, has_payment_details, payment_method,
       payment_account_name, payment_account_number, payment_bank_name,
       payment_mobilemoney_name, payment_mobilemoney_number, payment_frequency,
       created_at, suspended_by, suspended_at, suspension_reason`
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
