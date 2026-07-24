import { supabase } from '@/lib/supabase'

const CODE_VERIFIER_KEY = 'goheza.tiktok.code_verifier'
const REDIRECT_PATH = '/onboarding/creator/tiktok-callback'

// TikTok's client_key is a public identifier meant to be embedded in the
// authorize URL sent to the user's browser — it's fine to expose here.
// The client_secret stays server-side, inside the tiktok-oauth-exchange
// edge function, and never reaches the browser.
const TIKTOK_CLIENT_KEY = import.meta.env.VITE_TIKTOK_CLIENT_KEY as string

function base64url(bytes: Uint8Array) {
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function generatePkce() {
    const verifierBytes = crypto.getRandomValues(new Uint8Array(32))
    const codeVerifier = base64url(verifierBytes)
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
    const codeChallenge = base64url(new Uint8Array(digest))
    return { codeVerifier, codeChallenge }
}

export function getTikTokRedirectUri() {
    return `${window.location.origin}${REDIRECT_PATH}`
}

/**
 * Kicks off the TikTok OAuth flow: generates a PKCE pair, stashes the
 * verifier in localStorage, and sends the browser to TikTok's consent
 * screen. Deliberately a full-page redirect (not a popup) — TikTok's
 * consent screen inside a small popup is flaky on mobile browsers, and this
 * way the callback route runs same-origin, so no cookies or CORS/credential
 * configuration are needed to get the verifier from here to there.
 */
export async function startTikTokConnect(userId: string) {
    const { codeVerifier, codeChallenge } = await generatePkce()
    localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier)

    const params = new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        scope: 'user.info.basic,video.upload,video.publish,video.list',
        response_type: 'code',
        redirect_uri: getTikTokRedirectUri(),
        state: userId,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    })

    window.location.href = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
}

function popStoredCodeVerifier() {
    const value = localStorage.getItem(CODE_VERIFIER_KEY)
    localStorage.removeItem(CODE_VERIFIER_KEY)
    return value
}

/**
 * Called from the tiktok-callback route once TikTok has redirected back
 * with a `code`. Hands the code + verifier to the tiktok-oauth-exchange
 * edge function, which performs the actual (client-secret-bearing) token
 * exchange with TikTok and writes the result to social_accounts.
 *
 * supabase.functions.invoke automatically attaches the current session's
 * access token as the Authorization header — the edge function uses that
 * (not the OAuth `state` param) as the source of truth for which user to
 * write the connection to.
 */
export async function exchangeTikTokCode(code: string) {
    const codeVerifier = popStoredCodeVerifier()
    if (!codeVerifier) {
        throw new Error('Missing PKCE verifier — please try connecting again.')
    }

    const { data, error } = await supabase.functions.invoke('tiktok-oauth-exchange', {
        body: {
            code,
            code_verifier: codeVerifier,
            redirect_uri: getTikTokRedirectUri(),
        },
    })

    if (error) {
        throw new Error(error.message ?? 'Failed to connect TikTok account.')
    }
    if (data?.error) {
        throw new Error(data.error)
    }
    return data
}