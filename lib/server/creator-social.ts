import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

export async function getTikTokAccountByUserId(userId: string) {
    const supabaseAdmin = getSupabaseAdmin()
    const { data } = await supabaseAdmin
        .from('creator_social_accounts')
        .select('access_token, refresh_token, token_expires_at, open_id, business_id')
        .eq('user_id', userId)
        .eq('platform', 'tiktok')
        .maybeSingle()
    return data
}