import { NextResponse } from 'next/server'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2, SUBMISSIONS_BUCKET } from '@/lib/storage/r2'
import { getUserFromRequest } from '@/lib/server/server-auth'

export async function POST(req: Request) {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { path } = await req.json()

    // Creators can only delete files under their own folder.
    if (typeof path !== 'string' || !path.startsWith(`${user.id}/`) || path.includes('..')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await r2.send(new DeleteObjectCommand({ Bucket: SUBMISSIONS_BUCKET, Key: path }))
    return NextResponse.json({ ok: true })
}