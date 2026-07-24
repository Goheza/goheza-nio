import { supabase } from './supabase'

export async function activateTiktokOAuth() {
    const {
        data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
        throw new Error('[TIKTOK-AUTH-ERROR]')
    }

    const res = await fetch('/api/tiktok/connect', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            credentials: 'include',
        },
    })

    const data = await res.json()

    if (data.authUrl) {
        await new Promise((r) => setTimeout(r, 50))
        window.location.href = data.authUrl
    }
}
