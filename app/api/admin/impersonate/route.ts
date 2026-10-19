import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
)

export async function POST(req: Request) {
    const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user: caller } } = await admin.auth.getUser(jwt)
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Same check as getProfile(), using the admins table
    const { data: isAdmin } = await admin
        .from('admins').select('user_id').eq('user_id', caller.id).maybeSingle()
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { brandUserId, reason } = await req.json()
    if (!brandUserId || !reason?.trim()) {
        return NextResponse.json({ error: 'Reason required' }, { status: 400 })
    }

    const { data: target, error: targetErr } = await admin.auth.admin.getUserById(brandUserId)
    if (targetErr || !target.user?.email) {
        return NextResponse.json({ error: 'Brand user not found' }, { status: 404 })
    }

    await admin.from('impersonation_logs').insert({
        admin_id: caller.id, brand_user_id: brandUserId, reason,
    })

    const { data, error } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: target.user.email,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const sid = randomBytes(32).toString('base64url')
    const { error: insErr } = await admin.from('impersonation_sessions').insert({
        id: sid,
        token_hash: data.properties.hashed_token,
        admin_id: caller.id,
        brand_user_id: brandUserId,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
    })
    if (insErr) return NextResponse.json({ error: 'Failed' }, { status: 500 })

    return NextResponse.json({ url: `${new URL(req.url).origin}/app/${sid}` })
}