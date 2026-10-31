import { NextRequest, NextResponse } from 'next/server'
import { fail, keyHeaders, resolveTargetUser } from '@/lib/tiktok-actor'

export const dynamic = 'force-dynamic'

// Browser-facing wrapper. The browser never sees x-api-key: it calls this route with the user's
// session, and this route calls the key-gated publish routes from the server.
// Role rules live in lib/tiktok-actor.ts.

// POST { videoUrl, caption?, uploadToDraft?, ..., userId? (admin only) } -> /publish
export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => ({}))

    const target = await resolveTargetUser(typeof body.userId === 'string' ? body.userId : null)
    if (target instanceof NextResponse) return target

    const res = await fetch(`${request.nextUrl.origin}/api/tiktok-business/publish`, {
        method: 'POST',
        headers: keyHeaders(),
        body: JSON.stringify({ ...body, userId: target }),
    })
    return NextResponse.json(await res.json(), { status: res.status })
}

// GET ?view=status&publishId=...   (default view)
// GET ?view=settings               which toggles / privacy options the account allows
// GET ?view=history                last 20 publishes
// Admins may add &userId=...
export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams

    const target = await resolveTargetUser(params.get('userId'))
    if (target instanceof NextResponse) return target

    const view = params.get('view') ?? 'status'
    const base = `${request.nextUrl.origin}/api/tiktok-business`
    const userQ = `userId=${encodeURIComponent(target)}`

    let url: string
    if (view === 'status') {
        const publishId = params.get('publishId')
        if (!publishId) return fail(400, 'Missing publishId')
        url = `${base}/publish/status?${userQ}&publishId=${encodeURIComponent(publishId)}`
    } else if (view === 'settings') {
        url = `${base}/publish/settings?${userQ}`
    } else if (view === 'history') {
        url = `${base}/publish?${userQ}`
    } else {
        return fail(400, 'Unknown view')
    }

    const res = await fetch(url, { headers: keyHeaders() })
    return NextResponse.json(await res.json(), { status: res.status })
}