import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

const TIKTOK_VIDEO_QUERY_URL = 'https://open.tiktokapis.com/v2/video/query/'

const VIDEO_FIELDS = ['id', 'share_url', 'like_count', 'comment_count', 'share_count', 'view_count'].join(',')

/**
 * Pulls the numeric video id out of a TikTok share URL, e.g.
 * https://www.tiktok.com/@user/video/7521234567890123456?is_from_webapp=1
 * -> "7521234567890123456"
 *
 * Preferred over trusting a stored tiktok_post_id: that column was written
 * from publicaly_available_post_id, a 19-digit number that can get silently
 * rounded by JSON.parse if it ever passes through un-patched parsing. A URL
 * is just a copied string — it was never at risk of that corruption — so
 * it's the more durable source of truth for the actual video id.
 */
function extractVideoIdFromUrl(url: string | null): string | null {
    if (!url) return null
    try {
        const parsed = new URL(url)
        const parts = parsed.pathname.split('/').filter(Boolean)
        const videoIdx = parts.indexOf('video')
        if (videoIdx !== -1 && /^\d+$/.test(parts[videoIdx + 1] ?? '')) {
            return parts[videoIdx + 1]
        }
        // Fallback: last long numeric path segment, in case TikTok's URL
        // shape ever changes and "video" isn't the literal segment name.
        for (let i = parts.length - 1; i >= 0; i--) {
            if (/^\d{5,}$/.test(parts[i])) return parts[i]
        }
        return null
    } catch {
        return null
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Verifies the caller by validating their Supabase session JWT server-side —
 * not by trusting a user id passed in the request body. Requires no
 * cookies/middleware setup, just the bearer token the client already holds
 * from its own session.
 */
async function getCallerUserId(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) return null

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return null
    return data.user.id
}

export async function POST(request: NextRequest) {
    try {
        const brandUserId = await getCallerUserId(request)
        if (!brandUserId) {
            return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
        }

        const { campaignId } = await request.json()
        if (!campaignId) {
            return NextResponse.json({ error: 'Missing campaignId.' }, { status: 400 })
        }

        // Ownership check — this brand must actually own the campaign.
        const { data: campaign, error: campaignErr } = await supabaseAdmin
            .from('campaigns')
            .select('id, created_by')
            .eq('id', campaignId)
            .eq('created_by', brandUserId)
            .maybeSingle()
        if (campaignErr) throw campaignErr
        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 })
        }

        // Eligible if we have SOME way to identify the video on TikTok —
        // either the URL (preferred, see extractVideoIdFromUrl) or the
        // stored tiktok_post_id as a fallback.
        const { data: submissions, error: subsErr } = await supabaseAdmin
            .from('campaign_submissions')
            .select('id, user_id, tiktok_post_id, tiktok_url')
            .eq('campaign_id', campaignId)
            .eq('status', 'approved')
            .or('tiktok_url.not.is.null,tiktok_post_id.not.is.null')
        if (subsErr) throw subsErr

        if (!submissions || submissions.length === 0) {
            return NextResponse.json({ success: true, synced: 0, errors: [] })
        }

        const userIds = [...new Set(submissions.map((s) => s.user_id))]

        const [{ data: socialAccounts, error: socialErr }, { data: creatorProfiles, error: profilesErr }] =
            await Promise.all([
                supabaseAdmin
                    .from('creator_social_accounts')
                    .select('user_id, access_token')
                    .eq('platform', 'tiktok')
                    .in('user_id', userIds),
                supabaseAdmin.from('creator_profiles').select('user_id, display_name, full_name').in('user_id', userIds),
            ])
        if (socialErr) throw socialErr
        if (profilesErr) throw profilesErr

        const tokenByUser = new Map((socialAccounts ?? []).map((a) => [a.user_id, a.access_token as string]))
        const nameByUser = new Map(
            (creatorProfiles ?? []).map((p) => [p.user_id, p.display_name ?? p.full_name ?? 'Unknown creator'])
        )

        const errors: string[] = []
        let synced = 0

        for (const submission of submissions) {
            const creatorName = nameByUser.get(submission.user_id) ?? 'Unknown creator'
            const accessToken = tokenByUser.get(submission.user_id)
            if (!accessToken) {
                errors.push(`${creatorName}: no connected TikTok account.`)
                continue
            }

            const videoId = extractVideoIdFromUrl(submission.tiktok_url) ?? submission.tiktok_post_id
            if (!videoId) {
                errors.push(`${creatorName}: couldn't determine a TikTok video id from the stored link.`)
                continue
            }

            try {
                const url = new URL(TIKTOK_VIDEO_QUERY_URL)
                url.searchParams.set('fields', VIDEO_FIELDS)

                const tiktokRes = await fetch(url.toString(), {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ filters: { video_ids: [videoId] } }),
                })
                const tiktokData = await tiktokRes.json()

                if (!tiktokRes.ok || (tiktokData.error?.code && tiktokData.error.code !== 'ok')) {
                    const reason =
                        tiktokData.error?.message || tiktokData.error?.code || `HTTP ${tiktokRes.status}`
                    errors.push(`${creatorName}: TikTok analytics request failed (${reason}).`)
                    continue
                }

                const video = tiktokData.data?.videos?.[0]
                if (!video) {
                    errors.push(`${creatorName}: video not found on TikTok.`)
                    continue
                }

                const views = video.view_count ?? 0
                const likes = video.like_count ?? 0
                const comments = video.comment_count ?? 0
                const shares = video.share_count ?? 0

                // Source of truth for this detail page. reach/impressions/saves/
                // avg_watch_time/completion_rate are left null — TikTok's Content
                // Posting API doesn't return them (that needs the Business/Ads
                // API tier), and this table's shape is shared with whatever
                // platform gets added next (e.g. Instagram), not TikTok-only.
                const { error: insightErr } = await supabaseAdmin.from('campaign_insights').upsert(
                    {
                        campaign_id: campaignId,
                        media_id: videoId,
                        likes,
                        comments,
                        views,
                        shares,
                        last_updated: new Date().toISOString(),
                    },
                    { onConflict: 'campaign_id,media_id' }
                )
                if (insightErr) throw insightErr

                // Kept in sync purely so unrelated existing code (the campaign
                // picker's totals/budgetUsed, which reads campaign_submissions.views)
                // doesn't go stale. campaign_insights is the source of truth for
                // this analytics page; this is a compatibility write, not a
                // second source of truth.
                // tiktok_post_id is also self-healed here to the correct,
                // URL-derived id — repairs any row that got corrupted by the
                // earlier big-integer JSON.parse precision bug.
                const { error: updateErr } = await supabaseAdmin
                    .from('campaign_submissions')
                    .update({
                        views,
                        tiktok_url: video.share_url ?? undefined,
                        tiktok_post_id: videoId,
                    })
                    .eq('id', submission.id)
                if (updateErr) throw updateErr

                synced += 1
            } catch (err) {
                errors.push(`${creatorName}: ${err instanceof Error ? err.message : 'sync failed'}.`)
            }
        }

        return NextResponse.json({ success: true, synced, errors })
    } catch (error) {
        console.error('Brand analytics refresh error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}