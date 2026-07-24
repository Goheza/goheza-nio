import { supabase } from '@/lib/supabase'

export async function signUpBrandWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: 'brand' },
      emailRedirectTo: `${window.location.origin}/app/auth/callback?role=brand`,
    },
  })

  if (error) throw error

  // If email confirmation is OFF, Supabase returns an active session immediately.
  const hasSession = !!data.session

  return { user: data.user, hasSession }
}

export async function signInBrandWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/app/auth/callback?role=brand`,
    },
  })

  if (error) throw error
}
