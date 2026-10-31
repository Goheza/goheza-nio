import { NextRequest, NextResponse } from 'next/server'
import { accountFailure, createServiceClient, loadCreatorAccount, requireApiKey } from '@/lib/tiktok-accounts'
import { getPublishStatus, RETRYABLE_FAILURES } from '@/lib/tiktok-publish'

export const dynamic = 'force-dynamic'

// GET /api/tiktok-business/publish/status?userId=...&publishId=...
// Polling fallback; also syncs the row. The publish must belong to that user.
export async function GET(request: NextRequest) {
    const denied = requireApiKey(request)
    if (denied) return denied

    try {
        const params = request.nextUrl.searchParams
        const userId = params.get('userId')?.trim()
        const publishId = params.get('publishId')?.trim()
        if (!userId || !publishId) {
            return NextResponse.json({ success: false, error: 'Missing userId or publishId' }, { status: 400 })
        }

        const supabase = createServiceClient()

        const { data: row } = await supabase
            .from('tiktok_publishes')
            .select('id')
            .eq('publish_id', publishId)
            .eq('user_id', userId)
            .maybeSingle()
        if (!row) return NextResponse.json({ success: false, error: 'Unknown publishId for this user' }, { status: 404 })

        const loaded = await loadCreatorAccount(supabase, userId)
        if (!loaded.ok) return accountFailure(loaded)
        const { account } = loaded

        const result = await getPublishStatus(account.accessToken, account.businessId, publishId)
        if (!result.ok) {
            return NextResponse.json(
                { success: false, error: result.json?.message ?? 'TikTok status request failed', details: result.json },
                { status: 502 }
            )
        }

        const data = result.json.data ?? {}
        const postIds: string[] = Array.isArray(data.post_ids) ? data.post_ids : []

        await supabase
            .from('tiktok_publishes')
            .update({
                status: data.status,
                reason: data.reason ?? null,
                ...(postIds[0] ? { post_id: postIds[0] } : {}),
                updated_at: new Date().toISOString(),
            })
            .eq('id', row.id)

        return NextResponse.json({
            success: true,
            status: data.status,
            postIds, // can lag up to ~3 min after PUBLISH_COMPLETE; use as filters.video_ids for post insights
            reason: data.reason ?? null,
            retryable: data.reason ? RETRYABLE_FAILURES.has(data.reason) : null,
        })
    } catch (error: any) {
        console.error('Publish status route error:', error)
        return NextResponse.json({ success: false, error: error.message ?? 'Internal server error' }, { status: 500 })
    }
}