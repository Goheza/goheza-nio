import { NextRequest, NextResponse } from 'next/server'

const TIKTOK_STATUS_URL = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/'

/**
 * TikTok's publicaly_available_post_id values are 19-digit snowflake-style
 * integers (e.g. 7521234567890123456), which exceed Number.MAX_SAFE_INTEGER
 * (9007199254740991). A plain JSON.parse silently rounds these to the
 * nearest representable float, corrupting the id. We patch the raw response
 * text to quote those digits as strings *before* parsing, so precision is
 * preserved end to end.
 */
function preserveBigIntPostIds(rawText: string): string {
    return rawText.replace(/"publicaly_available_post_id"\s*:\s*\[([^\]]*)\]/g, (_match, inner: string) => {
        const fixedInner = inner
            .split(',')
            .map((token) => {
                const trimmed = token.trim()
                if (trimmed === '' || trimmed.startsWith('"')) return trimmed
                return `"${trimmed}"`
            })
            .join(',')
        return `"publicaly_available_post_id": [${fixedInner}]`
    })
}

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

        const rawText = await response.text()
        const data = JSON.parse(preserveBigIntPostIds(rawText))

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