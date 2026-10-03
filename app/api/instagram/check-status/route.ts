import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getValidInstagramAccessToken } from '@/lib/instagram-token'
import { getInstagramContainerStatus, publishInstagramContainer, getInstagramPermalink } from '@/lib/instagram-publish'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANNON_KEY!

async function getCallerUserId(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) return null
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return null
    return data.user.id
}

/**
 * Used by both admin's "Check progress" and the creator's own "Check
 * status" — caller must be either the submission's own creator, or an
 * admin. Unlike TikTok's status check (which only reports state), this
 * route can also ADVANCE the state: once the container reports
 * 'FINISHED', it calls media_publish right here to actually go live,
 * since Instagram has no separate "creator finishes it in-app" step the
 * way TikTok's inbox-draft flow does.
 */
export async function POST(request: NextRequest) {
    try {
        const callerId = await getCallerUserId(request)
        if (!callerId) {
            return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
        }

        const { submissionId } = await request.json()
        if (!submissionId) {
            return NextResponse.json({ error: 'Missing submissionId.' }, { status: 400 })
        }

        const { data: submission, error: subErr } = await supabaseAdmin
            .from('campaign_submissions')
            .select('id, user_id, instagram_container_id')
            .eq('id', submissionId)
            .maybeSingle()
        if (subErr) throw subErr
        if (!submission) {
            return NextResponse.json({ error: 'Submission not found.' }, { status: 404 })
        }

        if (callerId !== submission.user_id) {
            const { data: adminRow, error: adminErr } = await supabaseAdmin
                .from('admins')
                .select('user_id')
                .eq('user_id', callerId)
                .maybeSingle()
            if (adminErr) throw adminErr
            if (!adminRow) {
                return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
            }
        }

        if (!submission.instagram_container_id) {
            return NextResponse.json({ error: 'This submission has not been posted to Instagram yet.' }, { status: 400 })
        }

        const tokenResult = await getValidInstagramAccessToken(submission.user_id)
        if (!tokenResult.ok) {
            const message =
                tokenResult.reason === 'not_connected'
                    ? 'No connected Instagram account found.'
                    : 'This Instagram connection needs to be reconnected.'
            return NextResponse.json({ error: message }, { status: 400 })
        }

        const { data: account, error: accountErr } = await supabaseAdmin
            .from('creator_social_accounts')
            .select('open_id')
            .eq('user_id', submission.user_id)
            .eq('platform', 'instagram')
            .maybeSingle()
        if (accountErr) throw accountErr
        if (!account?.open_id) {
            return NextResponse.json({ error: 'Missing Instagram account id for this creator.' }, { status: 400 })
        }

        const statusResult = await getInstagramContainerStatus(submission.instagram_container_id, tokenResult.accessToken)
        if (!statusResult.ok) {
            return NextResponse.json({ error: statusResult.error }, { status: 400 })
        }

        if (statusResult.status === 'IN_PROGRESS') {
            return NextResponse.json({ status: 'IN_PROGRESS' })
        }

        if (statusResult.status === 'ERROR' || statusResult.status === 'EXPIRED') {
            const reason = statusResult.statusDetail || `Instagram processing ${statusResult.status.toLowerCase()}.`
            await supabaseAdmin
                .from('campaign_submissions')
                .update({ instagram_publish_status: 'failed', instagram_publish_error: reason })
                .eq('id', submission.id)
            return NextResponse.json({ status: statusResult.status, error: reason }, { status: 400 })
        }

        if (statusResult.status === 'FINISHED') {
            const publishResult = await publishInstagramContainer(
                account.open_id,
                tokenResult.accessToken,
                submission.instagram_container_id
            )
            if (!publishResult.ok) {
                await supabaseAdmin
                    .from('campaign_submissions')
                    .update({ instagram_publish_status: 'failed', instagram_publish_error: publishResult.error })
                    .eq('id', submission.id)
                return NextResponse.json({ error: publishResult.error }, { status: 400 })
            }

            const permalink = await getInstagramPermalink(publishResult.mediaId, tokenResult.accessToken)

            const { error: updateErr } = await supabaseAdmin
                .from('campaign_submissions')
                .update({
                    instagram_post_id: publishResult.mediaId,
                    instagram_url: permalink,
                    instagram_publish_status: 'posted',
                    instagram_posted_at: new Date().toISOString(),
                    instagram_publish_error: null,
                })
                .eq('id', submission.id)
            if (updateErr) throw updateErr

            return NextResponse.json({ status: 'PUBLISHED', mediaId: publishResult.mediaId, permalink })
        }

        // status === 'PUBLISHED' already (re-check case) — nothing further to do.
        return NextResponse.json({ status: statusResult.status })
    } catch (error) {
        console.error('Instagram check-status error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}