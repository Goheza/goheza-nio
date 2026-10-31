import { NextRequest, NextResponse } from 'next/server'
import { accountFailure, createServiceClient, loadCreatorAccount, requireApiKey } from '@/lib/tiktok-accounts'
import { extractTikTokVideoId } from '@/lib/tiktok-business-test'
import { fetchBusinessVideoList, resolvePostFields } from '@/lib/tiktok-business-posts'

export const dynamic = 'force-dynamic'

// POST /api/tiktok-business/analytics/post   (x-api-key; browsers go through analytics-ui)
// { userId, videoUrl | videoId, fields? }
// postId from a finished publish (publish/status -> postIds) works as videoId.
export async function POST(request: NextRequest) {
    const denied = requireApiKey(request)
    if (denied) return denied

    try {
        const body = await request.json().catch(() => ({}))

        const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
        if (!userId) return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })

        const raw: string | undefined = body.videoUrl ?? body.videoId
        if (!raw) {
            return NextResponse.json({ success: false, error: 'Missing videoUrl or videoId' }, { status: 400 })
        }

        const videoId = extractTikTokVideoId(String(raw))
        if (!videoId) {
            return NextResponse.json(
                { success: false, error: 'Could not extract a video ID from that link' },
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
            filters: { video_ids: [videoId] },
        })

        if (!ok) {
            console.error('TikTok post insights error:', json)
            return NextResponse.json(
                { success: false, error: json.message ?? 'TikTok post insights request failed', details: json },
                { status: 502 }
            )
        }

        const video = json.data?.videos?.[0]
        if (!video) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Video not found. Check the link, that it belongs to this creator, and that it was not filtered out (e.g. music copyright).',
                },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, requestId: json.request_id, videoId, video })
    } catch (error: any) {
        console.error('Post insights route error:', error)
        return NextResponse.json({ success: false, error: error.message ?? 'Internal server error' }, { status: 500 })
    }
}