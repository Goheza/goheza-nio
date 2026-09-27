import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Requires SUPABASE_SERVICE_ROLE_KEY in the server environment (never exposed to the client).
// This client is created per-request with no session persistence — it's a bare service-role
// client used only to (a) resolve who's calling via their access token, then (b) write with
// elevated privileges once that caller is confirmed to be in `admins`.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

type Resolution = 'approved' | 'rejected'

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    const accessToken = authHeader?.replace(/^Bearer\s+/i, '')
    if (!accessToken) {
        return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })

    // Resolve the calling user from the access token they sent.
    const { data: userData, error: userErr } = await admin.auth.getUser(accessToken)
    if (userErr || !userData?.user) {
        return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 })
    }
    const userId = userData.user.id

    // Confirm admin membership — this is the entire authorization check for this route.
    const { data: adminRow, error: adminErr } = await admin
        .from('admins')
        .select('id, role')
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
    const resolution = body?.resolution as Resolution | undefined
    const overrideCap = Boolean(body?.overrideCap)

    if (!applicationId || (resolution !== 'approved' && resolution !== 'rejected')) {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const { data: application, error: appFetchErr } = await admin
        .from('campaign_applications')
        .select('id, campaign_id, status')
        .eq('id', applicationId)
        .maybeSingle()

    if (appFetchErr || !application) {
        return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    // Cap check only applies to approvals, and only when not overridden.
    if (resolution === 'approved' && !overrideCap) {
        const { data: campaign, error: campErr } = await admin
            .from('campaigns')
            .select('num_creators, approval_cap')
            .eq('id', application.campaign_id)
            .maybeSingle()

        if (campErr || !campaign) {
            return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 })
        }
        const cap = campaign.approval_cap ?? campaign.num_creators ?? 0

        const { count, error: countErr } = await admin
            .from('campaign_applications')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', application.campaign_id)
            .eq('status', 'approved')

        if (countErr) {
            return NextResponse.json({ error: 'Failed to check approval count.' }, { status: 500 })
        }
        if ((count ?? 0) >= cap) {
            return NextResponse.json(
                {
                    error: `Approval limit reached (${cap} creators).`,
                    code: 'CAP_REACHED',
                    cap,
                },
                { status: 409 }
            )
        }
    }

    // Same idempotency guard as the brand flow: only a currently-pending row can be
    // transitioned here, so a double-click or retry can't double-count.
    const { data: updated, error: updateErr } = await admin
        .from('campaign_applications')
        .update({
            status: resolution,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .eq('status', 'pending')
        .select('id')

    if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }
    if (!updated || updated.length === 0) {
        return NextResponse.json(
            { error: 'This application is no longer pending — it may have already been reviewed.' },
            { status: 409 }
        )
    }

    return NextResponse.json({ id: applicationId, status: resolution })
}