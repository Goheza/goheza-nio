// app/api/tiktok/video-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifySignedProxyUrl } from '@/lib/videoProxyToken'

// Video downloads can take a while on a slow connection to Supabase;
// give this route more headroom than the default (adjust for your host/plan).
export const maxDuration = 300

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    const exp = searchParams.get('exp')
    const sig = searchParams.get('sig')

    if (!url || !exp || !sig) {
        return NextResponse.json({ error: 'Missing url, exp, or sig' }, { status: 400 })
    }

    let supabaseUrl: string
    try {
        supabaseUrl = verifySignedProxyUrl(url, exp, sig)
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid proxy link' }, { status: 403 })
    }

    // Forward Range headers in case TikTok's fetcher makes ranged requests.
    const range = request.headers.get('range')

    const upstream = await fetch(supabaseUrl, {
        method: 'GET',
        headers: range ? { Range: range } : undefined,
        redirect: 'follow', // resolve any redirect ourselves, TikTok only sees this response
    })

    if (!upstream.ok && upstream.status !== 206) {
        return NextResponse.json(
            { error: 'Failed to fetch video from storage', status: upstream.status },
            { status: 502 }
        )
    }

    const headers = new Headers()
    headers.set('Content-Type', upstream.headers.get('content-type') ?? 'video/mp4')
    const contentLength = upstream.headers.get('content-length')
    if (contentLength) headers.set('Content-Length', contentLength)
    const contentRange = upstream.headers.get('content-range')
    if (contentRange) headers.set('Content-Range', contentRange)
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Cache-Control', 'private, max-age=3600')

    // Stream the body straight through — never buffer the whole file in memory.
    return new NextResponse(upstream.body, {
        status: upstream.status,
        headers,
    })
}
