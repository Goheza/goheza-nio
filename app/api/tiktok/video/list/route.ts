//app/api/tiktok/video/list/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getTikTokAccountByUserId } from '@/lib/server/creator-social'
import { ensureFreshAccessToken,TikTokError,VIDEO_FIELDS,tiktokFetch } from '@/lib/server/tiktok'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const cursor = searchParams.get('cursor') || undefined
        const maxCount = searchParams.get('max_count') || '20'

        if (!userId) {
            return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
        }

        const tiktokAccount = await getTikTokAccountByUserId(userId)
        if (!tiktokAccount) {
            return NextResponse.json({ success: false, error: 'User has not connected TikTok' }, { status: 400 })
        }
        const { accessToken, refreshed } = await ensureFreshAccessToken(tiktokAccount)
        if (refreshed) {
            const supabaseAdmin = getSupabaseAdmin()
            await supabaseAdmin
                .from('creator_social_accounts')
                .update({
                    access_token: refreshed.access_token,
                    refresh_token: refreshed.refresh_token,
                    token_expires_at: refreshed.expires_at,
                })
                .eq('user_id', userId)
                .eq('platform', 'tiktok')
        }

        const data = await tiktokFetch('/business/video/list/', accessToken, {
            params: { business_id: tiktokAccount.business_id || tiktokAccount.open_id /* ...unchanged... */ },
        })
        return NextResponse.json({
            success: true,
            data: data.videos || data,
            cursor: data.cursor,
            has_more: data.has_more,
        })
    } catch (err) {
        if (err instanceof TikTokError) {
            return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: 400 })
        }
        console.error(err)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
