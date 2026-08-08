// lib/videoProxyToken.ts
import crypto from 'crypto'

// Set this in your environment (Vercel/host env vars). Keep it secret.
const SECRET = process.env.VIDEO_PROXY_SECRET!

// Only Supabase URLs on your own project should ever be proxied.
// Adjust to match your actual Supabase project host.
const ALLOWED_HOSTS = [
    process.env.NEXT_PUBLIC_SUPABASE_HOST ?? '', // e.g. "abcxyz.supabase.co"
].filter(Boolean)

if (!SECRET) {
    throw new Error('VIDEO_PROXY_SECRET env var is not set')
}

function sign(payload: string): string {
    return crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
}

/**
 * Builds a signed, time-limited proxy URL on your own domain that points
 * at a Supabase-hosted video. Pass this URL to TikTok's video_url field
 * instead of the raw Supabase URL.
 */
export function createSignedProxyUrl(
    supabaseUrl: string,
    {
        baseUrl = 'https://goheza.com',
        expiresInSeconds = 3600, // matches TikTok's 1-hour pull window
    }: { baseUrl?: string; expiresInSeconds?: number } = {}
): string {
    const target = new URL(supabaseUrl)

    if (ALLOWED_HOSTS.length && !ALLOWED_HOSTS.includes(target.hostname)) {
        throw new Error(`Refusing to proxy unrecognized host: ${target.hostname}`)
    }

    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
    const payload = `${supabaseUrl}|${exp}`
    const sig = sign(payload)

    const proxyUrl = new URL('/api/tiktok/video-proxy', baseUrl)
    proxyUrl.searchParams.set('url', supabaseUrl)
    proxyUrl.searchParams.set('exp', String(exp))
    proxyUrl.searchParams.set('sig', sig)

    return proxyUrl.toString()
}

/**
 * Verifies a signed proxy request. Returns the validated Supabase URL,
 * or throws if the signature is invalid, expired, or the host isn't allowed.
 */
export function verifySignedProxyUrl(targetUrl: string, exp: string, sig: string): string {
    const expNum = Number(exp)
    if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) {
        throw new Error('Proxy link has expired')
    }

    const payload = `${targetUrl}|${exp}`
    const expectedSig = sign(payload)

    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expectedSig, 'hex')
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        throw new Error('Invalid signature')
    }

    const host = new URL(targetUrl).hostname
    if (ALLOWED_HOSTS.length && !ALLOWED_HOSTS.includes(host)) {
        throw new Error(`Host not allowed: ${host}`)
    }

    return targetUrl
}
