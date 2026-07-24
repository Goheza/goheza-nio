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


  if(admin && brand) {
      /**
       * This case its a brand with admin rights
       */

      return 'admin'
  }

  if (brand) return 'brand'
  if (creator) return 'creator'
  return null;
}

export async function resolveDashboardRoute(userId: string): Promise<string> {
  const role = await resolveUserRole(userId)

  if (role === 'admin') return '/admin'

  if (role === 'brand') {
    const { data: profile } = await supabase
      .from('brand_profiles')
      .select('brand_name, country, goals')
      .eq('user_id', userId)
      .maybeSingle()
    return isBrandOnboardingComplete(profile) ? '/brand' : '/onboarding/brand'
  }

  if (role === 'creator') {
    const { data: profile } = await supabase
      .from('creator_profiles')
      .select('display_name, username, has_payment_details')
      .eq('user_id', userId)
      .maybeSingle()
    return isCreatorOnboardingComplete(profile) ? '/creator' : '/onboarding/creator'
  }

  // No profile of any kind — shouldn't normally happen, send them to sign up.
  return '/app/auth/login'
}

export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw error
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
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