import { supabase } from '@/lib/supabase'

export async function signUpCreatorWithEmail(fullName: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { role: 'creator', full_name: fullName },
            emailRedirectTo: `${window.location.origin}/app/auth/callback?role=creator`,
        },
    })

    if (error) throw error

    const hasSession = !!data.session

    // Stub the profile row immediately so it's visible to Admin and resumable
    // cross-device, even if onboarding is abandoned right after this step.
    if (hasSession && data.user) {
        const { error: stubError } = await supabase
            .from('creator_profiles')
            .upsert({ user_id: data.user.id, full_name: fullName, email }, { onConflict: 'user_id' })
        // Non-fatal: don't block signup if this fails, but surface it for debugging.
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
