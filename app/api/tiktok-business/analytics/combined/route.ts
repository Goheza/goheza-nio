import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getConnectedTestAccount, ensureFreshAccessToken, extractTikTokVideoId } from '@/lib/tiktok-business-test'

const TTO_VIDEO_LIST_URL = 'https://business-api.tiktok.com/open_api/v1.3/tto/creator/authorized/video/list/'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
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

        const supabase = await createClient()
        const account = await getConnectedTestAccount(supabase)

        if (!account) {
            return NextResponse.json({ success: false, error: 'No connected TikTok test account found.' }, { status: 400 })
        }

        const accessToken = await ensureFreshAccessToken(supabase, account)
        const creatorId = account.creator_id ?? account.open_id

        const url = new URL(TTO_VIDEO_LIST_URL)
        url.searchParams.set('creator_id', creatorId)
        url.searchParams.set('video_ids', JSON.stringify([videoId]))

        const res = await fetch(url.toString(), { headers: { 'Access-Token': accessToken } })
        const json = await res.json()

        if (json.code !== 0) {
            console.error('TikTok video insights error:', json)
            return NextResponse.json(
                { success: false, error: json.message ?? 'TikTok analytics request failed', details: json },
                { status: 502 }
            )
        }

        const video = json.data?.posts?.[0]

        if (!video) {
            return NextResponse.json(
                { success: false, error: 'Video not found — check the link, or that it belongs to the connected account.' },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, videoId, video })
    } catch (error: any) {
        console.error('Video analytics route error:', error)
        return NextResponse.json({ success: false, error: error.message ?? 'Internal server error' }, { status: 500 })
    }
}