import { NextRequest, NextResponse } from 'next/server'

const TIKTOK_STATUS_URL = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/'

export async function POST(request: NextRequest) {
    try {
        const { accessToken, publishId } = await request.json()

        if (!accessToken) {
            return NextResponse.json({ error: 'Missing access token' }, { status: 400 })
        }

        if (!publishId) {
            return NextResponse.json({ error: 'Missing publish ID' }, { status: 400 })
        }

        const response = await fetch(TIKTOK_STATUS_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                publish_id: publishId,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: 'TikTok status request failed',
                    details: data,
                },
                { status: response.status }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('TikTok status error:', error)

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
