import { NextRequest, NextResponse } from 'next/server'
import { accountFailure, createServiceClient, loadCreatorAccount, requireApiKey } from '@/lib/tiktok-accounts'
import { fetchBusinessVideoList, resolvePostFields } from '@/lib/tiktok-business-posts'

export const dynamic = 'force-dynamic'

// POST /api/tiktok-business/analytics/posts   (x-api-key; browsers go through analytics-ui)
// { userId, fields?, cursor?, maxCount? }
export async function POST(request: NextRequest) {
    const denied = requireApiKey(request)
    if (denied) return denied

    try {
        const body = await request.json().catch(() => ({}))
        const { cursor, maxCount } = body as { cursor?: number; maxCount?: number }

        const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
        if (!userId) return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })

        if (cursor !== undefined && !Number.isInteger(cursor)) {
            return NextResponse.json(
                { success: false, error: 'cursor must be an integer (Unix timestamp in ms).' },
                { status: 400 }
            )
        }
        if (maxCount !== undefined && (!Number.isInteger(maxCount) || maxCount < 1 || maxCount > 20)) {
            return NextResponse.json(
                { success: false, error: 'maxCount must be an integer between 1 and 20.' },
                { status: 400 }
            )
        }

        const resolved = resolvePostFields(body.fields)
        if ('error' in resolved) {
            return NextResponse.json({ success: false, error: resolved.error }, { status: 400 })
        }

        const supabase = createServiceClient()
        const loaded = await loadCreatorAccount(supabase, userId)
        if (!loaded.ok) return accountFailure(loaded)
        const { account } = loaded

        const { ok, json } = await fetchBusinessVideoList({
            accessToken: account.accessToken,
            businessId: account.businessId,
            fields: resolved.fields,
            cursor,
            maxCount,
        })

        if (!ok) {
            console.error('TikTok post list error:', json)
            return NextResponse.json(
                { success: false, error: json.message ?? 'TikTok post list request failed', details: json },
                { status: 502 }
            )
        }

        // Can be fewer than maxCount even when hasMore is true (trust & safety filtering).
        return NextResponse.json({
            success: true,
            requestId: json.request_id,
            videos: json.data?.videos ?? [],
            cursor: json.data?.cursor ?? null,
            hasMore: json.data?.has_more ?? false,
        })
    } catch (error: any) {
        console.error('Post list route error:', error)
        return NextResponse.json({ success: false, error: error.message ?? 'Internal server error' }, { status: 500 })
    }
}