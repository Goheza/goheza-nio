import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getValidInstagramAccessToken } from '@/lib/instagram-token'
import { createInstagramContainer } from '@/lib/instagram-publish'

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
 * Kicks off an Instagram post - creates the media container and returns
 * immediately. Deliberately does NOT poll until the video finishes
 * processing in this same request: Reels processing time is unpredictable
 * (seconds to a few minutes), which risks exceeding a serverless
 * function's execution limit. Use /api/instagram/check-status - called
 * manually, mirroring TikTok's "Check progress" pattern - to advance the
 * container to actually publishing once it's ready.
 */
export async function POST(request: NextRequest) {
    try {
        const callerId = await getCallerUserId(request)
        if (!callerId) {
            return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
        }

        const { data: adminRow, error: adminErr } = await supabaseAdmin
            .from('admins')
            .select('user_id')
            .eq('user_id', callerId)
            .maybeSingle()
        if (adminErr) throw adminErr
        if (!adminRow) {
            return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
        }

        const { submissionId } = await request.json()
        if (!submissionId) {
            return NextResponse.json({ error: 'Missing submissionId.' }, { status: 400 })
        }

        const { data: submission, error: subErr } = await supabaseAdmin
            .from('campaign_submissions')
            .select('id, user_id, video_url, caption')
            .eq('id', submissionId)
            .maybeSingle()
        if (subErr) throw subErr
        if (!submission) {
            return NextResponse.json({ error: 'Submission not found.' }, { status: 404 })
        }

        const tokenResult = await getValidInstagramAccessToken(submission.user_id)
        if (!tokenResult.ok) {
            const message =
                tokenResult.reason === 'not_connected'
                    ? 'Instagram Account Absent - this creator has no connected Instagram account.'
                    : "This creator's Instagram connection needs to be reconnected before posting."
            return NextResponse.json({ error: message }, { status: 400 })
        }

        // The Instagram-scoped user id is stored in open_id - same column
        // TikTok's open_id uses, just a different platform's id space.
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

        const containerResult = await createInstagramContainer(
            account.open_id,
            tokenResult.accessToken,
            submission.video_url,
            submission.caption ?? undefined
        )

        if (!containerResult.ok) {
            await supabaseAdmin
                .from('campaign_submissions')
                .update({ instagram_publish_status: 'failed', instagram_publish_error: containerResult.error })
                .eq('id', submission.id)
            return NextResponse.json({ error: containerResult.error }, { status: 400 })
        }

        const { error: updateErr } = await supabaseAdmin
            .from('campaign_submissions')
            .update({
                instagram_container_id: containerResult.containerId,
                instagram_publish_status: 'processing',
                instagram_publish_error: null,
                instagram_posted_by: callerId,
            })
            .eq('id', submission.id)
        if (updateErr) throw updateErr

        return NextResponse.json({ success: true, containerId: containerResult.containerId })
    } catch (error) {
        console.error('Instagram post error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}