//app/api/tiktok/video/post/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getTikTokAccountByUserId } from '@/lib/server/creator-social'
import { ensureFreshAccessToken,TikTokError,VIDEO_FIELDS,tiktokFetch } from '@/lib/server/tiktok'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'


export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { userId, video_url, caption, disable_comment, disable_duet, disable_stitch } = body

        if (!userId || !video_url) {
            return NextResponse.json({ success: false, error: 'userId and video_url are required' }, { status: 400 })
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

        const data = await tiktokFetch('/business/video/publish/', tiktokAccount.access_token, {
            method: 'POST',
            body: {
                business_id: tiktokAccount.business_id || tiktokAccount.open_id,
                video_url,
                title: caption || '',
                disable_comment: disable_comment ?? false,
                disable_duet: disable_duet ?? false,
                disable_stitch: disable_stitch ?? false,
            },
        })

        return NextResponse.json({
            success: true,
            data,
            message: 'Video publish request submitted',
        })
    } catch (err) {
        if (err instanceof TikTokError) {
            return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: 400 })
        }
        console.error(err)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

