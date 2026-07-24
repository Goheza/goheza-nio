import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { ensureFreshAccessToken, fetchTikTokPublishStatus, TikTokPublishError } from '@/lib/server/tiktok'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await requireAdmin(req.headers.get('authorization'))
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const submissionId = params.id

    const { data: submission, error: subErr } = await supabaseAdmin
        .from('campaign_submissions')
        .select('id, user_id, publish_status, tiktok_publish_id')
        .eq('id', submissionId)
        .maybeSingle()

    if (subErr || !submission) {
        return NextResponse.json({ error: 'Submission not found.' }, { status: 404 })
    }

    if (submission.publish_status !== 'processing' || !submission.tiktok_publish_id) {
        return NextResponse.json({ status: submission.publish_status })
    }

    const { data: social } = await supabaseAdmin
        .from('creator_social_accounts')
        .select('open_id, access_token, refresh_token, token_expires_at')
        .eq('user_id', submission.user_id)
        .eq('platform', 'tiktok')
        .maybeSingle()

    if (!social?.access_token) {
        return NextResponse.json({ error: 'Missing TikTok credentials to check status.' }, { status: 422 })
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

        const result = await fetchTikTokPublishStatus({ accessToken, publishId: submission.tiktok_publish_id })

        if (result.state === 'posted') {
            await supabaseAdmin
                .from('campaign_submissions')
                .update({
                    publish_status: 'posted',
                    tiktok_post_id: result.postId,
                    posted_at: new Date().toISOString(),
                    publish_error: null,
                })
                .eq('id', submissionId)
            return NextResponse.json({ status: 'posted', tiktokPostId: result.postId })
        }

        if (result.state === 'failed') {
            await supabaseAdmin
                .from('campaign_submissions')
                .update({ publish_status: 'failed', publish_error: result.reason })
                .eq('id', submissionId)
            return NextResponse.json({ status: 'failed', error: result.reason })
        }

        return NextResponse.json({ status: 'processing' })
    } catch (err) {
        const message = err instanceof TikTokPublishError ? err.message : 'Failed to check TikTok publish status.'
        return NextResponse.json({ error: message }, { status: 502 })
    }
}