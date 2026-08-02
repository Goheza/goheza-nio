import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { ensureFreshAccessToken, initTikTokBusinessPublish, TikTokError } from '@/lib/server/tiktok'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    let adminUserId: string
    try {
        ;({ adminUserId } = await requireAdmin(req.headers.get('authorization')))
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { id: submissionId } = await params

    const { data: submission, error: subErr } = await supabaseAdmin
        .from('campaign_submissions')
        .select('id, user_id, campaign_id, video_url, caption, status, publish_status')
        .eq('id', submissionId)
        .maybeSingle()

    if (subErr || !submission) {
        return NextResponse.json({ error: 'Submission not found.' }, { status: 404 })
    }
    if (submission.status !== 'approved') {
        return NextResponse.json({ error: 'Only approved submissions can be published.' }, { status: 400 })
    }
    if (submission.publish_status === 'processing') {
        return NextResponse.json({ error: 'This submission is already being published.' }, { status: 409 })
    }
    if (submission.publish_status === 'posted') {
        return NextResponse.json({ error: 'This submission has already been posted to TikTok.' }, { status: 409 })
    }

    const { data: social, error: socialErr } = await supabaseAdmin
        .from('creator_social_accounts')
        .select('open_id, business_id, access_token, refresh_token, token_expires_at')
        .eq('user_id', submission.user_id)
        .eq('platform', 'tiktok')
        .maybeSingle()

    if (socialErr || !social || !social.access_token) {
        return NextResponse.json(
            { error: "This creator's TikTok publishing credentials are missing. They need to reconnect TikTok." },
            { status: 422 }
        )
    }

    try {
        const { accessToken, refreshed } = await ensureFreshAccessToken(social)
        if (refreshed) {
            await supabaseAdmin
                .from('creator_social_accounts')
                .update({
                    access_token: refreshed.access_token,
                    refresh_token: refreshed.refresh_token,
                    token_expires_at: refreshed.expires_at,
                })
                .eq('user_id', submission.user_id)
                .eq('platform', 'tiktok')
        }

        const { publishId } = await initTikTokBusinessPublish({
            accessToken,
            businessId: social.business_id || social.open_id,
            videoUrl: submission.video_url,
            caption: submission.caption ?? '',
        })

        await supabaseAdmin
            .from('campaign_submissions')
            .update({
                publish_status: 'processing',
                tiktok_publish_id: publishId,
                posted_by: adminUserId,
                publish_error: null,
            })
            .eq('id', submissionId)

        return NextResponse.json({ publishId, status: 'processing' })
    } catch (err) {
        const message = err instanceof TikTokError ? err.message : 'Failed to start TikTok publish.'
        await supabaseAdmin
            .from('campaign_submissions')
            .update({ publish_status: 'failed', publish_error: message })
            .eq('id', submissionId)
        return NextResponse.json({ error: message }, { status: 502 })
    }
}
