import { NextRequest, NextResponse } from 'next/server'
import { fail, keyHeaders, resolveTargetUser } from '@/lib/tiktok-actor'

export const dynamic = 'force-dynamic'

// Browser-facing wrapper for analytics. Role rules live in lib/tiktok-actor.ts.
//
// POST { view: "insights" | "posts" | "post", userId? (admin only), ...params }
//   insights  { startDate?, endDate?, fields? }
//   posts     { fields?, cursor?, maxCount? }
//   post      { videoUrl | videoId, fields? }
const CORE_PATHS = {
    insights: '/insights',
    posts: '/analytics/posts',
    post: '/analytics/post',
} as const

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => ({}))
    const { view, ...rest } = body as { view?: string; [key: string]: unknown }

    if (typeof view !== 'string' || !Object.prototype.hasOwnProperty.call(CORE_PATHS, view)) {
        return fail(400, 'view must be one of: insights, posts, post')
    }

    const target = await resolveTargetUser(typeof rest.userId === 'string' ? rest.userId : null)
    if (target instanceof NextResponse) return target

    const res = await fetch(
        `${request.nextUrl.origin}/api/tiktok-business${CORE_PATHS[view as keyof typeof CORE_PATHS]}`,
        {
            method: 'POST',
            headers: keyHeaders(),
            body: JSON.stringify({ ...rest, userId: target }),
        },
    )
    return NextResponse.json(await res.json(), { status: res.status })
}
