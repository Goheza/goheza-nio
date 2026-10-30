// app/api/storage/submission-cleanup/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2, SUBMISSIONS_BUCKET } from '@/lib/storage/r2'
import { getBearerToken, getUserFromRequest } from '@/lib/server/server-auth'

export async function POST(req: Request) {
    const user = await getUserFromRequest(req)
    const token = getBearerToken(req)
    if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { submissionId } = await req.json()
    if (typeof submissionId !== 'string') {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }

    // Query as the caller, so your existing RLS decides whether they can see this row.
    const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: sub } = await userClient
        .from('campaign_submissions')
        .select('video_path, video_bucket, status')
        .eq('id', submissionId)
        .single()

    if (!sub || sub.status !== 'rejected' || sub.video_bucket !== 'r2' || !sub.video_path) {
        return NextResponse.json({ error: 'Nothing to delete' }, { status: 403 })
    }

    await r2.send(new DeleteObjectCommand({ Bucket: SUBMISSIONS_BUCKET, Key: sub.video_path }))
    return NextResponse.json({ ok: true })
}