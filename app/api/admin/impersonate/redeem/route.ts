import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
)

export async function POST(req: Request) {
    const { sid } = await req.json().catch(() => ({}))
    if (typeof sid !== 'string' || sid.length < 20) {
        return NextResponse.json({ error: 'invalid' }, { status: 404 })
    }

    // DELETE ... RETURNING is atomic, so only one caller can ever get the token
    const { data } = await admin
        .from('impersonation_sessions')
        .delete()
        .eq('id', sid)
        .gt('expires_at', new Date().toISOString())
        .select('token_hash')
        .maybeSingle()

    if (!data) return NextResponse.json({ error: 'invalid' }, { status: 404 })
    return NextResponse.json({ token_hash: data.token_hash })
}