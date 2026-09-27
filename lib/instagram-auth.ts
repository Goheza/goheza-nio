import { supabase } from './supabase'

export async function activateInstagramOAuth(returnTo?: string) {
    const {
        data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
        throw new Error('[INSTAGRAM-AUTH-ERROR]')
    }

    const res = await fetch('/api/instagram/connect', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
            returnTo,
        }),
    })

    const data = await res.json()

    if (!res.ok || !data.authUrl) {
        throw new Error(data.error || 'Could not start the Instagram connection.')
    }

    window.location.href = data.authUrl
}