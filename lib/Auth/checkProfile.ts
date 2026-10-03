import { supabase } from '../supabase'



export async function getProfile(userId: string) {
    const [{ data: admin }, { data: brand }, { data: creator }] = await Promise.all([
        supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle(),
        supabase.from('brand_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
        supabase.from('creator_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
    ])

    // Admin always takes priority, even if the same user also has a brand or
    // creator profile — staff should land in the admin dashboard, not get
    // routed into a brand/creator onboarding flow.
    if (admin) return 'admin'
    if (brand) return 'brand'
    if (creator) return 'creator'
}
