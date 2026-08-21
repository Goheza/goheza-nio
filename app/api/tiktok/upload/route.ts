// app/api/tiktok/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSignedProxyUrl } from '@/lib/videoProxyToken'
import { getValidTikTokAccessToken } from '@/lib/tiktok-token'

const TIKTOK_UPLOAD_URL = 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            userId,
            videoUrl,
        }: {
            userId?: string // the creator's user_id — used to resolve a fresh token
            videoUrl?: string // raw Supabase Storage URL
        } = body

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
        }
        if (!videoUrl) {
            return NextResponse.json({ error: 'Missing videoUrl' }, { status: 400 })
        }

        // Resolve a guaranteed-fresh TikTok access token right here —
        // refreshes inline if it's expired or close to it — instead of
        // trusting whatever token the client already had lying around.
        const tokenResult = await getValidTikTokAccessToken(userId)
        if (!tokenResult.ok) {
            const message =
                tokenResult.reason === 'not_connected'
                    ? 'Tiktok Account Absent — this creator has no connected TikTok account.'
                    : "This creator's TikTok connection needs to be reconnected before posting."
            return NextResponse.json({ error: message }, { status: 400 })
        }
        const accessToken = tokenResult.accessToken

        let parsedUrl: URL
        try {
            parsedUrl = new URL(videoUrl)
        } catch {
            return NextResponse.json({ error: 'videoUrl is not a valid absolute URL' }, { status: 400 })
        }
        if (parsedUrl.protocol !== 'https:') {
            return NextResponse.json({ error: 'videoUrl must use https' }, { status: 400 })
        }

        // Build a signed URL on our own verified domain that proxies through
        // to the Supabase-hosted video. TikTok pulls from this, not Supabase
        // directly, since only goheza.com is verified in the TikTok dev portal.
        let proxiedVideoUrl: string
        try {
            proxiedVideoUrl = createSignedProxyUrl(videoUrl, {
                baseUrl: 'https://goheza.com',
                expiresInSeconds: 3600, // matches TikTok's 1-hour pull window
            })
        } catch (err) {
            return NextResponse.json(
                { error: err instanceof Error ? err.message : 'Could not build proxy URL' },
                { status: 400 }
            )
        }

        const tiktokResponse = await fetch(TIKTOK_UPLOAD_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({
                source_info: {
                    source: 'PULL_FROM_URL',
                    video_url: proxiedVideoUrl,
                },
            }),
        })

        const tiktokData = await tiktokResponse.json()

        if (!tiktokResponse.ok) {
            return NextResponse.json(
                {
                    error: 'TikTok upload initialization failed',
                    details: tiktokData,
                },
                { status: tiktokResponse.status }
            )
        }

        // TikTok can return HTTP 200 with an error code in the body
        // (e.g. url_ownership_unverified if goheza.com isn't verified yet).
        if (tiktokData?.error?.code && tiktokData.error.code !== 'ok') {
            return NextResponse.json(
                {
                    error: 'TikTok upload initialization failed',
                    details: tiktokData,
                },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            data: tiktokData.data, // { publish_id }
        })
    } catch (error) {
        console.error('TikTok upload error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}