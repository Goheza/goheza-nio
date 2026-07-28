// Server-only. Never import this from a client component — it
// handles raw TikTok OAuth tokens and TIKTOK_CLIENT_SECRET.
//
// Endpoint shapes follow TikTok's Content Posting API v2 as of this
// writing (open.tiktokapis.com/v2/post/publish/*). TikTok's API
// surface does change — verify field names against the current
// TikTok for Developers docs before relying on this in production,
// and confirm your app has been audited for the Direct Post scope
// (unaudited apps can only publish as private/draft, not public).

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2'

type TikTokTokenRow = {
    open_id: string | null
    access_token: string | null
    refresh_token: string | null
    token_expires_at: string | null
}

export class TikTokPublishError extends Error {
    constructor(message: string, public readonly details?: unknown) {
        super(message)
        this.name = 'TikTokPublishError'
    }
}

/**
 * Fetches the creator's TikTok username so we can build a real
 * profile-video permalink later (TikTok's publish-status response
 * only ever returns a post id, never a full URL). Requires the
 * user.info.basic scope, which is already requested at connect time.
 */
export async function fetchTikTokUsername(accessToken: string): Promise<string | null> {
    const res = await fetch(`${TIKTOK_API_BASE}/user/info/?fields=username`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })

    const json = await res.json()

    if (!res.ok || json.error?.code !== 'ok') {
        console.error('TikTok username fetch failed:', json)
        return null
    }

    return json.data?.user?.username ?? null
}

/** Builds a real TikTok profile-video URL once both pieces are known. */
export function buildTikTokPermalink(username: string | null, postId: string): string | null {
    if (!username) return null
    return `https://www.tiktok.com/@${username}/video/${postId}`
}

/**
 * Refreshes the access token if it's expired or about to expire.
 * Returns the token to use for the publish call, plus the new
 * token row if a refresh happened (caller is responsible for
 * persisting it back to creator_social_accounts).
 */
export async function ensureFreshAccessToken(
    account: TikTokTokenRow
): Promise<{
    accessToken: string
    refreshed: null | { access_token: string; refresh_token: string; expires_at: string }
}> {
    if (!account.access_token || !account.refresh_token) {
        throw new TikTokPublishError('Creator has no stored TikTok publishing credentials.')
    }

    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0
    const needsRefresh = !expiresAt || expiresAt - Date.now() < 5 * 60 * 1000 // refresh if <5min left

    if (!needsRefresh) {
        return { accessToken: account.access_token, refreshed: null }
    }

    const clientKey = process.env.TIKTOK_CLIENT_KEY
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET
    if (!clientKey || !clientSecret) {
        throw new TikTokPublishError('TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET are not configured.')
    }

    const res = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
        body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: account.refresh_token,
        }),
    })

    const json = await res.json()
    if (!res.ok || !json.access_token) {
        throw new TikTokPublishError('Failed to refresh TikTok access token.', json)
    }

    const expires_at = new Date(Date.now() + json.expires_in * 1000).toISOString()
    return {
        accessToken: json.access_token,
        refreshed: { access_token: json.access_token, refresh_token: json.refresh_token, expires_at },
    }
}

/**
 * Kicks off a publish job. Uses PULL_FROM_URL, which requires the
 * video_url to be reachable by TikTok's servers and served from a
 * domain you've verified in the TikTok developer portal. If your
 * videos live behind auth/signed URLs, switch to the FILE_UPLOAD
 * flow (chunked PUT to the upload_url TikTok returns) instead.
 */
export async function initTikTokPublish(params: {
    accessToken: string
    videoUrl: string
    caption: string
    privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY'
}): Promise<{ publishId: string }> {
    const res = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
            post_info: {
                title: params.caption?.slice(0, 2200) ?? '',
                privacy_level: params.privacyLevel ?? 'PUBLIC_TO_EVERYONE',
                disable_duet: false,
                disable_comment: false,
                disable_stitch: false,
            },
            source_info: {
                source: 'PULL_FROM_URL',
                video_url: params.videoUrl,
            },
        }),
    })

    const json = await res.json()
    if (!res.ok || json.error?.code !== 'ok' || !json.data?.publish_id) {
        throw new TikTokPublishError('TikTok rejected the publish request.', json)
    }

    return { publishId: json.data.publish_id }
}

export type TikTokPublishStatus =
    | { state: 'processing' }
    | { state: 'posted'; postId: string }
    | { state: 'failed'; reason: string }

export async function fetchTikTokPublishStatus(params: {
    accessToken: string
    publishId: string
}): Promise<TikTokPublishStatus> {
    const res = await fetch(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({ publish_id: params.publishId }),
    })

    const json = await res.json()
    if (!res.ok || json.error?.code !== 'ok') {
        throw new TikTokPublishError('Failed to fetch TikTok publish status.', json)
    }

    const status = json.data?.status as string
    if (status === 'PUBLISH_COMPLETE') {
        const postId = json.data?.publicaly_available_post_id?.[0] ?? json.data?.publicly_available_post_id?.[0]
        return { state: 'posted', postId: postId ?? 'unknown' }
    }
    if (status === 'FAILED') {
        return { state: 'failed', reason: json.data?.fail_reason ?? 'Unknown TikTok error' }
    }
    return { state: 'processing' }
}
