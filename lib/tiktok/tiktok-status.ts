import { supabase } from '@/lib/supabase'
import type { PublishStatus } from '@/lib/admin-screening'

/**
 * Raw status values returned by TikTok's
 * POST /v2/post/publish/status/fetch/ endpoint.
 * See: https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status
 */
export type TikTokRawStatus =
    | 'PROCESSING_UPLOAD'
    | 'PROCESSING_DOWNLOAD'
    | 'SEND_TO_USER_INBOX'
    | 'PUBLISH_COMPLETE'
    | 'FAILED'

export type TikTokStatusResponse = {
    data?: {
        status?: TikTokRawStatus
        fail_reason?: string
        // Quoted server-side (see /api/tiktok/status) to preserve precision —
        // these are 19-digit snowflake IDs that overflow a JS number.
        publicaly_available_post_id?: string[]
        uploaded_bytes?: number
    }
    error?: {
        code?: string
        message?: string
        log_id?: string
    }
}

/**
 * Maps TikTok's raw status vocabulary onto our own publish_status enum
 * (not_posted | processing | posted | failed — the DB constraint has no
 * dedicated "in inbox" value, so SEND_TO_USER_INBOX collapses to
 * 'processing' here). Callers that need to show inbox-specific guidance
 * should read the raw `data.status` from the response directly, since it
 * isn't persisted at that granularity.
 */
export function mapTikTokStatus(raw: TikTokRawStatus | undefined): PublishStatus {
    switch (raw) {
        case 'PUBLISH_COMPLETE':
            return 'posted'
        case 'FAILED':
            return 'failed'
        case 'PROCESSING_UPLOAD':
        case 'PROCESSING_DOWNLOAD':
        case 'SEND_TO_USER_INBOX':
            return 'processing'
        default:
            // Unknown/unrecognized status from TikTok — treat as still processing
            // rather than silently marking it posted or failed.
            return 'processing'
    }
}

/**
 * Records that a TikTok post was kicked off: stores the publish_id returned
 * by /api/tiktok/upload, flips publish_status to 'processing', and stamps
 * which admin initiated it. Call this right after a successful upload call.
 */
export async function recordTikTokUploadStarted(submissionId: string, publishId: string, adminUserId: string) {
    const { error } = await supabase
        .from('campaign_submissions')
        .update({
            tiktok_publish_id: publishId,
            publish_status: 'processing',
            publish_error: null,
            posted_by: adminUserId,
        })
        .eq('id', submissionId)
    if (error) throw error
}

/**
 * Records the outcome of a manual status check (admin "Check progress" or
 * creator "Check status"): maps TikTok's raw status onto our publish_status
 * enum and stores the public post id / error. Safe to call from either
 * surface — it only ever writes publish_status/tiktok_post_id/posted_at/
 * publish_error, never posted_by or anything admin-specific.
 */
export async function recordTikTokStatusResult(submissionId: string, statusResponse: TikTokStatusResponse) {
    const rawStatus = statusResponse.data?.status
    const publishStatus = mapTikTokStatus(rawStatus)
    const publicPostId = statusResponse.data?.publicaly_available_post_id?.[0] ?? null

    console.log("Tiktok-returned-data",submissionId, statusResponse)

    const update: Record<string, unknown> = {
        publish_status: publishStatus,
    }
    if (publishStatus === 'posted') {
        update.tiktok_post_id = publicPostId
        update.posted_at = new Date().toISOString()
        update.publish_error = null
    } else if (publishStatus === 'failed') {
        update.publish_error = statusResponse.data?.fail_reason ?? statusResponse.error?.message ?? 'Unknown error'
    }

    const { error } = await supabase.from('campaign_submissions').update(update).eq('id', submissionId)
    if (error) throw error
}

/**
 * Records an upload attempt that failed before TikTok even returned a
 * publish_id (e.g. missing token, network error, TikTok rejected the init call).
 */
export async function recordTikTokUploadFailed(submissionId: string, errorMessage: string) {
    const { error } = await supabase
        .from('campaign_submissions')
        .update({
            publish_status: 'failed',
            publish_error: errorMessage,
        })
        .eq('id', submissionId)
    if (error) throw error
}