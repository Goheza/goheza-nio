import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/tiktok-accounts'

// Shared by the browser-facing wrappers (publish-ui, analytics-ui).
//
// Who may do what:
//   admin    acts as any user (pass userId), or as themselves if userId is omitted
//   creator  acts only as themselves; any userId they send is ignored
//   others   (brands, anonymous) are refused
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const keyHeaders = () => ({ 'Content-Type': 'application/json', 'x-api-key': process.env.BACKEND_API_KEY! })
export const fail = (status: number, error: string) => NextResponse.json({ success: false, error }, { status })

/** Returns the user id to act as, or a NextResponse to send back. */
export async function resolveTargetUser(requestedUserId: string | null | undefined): Promise<string | NextResponse> {
    const session = await createClient()
    const {
        data: { user },
    } = await session.auth.getUser()
    if (!user) return fail(401, 'Unauthorized')

    // The user id comes from the verified session, so the role lookups can use the service client.
    const service = createServiceClient()

    const { data: admin } = await service.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (admin) {
        if (!requestedUserId) return user.id
        if (!UUID_RE.test(requestedUserId)) return fail(400, 'userId must be a uuid')
        return requestedUserId
    }

    const { data: creator } = await service
        .from('creator_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
    if (!creator) return fail(403, 'Only creators and admins can use TikTok features')

    return user.id
}
