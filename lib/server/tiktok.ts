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
 * Generic TikTok Business API fetch helper.
 *
 * Arrays passed in params are JSON-stringified so that
 * TikTok receives parameters such as:
 *
 * fields=["username","display_name","shares"]
 */
export async function tiktokFetch<T = any>(
    endpoint: string,
    accessToken: string,
    options: {
        method?: 'GET' | 'POST'
        params?: Record<string, any>
        body?: Record<string, any>
    } = {}
): Promise<T> {
    const { method = 'GET', params = {}, body } = options

    const url = new URL(`${BASE_URL}${endpoint}`)

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) {
            return
        }

        if (Array.isArray(value)) {
            url.searchParams.append(key, JSON.stringify(value))
        } else {
            url.searchParams.append(key, String(value))
        }
    })

    const res = await fetch(url.toString(), {
        method,
        headers: {
            'Access-Token': accessToken,
            'Content-Type': 'application/json',
        },
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

/**
 * Fetches the creator's TikTok username/display name
 * via the TikTok Business API.
 */
export async function fetchTikTokDisplayName(accessToken: string, businessId: string): Promise<string | null> {
    try {
        const data = await tiktokFetch<{
            username?: string
            display_name?: string
        }>('/business/get/', accessToken, {
            params: {
                business_id: businessId,
                fields: ['username', 'display_name'],
            },
        })

        if (!data?.display_name) {
            console.error('[fetchTikTokDisplayName] No display_name field in response:', JSON.stringify(data))
        }

        return data?.display_name ?? null
    } catch (err) {
        if (err instanceof TikTokError) {
            console.error(
                `[fetchTikTokDisplayName] TikTok API error — code: ${err.code}, message: ${err.message}, requestId: ${err.requestId}`
            )
        } else {
            console.error('[fetchTikTokDisplayName] Unexpected error:', err)
        }

        return null
    }
}

/**
 * Video fields used by TikTok video/insights endpoints.
 */
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
]

type TikTokTokenRow = {
    access_token: string | null
    refresh_token: string | null
    token_expires_at: string | null
}

/**
 * Ensures that the stored TikTok access token is still valid.
 *
 * Refreshes the token if it expires within 5 minutes.
 */
export async function ensureFreshAccessToken(account: TikTokTokenRow): Promise<{
    accessToken: string
    refreshed: null | {
        access_token: string
        refresh_token: string
        expires_at: string
    }
}> {
    if (!account.access_token || !account.refresh_token) {
        throw new TikTokError('Creator has no stored TikTok credentials.', -1)
    }

    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0

    const needsRefresh = !expiresAt || expiresAt - Date.now() < 5 * 60 * 1000

    if (!needsRefresh) {
        return {
            accessToken: account.access_token,
            refreshed: null,
        }
    }

    const res = await fetch(`${BASE_URL}/oauth2/refresh_token/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            app_id: process.env.TIKTOK_BUSINESS_APP_ID,
            secret: process.env.TIKTOK_BUSINESS_APP_SECRET,
            refresh_token: account.refresh_token,
            grant_type: 'refresh_token',
        }),
    })

    const json = await res.json()

    if (json.code !== 0) {
        throw new TikTokError(json.message || 'Failed to refresh TikTok token.', json.code, json.request_id)
    }

    const expires_at = new Date(Date.now() + json.data.expires_in * 1000).toISOString()

    return {
        accessToken: json.data.access_token,
        refreshed: {
            access_token: json.data.access_token,
            refresh_token: json.data.refresh_token,
            expires_at,
        },
    }
}

/**
 * Initiates publishing a video through the TikTok Business API.
 */
export async function initTikTokBusinessPublish(params: {
    accessToken: string
    businessId: string
    videoUrl: string
    caption: string
}): Promise<{ publishId: string }> {
    const data = await tiktokFetch<{
        publish_id: string
    }>('/business/video/publish/', params.accessToken, {
        method: 'POST',
        body: {
            business_id: params.businessId,
            video_url: params.videoUrl,
            title: params.caption ?? '',
        },
    })

    return {
        publishId: data.publish_id,
    }
}

export type TikTokBusinessPublishStatus =
    | {
          state: 'processing'
      }
    | {
          state: 'posted'
          postId: string
      }
    | {
          state: 'failed'
          reason: string
      }

/**
 * Checks the status of a TikTok Business API publish request.
 *
 * NOTE:
 * The exact response fields should be verified against
 * an actual Business API response.
 */
export async function fetchTikTokBusinessPublishStatus(params: {
    accessToken: string
    businessId: string
    publishId: string
}): Promise<TikTokBusinessPublishStatus> {
    const data = await tiktokFetch<{
        status?: string
        publicaly_available_post_id?: string[]
        fail_reason?: string
    }>('/business/publish/status/', params.accessToken, {
        params: {
            business_id: params.businessId,
            publish_id: params.publishId,
        },
    })

    if (data.status === 'PUBLISH_COMPLETE') {
        return {
            state: 'posted',
            postId: data.publicaly_available_post_id?.[0] ?? 'unknown',
        }
    }

    if (data.status === 'FAILED') {
        return {
            state: 'failed',
            reason: data.fail_reason ?? 'Unknown TikTok error',
        }
    }

    return {
        state: 'processing',
    }
}

/**
 * Builds a public TikTok video permalink.
 */
export function buildTikTokPermalink(username: string | null, postId: string): string | null {
    if (!username) {
        return null
    }

    return `https://www.tiktok.com/@${username}/video/${postId}`
}

/**
 * TikTok Business account statistics.
 */
export interface TikTokBusinessAccountStats {
    username: string | null
    display_name: string | null
    profile_deep_link: string | null
    is_business_account: boolean | null
    is_verified: boolean | null
    bio_description: string | null
    following_count: number | null
    total_likes: number | null
    videos_count: number | null
    unique_video_views: number | null
    daily_total_followers: number | null
}

/**
 * Fields requested from the TikTok Business API.
 *
 * IMPORTANT:
 * Keep this as an array.
 *
 * tiktokFetch() converts the array into:
 *
 * fields=["profile_deep_link","is_business_account",...]
 *
 * instead of:
 *
 * fields=profile_deep_link,is_business_account,...
 */
const BUSINESS_ACCOUNT_FIELDS = [
    'username',
    'display_name',
    'profile_deep_link',
    'is_business_account',
    'is_verified',
    'bio_description',
    'following_count',
    'total_likes',
    'videos_count',
    'unique_video_views',
    'daily_total_followers',
]

/**
 * Fetch TikTok Business account statistics.
 */
export async function fetchTikTokBusinessAccountStats(
    accessToken: string,
    businessId: string
): Promise<TikTokBusinessAccountStats | null> {
    try {
        const data = await tiktokFetch<TikTokBusinessAccountStats>('/business/get/', accessToken, {
            params: {
                business_id: businessId,
                fields: BUSINESS_ACCOUNT_FIELDS,
            },
        })

        console.log('[fetchTikTokBusinessAccountStats] TikTok data:', JSON.stringify(data, null, 2))

        return {
            username: data?.username ?? null,
            display_name: data?.display_name ?? null,
            profile_deep_link: data?.profile_deep_link ?? null,
            is_business_account: data?.is_business_account ?? null,
            is_verified: data?.is_verified ?? null,
            bio_description: data?.bio_description ?? null,
            following_count: data?.following_count ?? null,
            total_likes: data?.total_likes ?? null,
            videos_count: data?.videos_count ?? null,
            unique_video_views: data?.unique_video_views ?? null,
            daily_total_followers: data?.daily_total_followers ?? null,
        }
    } catch (error) {
        console.error('Failed to fetch TikTok business account stats:', error)

        return null
    }
}
