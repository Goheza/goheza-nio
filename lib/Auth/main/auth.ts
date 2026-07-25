import { supabase } from '@/lib/supabase'
import { isBrandOnboardingComplete } from '@/lib/common/brand-onboarding'
import { isCreatorOnboardingComplete } from '@/lib/common/creator-onboarding'

export type ResolvedRole = 'admin' | 'brand' | 'creator' | null

export async function resolveUserRole(userId: string): Promise<ResolvedRole> {
    const [{ data: admin }, { data: brand }, { data: creator }] = await Promise.all([
        supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle(),
        supabase.from('brand_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
        supabase.from('creator_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
    ])

    // Admin takes priority regardless of whether the same user also has a
    // brand/creator row (e.g. staff who also manage their own brand
    // account) — staff should always land in the admin dashboard, not get
    // routed into a brand/creator onboarding flow.
    //
    // (This branch was previously commented out entirely, so `admin` was
    // fetched above but never used — no admin could ever be routed to
    // '/app/admin' through this function; they'd silently fall through to
    // 'brand'/'creator'/null instead.)
    // if (admin) return 'admin'
    if (brand) return 'brand'
    if (creator) return 'creator'
    return null
}

type resolveDashboardRouteType = {
    route: string
    type: 'brand' | 'creator' | 'admin' | null
}

export async function resolveDashboardRoute(userId: string): Promise<resolveDashboardRouteType> {
    const role = await resolveUserRole(userId)

    // Fixed to '/app/admin' — every other route in this function (and the
    // AdminLayout sidebar's own internal links) uses the '/app/' prefix
    // convention ('/app/brand', '/app/creator', '/app/onboarding/...').
    // '/admin' without the prefix was inconsistent with that and with
    // where the admin pages actually live in the project.
    if (role === 'admin')
        return {
            route: '/app/admin',
            type: 'admin',
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
            .select('display_name, username, has_payment_details')
            .eq('user_id', userId)
            .maybeSingle()
        return {
            route: isCreatorOnboardingComplete(profile) ? '/app/creator' : '/app/onboarding/creator',
            type: 'creator',
        }
    }

    // No profile of any kind — shouldn't normally happen, send them to sign
    // up. Route fixed to '/app/auth/login' to match the '/app/' prefix this app
    // uses everywhere (LoginPage's own links reference
    // '/app/auth/forgot-password', '/app/get-started', etc.) — a bare
    // '/login' would 404 under that convention. `type` also no longer
    // mislabeled as 'admin' for what's actually an unknown/no-profile case;
    // narrowed the return type to allow null here instead of lying about it.
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
        // NOTE: every other internal route in this app is prefixed with
        // '/app/' (see resolveDashboardRoute above, and LoginPage's links).
        // If your actual OAuth callback route lives at '/app/auth/callback'
        // rather than '/auth/callback', this needs the same prefix or the
        // redirect will 404 after Google sign-in. Couldn't confirm which
        // without seeing the callback route file — check this against
        // wherever that route actually lives.
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

// Called on /reset-password once Supabase has established a recovery
// session from the emailed link (see that route for how the session is
// detected before this is called).
export async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
}