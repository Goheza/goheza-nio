const BUSINESS_VIDEO_LIST_URL = 'https://business-api.tiktok.com/open_api/v1.3/business/video/list/'

// Scope: video.list
const LIST_FIELDS = [
    'item_id',
    'media_type',
    'is_ad',
    'create_time',
    'caption',
    'thumbnail_url', // temporary signed URL, don't persist
    'share_url',
    'embed_url',
    'video_duration',
    'likes',
    'comments',
    'shares',
    'favorites',
    'reach',
    'video_views',
] as const

// Scope: video.insights, no account-type restriction
const INSIGHT_FIELDS = [
    'total_time_watched',
    'average_time_watched',
    'full_video_watched_rate',
    'new_followers',
    'video_view_retention',
    'impression_sources',
    'audience_types',
    'audience_genders',
    'audience_countries',
    'audience_cities',
    'engagement_likes',
] as const

// Scope: video.insights, restricted by account type
const RESTRICTED_FIELDS = [
    'profile_views', // Advanced Access or Verified Business
    'website_clicks', // Verified Business only
    'phone_number_clicks', // Verified Business only
    'lead_submissions', // Verified Business only
    'app_download_clicks', // Verified Business only
    'email_clicks', // Verified Business only
    'address_clicks', // Verified Business only
] as const

export const ALLOWED_POST_FIELDS = new Set<string>([...LIST_FIELDS, ...INSIGHT_FIELDS, ...RESTRICTED_FIELDS])

// Restricted fields are left out by default; pass them in `fields` to request them.
export const DEFAULT_POST_FIELDS: string[] = [...LIST_FIELDS, ...INSIGHT_FIELDS]

/**
 * Validates a client-supplied fields array. Returns the cleaned list (item_id
 * always included, as the docs require) or an error string.
 */
export function resolvePostFields(requested: unknown): { fields: string[] } | { error: string } {
    if (requested === undefined) return { fields: DEFAULT_POST_FIELDS }

    if (!Array.isArray(requested) || requested.length === 0) {
        return { error: 'fields must be a non-empty array of strings.' }
    }

    const unknown = requested.filter((f) => typeof f !== 'string' || !ALLOWED_POST_FIELDS.has(f))
    if (unknown.length) {
        return { error: `Unsupported fields: ${unknown.join(', ')}` }
    }

    const fields = requested as string[]
    return { fields: fields.includes('item_id') ? fields : ['item_id', ...fields] }
}

type VideoListParams = {
    accessToken: string
    businessId: string
    fields: string[]
    filters?: { video_ids?: string[]; ad_post_only?: boolean }
    cursor?: number
    maxCount?: number
}

export async function fetchBusinessVideoList({
    accessToken,
    businessId,
    fields,
    filters,
    cursor,
    maxCount,
}: VideoListParams) {
    const url = new URL(BUSINESS_VIDEO_LIST_URL)
    url.searchParams.set('business_id', businessId)
    url.searchParams.set('fields', JSON.stringify(fields))
    // The docs don't show how filters is encoded on a GET; JSON-encoded like `fields`.
    if (filters) url.searchParams.set('filters', JSON.stringify(filters))
    if (cursor !== undefined) url.searchParams.set('cursor', String(cursor))
    if (maxCount !== undefined) url.searchParams.set('max_count', String(maxCount))

    const res = await fetch(url.toString(), { headers: { 'Access-Token': accessToken } })
    const json = await res.json()
    return { ok: res.ok && json.code === 0, json }
}
