import { supabase } from "./supabase"

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
        },
    })

    const data = await res.json()

    if (!res.ok || !data.authUrl) {
        throw new Error(data.error || 'Could not start the TikTok connection.')
    }

    window.location.href = data.authUrl
}