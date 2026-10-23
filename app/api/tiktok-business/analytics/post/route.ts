import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getConnectedTestAccount, ensureFreshAccessToken, extractTikTokVideoId } from '@/lib/tiktok-business-test'
import { fetchBusinessVideoList, resolvePostFields } from '@/lib/tiktok-business-posts'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}))
        const raw: string | undefined = body.videoUrl ?? body.videoId

        if (!raw) {
            return NextResponse.json({ success: false, error: 'Missing videoUrl or videoId' }, { status: 400 })
        }

        const videoId = extractTikTokVideoId(raw)
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

        const supabase = await createClient()
        const account = await getConnectedTestAccount(supabase)

        if (!account) {
            return NextResponse.json({ success: false, error: 'No connected TikTok test account found.' }, { status: 400 })
        }

        const accessToken = await ensureFreshAccessToken(supabase, account)

        const { ok, json } = await fetchBusinessVideoList({
            accessToken,
            businessId: account.open_id,
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
                    error: 'Video not found. Check the link, that it belongs to the connected account, and that it was not filtered out (e.g. music copyright).',
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