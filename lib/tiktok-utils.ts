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
        if (value !== undefined && value !== null) {
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
