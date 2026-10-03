const IG_GRAPH_BASE = 'https://graph.instagram.com'
const IG_GRAPH_VERSION = 'v22.0'

export type ContainerResult = { ok: true; containerId: string } | { ok: false; error: string }

/**
 * Step 1 of 2 for posting a Reel. Creates a media container from a hosted
 * video URL — this does NOT publish anything yet. Video processing on
 * Meta's side is asynchronous and can take anywhere from seconds to a
 * few minutes, so this call returns quickly with just a container id;
 * see getInstagramContainerStatus for the polling step.
 */
export async function createInstagramContainer(
    igUserId: string,
    accessToken: string,
    videoUrl: string,
    caption?: string
): Promise<ContainerResult> {
    const url = `${IG_GRAPH_BASE}/${IG_GRAPH_VERSION}/${igUserId}/media`
    const body = new URLSearchParams({
        media_type: 'REELS',
        video_url: videoUrl,
        access_token: accessToken,
    })
    if (caption) body.set('caption', caption)

    const res = await fetch(url, { method: 'POST', body })
    const data = await res.json()

    if (!res.ok || !data.id) {
        return { ok: false, error: data?.error?.message || 'Failed to create Instagram media container.' }
    }
    return { ok: true, containerId: data.id }
}

export type ContainerStatusCode = 'IN_PROGRESS' | 'FINISHED' | 'ERROR' | 'EXPIRED' | 'PUBLISHED'

export type ContainerStatusResult =
    | { ok: true; status: ContainerStatusCode; statusDetail?: string }
    | { ok: false; error: string }

/**
 * Step 2 of 2 (part A) — checks whether the container has finished
 * processing. Call this manually/repeatedly (mirrors TikTok's "Check
 * progress" pattern) rather than blocking on it inside the same request
 * that created the container, since processing time is unpredictable and
 * risks exceeding a serverless function's execution limit.
 */
export async function getInstagramContainerStatus(
    containerId: string,
    accessToken: string
): Promise<ContainerStatusResult> {
    const url = new URL(`${IG_GRAPH_BASE}/${IG_GRAPH_VERSION}/${containerId}`)
    url.searchParams.set('fields', 'status_code,status')
    url.searchParams.set('access_token', accessToken)

    const res = await fetch(url.toString())
    const data = await res.json()

    if (!res.ok || !data.status_code) {
        return { ok: false, error: data?.error?.message || 'Failed to check Instagram container status.' }
    }
    return { ok: true, status: data.status_code, statusDetail: data.status }
}

export type PublishResult = { ok: true; mediaId: string } | { ok: false; error: string }

/**
 * Step 2 of 2 (part B) — actually goes live. Only call this once
 * getInstagramContainerStatus reports 'FINISHED'; calling it before that
 * fails.
 */
export async function publishInstagramContainer(
    igUserId: string,
    accessToken: string,
    containerId: string
): Promise<PublishResult> {
    const url = `${IG_GRAPH_BASE}/${IG_GRAPH_VERSION}/${igUserId}/media_publish`
    const body = new URLSearchParams({
        creation_id: containerId,
        access_token: accessToken,
    })

    const res = await fetch(url, { method: 'POST', body })
    const data = await res.json()

    if (!res.ok || !data.id) {
        return { ok: false, error: data?.error?.message || 'Failed to publish Instagram media.' }
    }
    return { ok: true, mediaId: data.id }
}

/** Fetches the public permalink for an already-published media object. */
export async function getInstagramPermalink(mediaId: string, accessToken: string): Promise<string | null> {
    const url = new URL(`${IG_GRAPH_BASE}/${IG_GRAPH_VERSION}/${mediaId}`)
    url.searchParams.set('fields', 'permalink')
    url.searchParams.set('access_token', accessToken)

    const res = await fetch(url.toString())
    const data = await res.json()
    if (!res.ok) return null
    return data.permalink ?? null
}