import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Requires SUPABASE_SERVICE_ROLE_KEY in the server environment (never NEXT_PUBLIC_*).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

type Decision = 'forward' | 'reject'

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    const accessToken = authHeader?.replace(/^Bearer\s+/i, '')
    if (!accessToken) {
        return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })

    // Resolve the caller from their access token.
    const { data: userData, error: userErr } = await admin.auth.getUser(accessToken)
    if (userErr || !userData?.user) {
        return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 })
    }
    const userId = userData.user.id

    // Authorization: the caller must have a row in `admins`.
    const { data: adminRow, error: adminErr } = await admin
        .from('admins')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

    if (adminErr) {
        return NextResponse.json({ error: 'Failed to verify admin status.' }, { status: 500 })
    }
    if (!adminRow) {
        return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const applicationId = body?.applicationId as string | undefined
    const decision = body?.decision as Decision | undefined

    if (!applicationId || (decision !== 'forward' && decision !== 'reject')) {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    // Forward: the brand can now see the application and review it as usual.
    // Reject: the application never reaches the brand. `status` is also set to
    // 'rejected' so the creator-facing views show the outcome without changes.
    // `reviewed_by` / `reviewed_at` stay untouched; they belong to the brand's decision.
    const patch =
        decision === 'forward'
            ? { admin_status: 'forwarded' }
            : { admin_status: 'rejected', status: 'rejected' }

    // Only an application still awaiting admin review can be screened, so a
    // double-click or a second admin acting at the same time cannot overwrite a decision.
    const { data: updated, error: updateErr } = await admin
        .from('campaign_applications')
        .update({
            ...patch,
            admin_reviewed_by: userId,
            admin_reviewed_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .eq('admin_status', 'pending_admin')
        .select('id')

    if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }
    if (!updated || updated.length === 0) {
        return NextResponse.json(
            { error: 'This application is no longer awaiting admin review.' },
            { status: 409 }
        )
    }

    return NextResponse.json({
        id: applicationId,
        admin_status: patch.admin_status,
    })
}