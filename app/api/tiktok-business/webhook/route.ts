import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/tiktok-accounts'
import { mapPublishEvent } from '@/lib/tiktok-publish'

export const dynamic = 'force-dynamic'

// POST /api/tiktok-business/webhook
// PUBLIC on purpose: TikTok calls it, so it cannot carry our x-api-key.
// The webhook docs shown did not describe signature verification. We only act on events whose
// publish_id matches a row we created (an unguessable id), and only ever update that row.
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null)
        if (!body) return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })

        const { event, user_openid, content } = body

        let payload: any
        try {
            payload = typeof content === 'string' ? JSON.parse(content) : (content ?? {})
        } catch {
            return NextResponse.json({ success: false, error: 'content is not valid JSON' }, { status: 400 })
        }

        const publishId = payload?.publish_id
        if (typeof event !== 'string' || typeof publishId !== 'string') {
            return NextResponse.json({ received: true, ignored: true })
        }

        const supabase = createServiceClient()

        const { data: row, error } = await supabase
            .from('tiktok_publishes')
            .select('id, status, open_id')
            .eq('publish_id', publishId)
            .maybeSingle()

        if (error) {
            console.error('Webhook lookup failed:', error.message)
            return NextResponse.json({ success: false, error: 'lookup_failed' }, { status: 500 }) // non-2xx so TikTok can retry
        }
        if (!row) return NextResponse.json({ received: true, ignored: true })

        if (user_openid && row.open_id && user_openid !== row.open_id) {
            console.warn('Webhook user_openid differs from stored open_id', { publishId })
        }

        const mapped = mapPublishEvent(event, payload)
        if (!mapped) return NextResponse.json({ received: true, ignored: true })

        // Events can arrive out of order: never move a later state back to DOWNLOADED.
        if (mapped.status === 'DOWNLOADED' && ['PUBLISH_COMPLETE', 'UNPUBLISHED'].includes(row.status)) {
            return NextResponse.json({ received: true, ignored: true })
        }

        const now = new Date().toISOString()
        const { error: updateError } = await supabase
            .from('tiktok_publishes')
            .update({
                status: mapped.status,
                reason: mapped.reason ?? null,
                ...(mapped.post_id ? { post_id: mapped.post_id } : {}),
                last_event: event,
                last_event_at: now,
                updated_at: now,
            })
            .eq('id', row.id)

        if (updateError) {
            console.error('Webhook update failed:', updateError.message)
            return NextResponse.json({ success: false, error: 'update_failed' }, { status: 500 })
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 })
    }
}