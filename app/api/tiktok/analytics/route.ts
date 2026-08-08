import { NextRequest, NextResponse } from 'next/server'

const TIKTOK_VIDEO_QUERY_URL = 'https://open.tiktokapis.com/v2/video/query/'

const VIDEO_FIELDS = [
    'id',
    'create_time',
    'cover_image_url',
    'share_url',
    'video_description',
    'duration',
    'height',
    'width',
    'title',
    'like_count',
    'comment_count',
    'share_count',
    'view_count',
].join(',')

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const {
            accessToken,
            videoId,
        }: {
            accessToken?: string
            videoId?: string
        } = body

        if (!accessToken) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing TikTok access token',
                },
                { status: 400 }
            )
        }

        if (!videoId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing TikTok video ID',
                },
                { status: 400 }
            )
        }

        const url = new URL(TIKTOK_VIDEO_QUERY_URL)

        url.searchParams.set('fields', VIDEO_FIELDS)

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filters: {
                    video_ids: [videoId],
                },
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'TikTok analytics request failed',
                    details: data,
                },
                { status: response.status }
            )
        }

        if (data.error?.code && data.error.code !== 'ok') {
            return NextResponse.json(
                {
                    success: false,
                    error: data.error.message || 'TikTok API error',
                    code: data.error.code,
                    details: data,
                },
                { status: 400 }
            )
        }

        const video = data.data?.videos?.[0]

        if (!video) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'TikTok video not found',
                },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            video: {
                id: video.id,
                title: video.title,
                description: video.video_description,
                shareUrl: video.share_url,
                coverImageUrl: video.cover_image_url,

                views: video.view_count ?? 0,
                likes: video.like_count ?? 0,
                comments: video.comment_count ?? 0,
                shares: video.share_count ?? 0,

                createTime: video.create_time,
                duration: video.duration,
            },
        })
    } catch (error) {
        console.error('TikTok analytics error:', error)

        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
            },
            { status: 500 }
        )
    }
}
