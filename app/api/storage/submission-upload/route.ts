import { NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2, SUBMISSIONS_BUCKET, SUBMISSIONS_PUBLIC_URL } from '@/lib/storage/r2'
import { getUserFromRequest } from '@/lib/server/server-auth'

const MAX_BYTES = 500 * 1024 * 1024

export async function POST(req: Request) {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { fileName, contentType, size } = await req.json()

    if (typeof contentType !== 'string' || !contentType.startsWith('video/')) {
        return NextResponse.json({ error: 'Only video files are allowed.' }, { status: 400 })
    }
    if (typeof size !== 'number' || size <= 0 || size > MAX_BYTES) {
        return NextResponse.json({ error: 'File is too large.' }, { status: 400 })
    }

    const ext = (String(fileName).split('.').pop() ?? 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '')
    const key = `${user.id}/${crypto.randomUUID()}.${ext}`

    const uploadUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({
            Bucket: SUBMISSIONS_BUCKET,
            Key: key,
            ContentType: contentType,
            ContentLength: size, // signed, so they can't upload something bigger than they declared
        }),
        { expiresIn: 60 * 30 } // 30 min, enough for slow connections
    )

    return NextResponse.json({
        uploadUrl,
        path: key,
        publicUrl: `${SUBMISSIONS_PUBLIC_URL}/${key}`,
    })
}