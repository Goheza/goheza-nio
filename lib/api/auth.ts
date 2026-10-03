import { supabase } from '@/lib/supabase'
import { isBrandOnboardingComplete } from '@/lib/api/brand-onboarding'
import { isCreatorOnboardingComplete } from '@/lib/api/creator-onboarding'

export type ResolvedRole = 'admin' | 'brand' | 'creator' | null

export async function resolveUserRole(userId: string): Promise<ResolvedRole> {
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
    return null
}

export type ResolvedDashboardRoute = {
    route: string
    type: 'brand' | 'creator' | 'admin' | null
}

export async function resolveDashboardRoute(userId: string): Promise<ResolvedDashboardRoute> {
    const role = await resolveUserRole(userId)

    if (role === 'admin') {
        return { route: '/app/admin', type: 'admin' }
    }

    if (role === 'brand') {
        const { data: profile } = await supabase
            .from('brand_profiles')
            .select('brand_name, country, goals')
            .eq('user_id', userId)
            .maybeSingle()
        return {
            route: isBrandOnboardingComplete(profile) ? '/app/brand' : '/app/onboarding/brand',
            type: 'brand',
        }
    }

    if (role === 'creator') {
        const { data: profile } = await supabase
            .from('creator_profiles')
            .select('display_name, username, country, has_payment_details')
            .eq('user_id', userId)
            .maybeSingle()
        return {
            route: isCreatorOnboardingComplete(profile) ? '/app/creator' : '/app/onboarding/creator',
            type: 'creator',
        }
    }

    // No profile of any kind — shouldn't normally happen, send them to log in.
    return { route: '/app/auth/login', type: null }
}

export async function loginWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.user
}

export async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/app/auth/callback` },
    })
    if (error) throw error
}

export async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/app/auth/reset-password`,
    })
    if (error) throw error
}

// Called on /app/auth/reset-password once Supabase has established a
// recovery session from the emailed link.
export async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
}
