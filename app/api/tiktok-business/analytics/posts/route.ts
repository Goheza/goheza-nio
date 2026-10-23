import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getConnectedTestAccount, ensureFreshAccessToken } from '@/lib/tiktok-business-test'
import { fetchBusinessVideoList, resolvePostFields } from '@/lib/tiktok-business-posts'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}))
        const { cursor, maxCount } = body as { cursor?: number; maxCount?: number }

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