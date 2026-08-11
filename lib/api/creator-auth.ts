import { supabase } from '@/lib/supabase'

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

    if (error) throw error

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
