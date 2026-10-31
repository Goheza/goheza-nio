const BASE = 'https://business-api.tiktok.com/open_api/v1.3'

// ---------- low-level call ----------

type CallOptions = {
    method?: 'GET' | 'POST'
    accessToken?: string
    query?: Record<string, string>
    body?: unknown
}

export type TikTokResult = { ok: boolean; status: number; json: any }

async function call(
    path: string,
    { method = 'GET', accessToken, query, body }: CallOptions = {},
): Promise<TikTokResult> {
    const url = new URL(`${BASE}${path}`)
    if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)

    const headers: Record<string, string> = {}
    if (accessToken) headers['Access-Token'] = accessToken
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    const res = await fetch(url.toString(), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const json = await res.json().catch(() => ({ code: -1, message: `Non-JSON response (HTTP ${res.status})` }))

    // TikTok can return HTTP 200 with a non-zero code in the body.
    return { ok: res.ok && json.code === 0, status: res.status, json }
}

function appCreds() {
    const app_id = process.env.TIKTOK_BUSINESS_APP_ID
    const secret = process.env.TIKTOK_BUSINESS_APP_SECRET
    if (!app_id || !secret) throw new Error('TIKTOK_BUSINESS_APP_ID / TIKTOK_BUSINESS_APP_SECRET are not set')
    return { app_id, secret }
}

// ---------- publishing ----------

export type PublishInput = {
    videoUrl: string
    caption?: string
    disableComment?: boolean
    disableDuet?: boolean
    disableStitch?: boolean
    thumbnailOffset?: number // ms
    isAiGenerated?: boolean
    uploadToDraft?: boolean
    isBrandOrganic?: boolean
    isBrandedContent?: boolean
}

function optBool(body: any, key: string): boolean | undefined | { error: string } {
    const v = body?.[key]
    if (v === undefined) return undefined
    if (typeof v !== 'boolean') return { error: `${key} must be a boolean` }
    return v
}

/**
 * Validates the client body. videoUrl must be https and hosted on one of
 * allowedHosts (the verified URL property). Returns a cleaned PublishInput.
 */
export function parsePublishInput(body: any, allowedHosts: string[]): { error: string } | { input: PublishInput } {
    const videoUrl = body?.videoUrl
    if (typeof videoUrl !== 'string' || !videoUrl) return { error: 'Missing videoUrl' }

    let parsed: URL
    try {
        parsed = new URL(videoUrl)
    } catch {
        return { error: 'videoUrl is not a valid absolute URL' }
    }
    if (parsed.protocol !== 'https:') return { error: 'videoUrl must use https' }
    if (!allowedHosts.includes(parsed.hostname.toLowerCase())) {
        return { error: `videoUrl must be hosted on: ${allowedHosts.join(', ')}` }
    }

    const input: PublishInput = { videoUrl }

    for (const key of [
        'disableComment',
        'disableDuet',
        'disableStitch',
        'isAiGenerated',
        'uploadToDraft',
        'isBrandOrganic',
        'isBrandedContent',
    ] as const) {
        const v = optBool(body, key)
        if (typeof v === 'object') return v
        if (v !== undefined) input[key] = v
    }

    if (body.caption !== undefined) {
        if (typeof body.caption !== 'string') return { error: 'caption must be a string' }
        if (body.caption.length > 2200) return { error: 'caption exceeds 2,200 characters' }
        if ((body.caption.match(/@/g) ?? []).length > 30) return { error: 'caption exceeds 30 mentions' }
        input.caption = body.caption
    }

    if (body.thumbnailOffset !== undefined) {
        if (!Number.isInteger(body.thumbnailOffset) || body.thumbnailOffset < 0) {
            return { error: 'thumbnailOffset must be a non-negative integer (ms)' }
        }
        input.thumbnailOffset = body.thumbnailOffset
    }

    return { input }
}

/** disable_* values already coerced against the account's /video/settings/ by the caller. */
export function buildPostInfo(i: PublishInput): Record<string, unknown> {
    // The docs mark both brand flags "Required" even though post_info may be {}, so always send them.
    const postInfo: Record<string, unknown> = {
        is_brand_organic: i.isBrandOrganic ?? false,
        is_branded_content: i.isBrandedContent ?? false,
    }

    // With upload_to_draft the rest of post_info is ignored by TikTok.
    if (i.uploadToDraft) {
        postInfo.upload_to_draft = true
        return postInfo
    }

    if (i.caption !== undefined) postInfo.caption = i.caption
    postInfo.disable_comment = i.disableComment ?? false
    postInfo.disable_duet = i.disableDuet ?? false
    postInfo.disable_stitch = i.disableStitch ?? false
    if (i.thumbnailOffset !== undefined) postInfo.thumbnail_offset = i.thumbnailOffset
    if (i.isAiGenerated !== undefined) postInfo.is_ai_generated = i.isAiGenerated
    return postInfo
}

export function getVideoSettings(accessToken: string, businessId: string) {
    return call('/business/video/settings/', { accessToken, query: { business_id: businessId } })
}

export function publishVideo(args: {
    accessToken: string
    businessId: string
    videoUrl: string
    postInfo: Record<string, unknown>
}) {
    return call('/business/video/publish/', {
        method: 'POST',
        accessToken: args.accessToken,
        body: { business_id: args.businessId, video_url: args.videoUrl, post_info: args.postInfo },
    })
}

export function getPublishStatus(accessToken: string, businessId: string, publishId: string) {
    return call('/business/publish/status/', {
        accessToken,
        query: { business_id: businessId, publish_id: publishId },
    })
}

// ---------- URL properties (app-level: app_id + secret, no Access-Token) ----------

export function listUrlProperties() {
    return call('/business/property/list/', { query: appCreds() })
}

/** propertyType: 1 = domain (DNS TXT), 2 = URL prefix (signature file). */
export function addUrlProperty(url: string, propertyType: 1 | 2) {
    return call('/business/property/add/', {
        method: 'POST',
        body: { ...appCreds(), url_property_meta: { url, property_type: propertyType } },
    })
}

/**
 * ASSUMED request shape: mirrors /property/add/. The /business/property/verify/
 * doc has not been checked. If this fails with a parameter error, compare it
 * with the doc and adjust the body here.
 */
export function verifyUrlProperty(url: string, propertyType: 1 | 2) {
    return call('/business/property/verify/', {
        method: 'POST',
        body: { ...appCreds(), url_property_meta: { url, property_type: propertyType } },
    })
}

// ---------- webhook ----------

/** event_type "VIDEO" = post publishing events. The callback is per app, not per creator. */
export function subscribePublishWebhook(callbackUrl: string) {
    return call('/business/webhook/update/', {
        method: 'POST',
        body: { ...appCreds(), event_type: 'VIDEO', callback_url: callbackUrl },
    })
}

/** Maps a post.publish.* webhook event onto the status column vocabulary. */
export function mapPublishEvent(
    event: string,
    content: { reason?: string; post_id?: string },
): { status: string; reason?: string; post_id?: string } | null {
    switch (event) {
        case 'post.publish.failed':
            return { status: 'FAILED', reason: content.reason }
        case 'post.publish.complete':
            return { status: 'DOWNLOADED' }
        case 'post.publish.publicly_available':
            return { status: 'PUBLISH_COMPLETE', post_id: content.post_id }
        case 'post.publish.no_longer_publicly_available':
            return { status: 'UNPUBLISHED', post_id: content.post_id }
        default:
            return null
    }
}

export const RETRYABLE_FAILURES = new Set(['internal', 'video_pull_failed', 'photo_pull_failed'])
