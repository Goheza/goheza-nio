import { NextRequest, NextResponse } from 'next/server'
import { accountFailure, createServiceClient, loadCreatorAccount, requireApiKey } from '@/lib/tiktok-accounts'
import { parsePublishInput, buildPostInfo, getVideoSettings, publishVideo } from '@/lib/tiktok-publish'

export const dynamic = 'force-dynamic'

// Videos are served straight from storage on this host (no proxy). It is the URL property
// that must be verified in TikTok. Redirects are not followed, so it must answer with the file itself.
const ALLOWED_VIDEO_HOSTS = ['media.goheza.com']
const DAILY_LIMIT = 15 // TikTok: 15 API posts/day and 6/min per account (the per-minute cap is enforced by TikTok)

// POST /api/tiktok-business/publish   (x-api-key; the caller decides which user)
// { userId, videoUrl, caption?, disableComment?, disableDuet?, disableStitch?, thumbnailOffset?,
//   isAiGenerated?, uploadToDraft?, isBrandOrganic?, isBrandedContent? }
export async function POST(request: NextRequest) {
    const denied = requireApiKey(request)
    if (denied) return denied

    try {
        const body = await request.json().catch(() => ({}))

        const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
        if (!userId) return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })

        const parsed = parsePublishInput(body, ALLOWED_VIDEO_HOSTS)
        if ('error' in parsed) {
            return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
        }
        const input = parsed.input

        const supabase = createServiceClient()
        const loaded = await loadCreatorAccount(supabase, userId)
        if (!loaded.ok) return accountFailure(loaded)
        const account = loaded.account

        // Fail early with a clear message if the creator never granted the needed permission.
        // (Skipped when scopes are empty, since then we cannot tell.)
        const neededScope = input.uploadToDraft ? 'video.upload' : 'video.publish'
        if (account.scopes.length > 0 && !account.scopes.includes(neededScope)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `This TikTok connection is missing the ${neededScope} permission. The creator needs to reconnect.`,
                    code: 'missing_scope',
                },
                { status: 409 }
            )
        }

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { count } = await supabase
            .from('tiktok_publishes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', since)
        if ((count ?? 0) >= DAILY_LIMIT) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Daily publish limit reached (${DAILY_LIMIT} posts per 24h per account).`,
                    code: 'daily_limit',
                },
                { status: 429 }
            )
        }

        // Pre-flight: a setting the account has switched off can only be sent as "disabled".
        const adjusted: string[] = []
        const settings = await getVideoSettings(account.accessToken, account.businessId)
        if (settings.ok) {
            const s = settings.json.data ?? {}
            if (s.comment_disabled && input.disableComment !== true) {
                input.disableComment = true
                adjusted.push('disableComment')
            }
            if (s.duet_disabled && input.disableDuet !== true) {
                input.disableDuet = true
                adjusted.push('disableDuet')
            }
            if (s.stitch_disabled && input.disableStitch !== true) {
                input.disableStitch = true
                adjusted.push('disableStitch')
            }
        } else {
            console.warn('Settings pre-flight failed, publishing anyway:', settings.json?.message)
        }

        const result = await publishVideo({
            accessToken: account.accessToken,
            businessId: account.businessId,
            videoUrl: input.videoUrl,
            postInfo: buildPostInfo(input),
        })

        if (!result.ok) {
            console.error('TikTok publish error:', result.json)
            return NextResponse.json(
                { success: false, error: result.json?.message ?? 'TikTok publish request failed', details: result.json },
                { status: 502 }
            )
        }

        const publishId: string | undefined = result.json.data?.share_id
        if (!publishId) {
            return NextResponse.json(
                { success: false, error: 'TikTok returned no share_id', details: result.json },
                { status: 502 }
            )
        }

        const { error: insertError } = await supabase.from('tiktok_publishes').insert({
            user_id: userId,
            social_account_id: account.accountId,
            open_id: account.openId,
            publish_id: publishId,
            status: 'PROCESSING_DOWNLOAD',
            upload_to_draft: input.uploadToDraft ?? false,
            caption: input.caption ?? null,
            source_video_url: input.videoUrl,
            request_id: result.json.request_id ?? null,
        })
        if (insertError) console.error('Failed to store publish row:', insertError.message)

        return NextResponse.json(
            {
                success: true,
                publishId,
                requestId: result.json.request_id,
                adjusted,
                ...(insertError ? { warning: 'Published, but the tracking row was not saved.' } : {}),
            },
            { status: 202 }
        )
    } catch (error: any) {
        console.error('Publish route error:', error)
        return NextResponse.json({ success: false, error: error.message ?? 'Internal server error' }, { status: 500 })
    }
}

// GET /api/tiktok-business/publish?userId=...   -> last 20 publishes (all users if userId is omitted)
export async function GET(request: NextRequest) {
    const denied = requireApiKey(request)
    if (denied) return denied

    try {
        const userId = request.nextUrl.searchParams.get('userId')?.trim()
        const supabase = createServiceClient()

        let query = supabase
            .from('tiktok_publishes')
            .select('publish_id, user_id, status, reason, post_id, upload_to_draft, caption, created_at, updated_at')
            .order('created_at', { ascending: false })
            .limit(20)
        if (userId) query = query.eq('user_id', userId)

        const { data, error } = await query
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, publishes: data })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message ?? 'Internal server error' }, { status: 500 })
    }
}