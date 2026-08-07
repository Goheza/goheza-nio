const BASE_URL = 'https://business-api.tiktok.com/open_api/v1.3'

export class TikTokError extends Error {
    constructor(message: string, public code: number, public requestId?: string) {
        super(message)
        this.name = 'TikTokError'
    }
}

interface TikTokResponse<T = any> {
    code: number
    message: string
    request_id: string
    data: T
}

/**
 * Fetches the creator's TikTok username via Business API, used to build a
 * real profile-video permalink later (the publish-status response only
 * ever returns a post id, never a full URL). Replaces the old Content
 * Posting API version of this function, which called a different endpoint
 * (open.tiktokapis.com/v2/user/info/) — that endpoint doesn't apply here.
 */
export async function fetchTikTokDisplayName(accessToken: string, businessId: string): Promise<string | null> {
    try {
        const data = await tiktokFetch<{ username?: string; display_name?: string }>('/business/get/', accessToken, {
            params: { business_id: businessId },
        })
        if (!data.display_name) {
            console.error(
                '[fetchTikTokDisplayName] No DisplayName field in response. Full response:',
                JSON.stringify(data)
            )
        }
        return data.display_name ?? null
    } catch (err) {
        if (err instanceof TikTokError) {
            console.error(
                `[fetchTikTokDisplayName]TikTok API error — code: ${err.code}, message: ${err.message}, requestId: ${err.requestId}`
            )
        } else {
            console.error('[fetchTikTokDisplayName] Unexpected error:', err)
        }
        return null
    }
}

export async function tiktokFetch<T = any>(
    endpoint: string,
    accessToken: string,
    options: { method?: 'GET' | 'POST'; params?: Record<string, any>; body?: Record<string, any> } = {}
): Promise<T> {
    const { method = 'GET', params = {}, body } = options
    const url = new URL(`${BASE_URL}${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) url.searchParams.append(key, String(value))
    })

    const res = await fetch(url.toString(), {
        method,
        headers: { 'Access-Token': accessToken, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
    })

    const json: TikTokResponse<T> = await res.json()
    if (json.code !== 0) {
        throw new TikTokError(json.message || 'TikTok API Error', json.code, json.request_id)
    }
    return json.data
}

export interface TikTokTokens {
    access_token: string
    refresh_token: string
    expires_in: number
    refresh_expires_in: number
    open_id: string
    scope: string
}

export const VIDEO_FIELDS = [
    'item_id',
    'caption',
    'create_time',
    'video_views',
    'likes',
    'comments',
    'shares',
    'reach',
    'video_duration',
    'average_time_watched',
    'full_video_watched_rate',
    'total_time_watched',
    'thumbnail_url',
    'share_url',
    'embed_url',
    'impression_sources',
    'audience_countries',
].join(',')

type TikTokTokenRow = { access_token: string | null; refresh_token: string | null; token_expires_at: string | null }

export async function ensureFreshAccessToken(account: TikTokTokenRow): Promise<{
    accessToken: string
    refreshed: null | { access_token: string; refresh_token: string; expires_at: string }
}> {
    if (!account.access_token || !account.refresh_token) {
        throw new TikTokError('Creator has no stored TikTok credentials.', -1)
    }
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0
    const needsRefresh = !expiresAt || expiresAt - Date.now() < 5 * 60 * 1000
    if (!needsRefresh) return { accessToken: account.access_token, refreshed: null }

    const res = await fetch(`${BASE_URL}/oauth2/refresh_token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: process.env.TIKTOK_BUSINESS_APP_ID,
            secret: process.env.TIKTOK_BUSINESS_APP_SECRET,
            refresh_token: account.refresh_token,
            grant_type: 'refresh_token',
        }),
    })
    const json = await res.json()
    if (json.code !== 0) throw new TikTokError(json.message || 'Failed to refresh TikTok token.', json.code)

    const expires_at = new Date(Date.now() + json.data.expires_in * 1000).toISOString()
    return {
        accessToken: json.data.access_token,
        refreshed: { access_token: json.data.access_token, refresh_token: json.data.refresh_token, expires_at },
    }
}

