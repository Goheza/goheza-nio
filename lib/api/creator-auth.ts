import { supabase } from '@/lib/supabase'

export const ACCOUNT_EXISTS = 'ACCOUNT_EXISTS'

export async function signUpCreatorWithEmail(fullName: string, email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase()

    const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
            data: { role: 'creator', full_name: fullName },
            emailRedirectTo: `${window.location.origin}/app/auth/callback?role=creator`,
        },
    })

    if (error) {
        // Returned when email confirmation is disabled and the email is taken.
        if (error.message.toLowerCase().includes('already registered')) {
            throw new Error(ACCOUNT_EXISTS)
        }
        throw error
    }

    // With email confirmation enabled, Supabase returns a fake success with an
    // empty identities array when the email is already registered.
    if (data.user && data.user.identities?.length === 0) {
        throw new Error(ACCOUNT_EXISTS)
    }

    const hasSession = !!data.session

    if (hasSession && data.user) {
        const { error: stubError } = await supabase
            .from('creator_profiles')
            .upsert({ user_id: data.user.id, full_name: fullName, email: normalizedEmail }, { onConflict: 'user_id' })
        if (stubError) console.error('Failed to stub creator profile:', stubError)
    }

    return { user: data.user, hasSession }
}

export async function signInCreatorWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/app/auth/callback?role=creator`,
        },
    })

    if (error) throw error
}