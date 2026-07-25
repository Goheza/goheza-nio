import { supabase } from './supabase'

export async function activateInstagramOAuth() {
    const {
        data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
        throw new Error('Your session expired — please sign in again.')
    }

    const res = await fetch('/api/instagram/connect', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        },
    })

    const data = await res.json()

    if (!res.ok || !data.authUrl) {
        throw new Error(data.error || 'Could not start the Instagram connection.')
    }

    window.location.href = data.authUrl
}