export async function initTikTokBusinessPublish(params: {
    accessToken: string
    businessId: string
    videoUrl: string
    caption: string
}): Promise<{ publishId: string }> {
    const data = await tiktokFetch<{ publish_id: string }>('/business/video/publish/', params.accessToken, {
        method: 'POST',
        body: {
            business_id: params.businessId,
            video_url: params.videoUrl,
            title: params.caption ?? '',
        },
    })
    return { publishId: data.publish_id }
}

export type TikTokBusinessPublishStatus =
    | { state: 'processing' }
    | { state: 'posted'; postId: string }
    | { state: 'failed'; reason: string }

export async function fetchTikTokBusinessPublishStatus(params: {
    accessToken: string
    businessId: string
    publishId: string
}): Promise<TikTokBusinessPublishStatus> {
    const data = await tiktokFetch<{ status: string; publicaly_available_post_id?: string[]; fail_reason?: string }>(
        '/business/publish/status/',
        params.accessToken,
        { params: { business_id: params.businessId, publish_id: params.publishId } }
    )
    // NOTE: field names here (`status`, `publicaly_available_post_id`, `fail_reason`)
    // are inferred from the Content Posting API's equivalent shape, NOT confirmed
    // against a real Business API response — verify against an actual test
    // publish before relying on this in production.
    if (data.status === 'PUBLISH_COMPLETE') {
        return { state: 'posted', postId: data.publicaly_available_post_id?.[0] ?? 'unknown' }
    }
    if (data.status === 'FAILED') {
        return { state: 'failed', reason: data.fail_reason ?? 'Unknown TikTok error' }
    }
    return { state: 'processing' }
}

export function buildTikTokPermalink(username: string | null, postId: string): string | null {
    if (!username) return null
    return `https://www.tiktok.com/@${username}/video/${postId}`
}

export interface TikTokBusinessAccountStats {
    // Identity
    open_id?: string

    username?: string
    display_name?: string
    profile_image?: string
    followers_count?: number
    audience_activity?: number
    audience_countries?: any,
    audience_genders?: any
    likes: number
    comments: number
    shares: number
    profile_views: number
    video_views: number
}
/**
 * Fetches follower/likes/video counts via Business API's /business/get/ —
 * replaces the old Content Posting API's /v2/user/info/ call, which lived
 * on a different host entirely (open.tiktokapis.com vs business-api...).
 * Field names inferred the same way as fetchTikTokUsername — not yet
 * confirmed against a real response.
 */
export async function fetchTikTokBusinessAccountStats(
    accessToken: string,
    businessId: string
): Promise<TikTokBusinessAccountStats | null> {
    try {
        const response = await tiktokFetch<{
            data?: {
                open_id?: string

                username?: string
                display_name?: string
                profile_image?: string
                followers_count?: number
                audience_activity?: number
                audience_countries?: any
                audience_genders?: any
                likes: number
                comments: number
                shares: number
                profile_views: number
                video_views: number
                [key: string]: unknown
            }

            [key: string]: unknown
        }>('/business/get/', accessToken, {
            params: {
                business_id: businessId,
            },
        })

        const data = response.data ?? response

        return {
            open_id: (data.open_id as string) ?? null,
            username: (data.username as string) ?? null,
            display_name: (data.display_name as string) ?? null,
            profile_image: (data.profile_image as string) ?? null,
            followers_count: (data.followers_count as number) ?? null,
            likes: (data.likes as number) ?? null,
            profile_views: (data.profile_views as number) ?? null,
            video_views: (data.video_views as number) ?? null,
            comments: (data.comments as number) ?? null,
            shares: (data.shares as number) ?? null,
        }
    } catch (error) {
        console.error('Failed to fetch TikTok business account stats:', error)

        return null
    }
}
