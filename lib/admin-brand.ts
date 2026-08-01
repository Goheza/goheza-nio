import { supabase } from '@/lib/supabase'

export type BrandStatusFilter = 'all' | 'pending' | 'verified' | 'suspended'

export type AdminBrandRow = {
    id: string
    user_id: string
    brand_name: string | null
    brand_email: string | null
    logo_url: string | null
    country: string | null
    contact: string | null
    phone: string | null
    is_verified: boolean
    account_status: 'active' | 'suspended'
    created_at: string
    verified_by: string | null
    verified_at: string | null
    suspended_by: string | null
    suspended_at: string | null
    suspension_reason: string | null
}

export type AdminBrandDetail = AdminBrandRow & {
    website: string | null
    goals: string | null
    asset_url: string | null
}

export async function getBrandDetailForAdmin(brandUserId: string): Promise<AdminBrandDetail | null> {
    const { data, error } = await supabase.from('brand_profiles').select('*').eq('user_id', brandUserId).maybeSingle()
    if (error) throw error
    return data as AdminBrandDetail | null
}

export async function listBrands(filter: BrandStatusFilter, search: string): Promise<AdminBrandRow[]> {
    let query = supabase.from('brand_profiles').select('*').order('created_at', { ascending: false })

    if (filter === 'pending') query = query.eq('is_verified', false).eq('account_status', 'active')
    if (filter === 'verified') query = query.eq('is_verified', true).eq('account_status', 'active')
    if (filter === 'suspended') query = query.eq('account_status', 'suspended')

    if (search.trim()) {
        query = query.or(`brand_name.ilike.%${search}%,brand_email.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as AdminBrandRow[]
}

export async function verifyBrand(brandUserId: string, adminUserId: string) {
    const { error } = await supabase
        .from('brand_profiles')
        .update({
            is_verified: true,
            verified_by: adminUserId,
            verified_at: new Date().toISOString(),
        })
        .eq('user_id', brandUserId)
    if (error) throw error
}

export async function suspendBrand(brandUserId: string, adminUserId: string, reason: string) {
    const { error } = await supabase
        .from('brand_profiles')
        .update({
            account_status: 'suspended',
            suspended_by: adminUserId,
            suspended_at: new Date().toISOString(),
            suspension_reason: reason,
        })
        .eq('user_id', brandUserId)
    if (error) throw error
}

export async function reinstateBrand(brandUserId: string) {
    const { error } = await supabase
        .from('brand_profiles')
        .update({
            account_status: 'active',
            suspended_by: null,
            suspended_at: null,
            suspension_reason: null,
        })
        .eq('user_id', brandUserId)
    if (error) throw error
}

export async function getBrandProfileByUserId(brandUserId: string): Promise<AdminBrandRow | null> {
    const { data, error } = await supabase.from('brand_profiles').select('*').eq('user_id', brandUserId).maybeSingle()
    if (error) throw error
    return data as AdminBrandRow | null
}
