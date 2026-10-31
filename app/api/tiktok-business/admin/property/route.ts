import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/tiktok-accounts'
import { listUrlProperties, addUrlProperty, verifyUrlProperty } from '@/lib/tiktok-publish'

export const dynamic = 'force-dynamic'

// GET /api/tiktok-business/admin/property -> URL properties added to the app and their status
//   property_status: 0 pending, 1 verified, 2 verification failed
export async function GET(request: NextRequest) {
    const denied = requireApiKey(request)
    if (denied) return denied

    try {
        const result = await listUrlProperties()
        if (!result.ok) {
            return NextResponse.json(
                { success: false, error: result.json?.message ?? 'Property list failed', details: result.json },
                { status: 502 }
            )
        }
        return NextResponse.json({ success: true, properties: result.json.data?.url_property_info_list ?? [] })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message ?? 'Internal server error' }, { status: 500 })
    }
}

// POST /api/tiktok-business/admin/property
// { action: "add" | "verify", url, propertyType: 1 | 2 }
//   1 = domain      url "media.goheza.com"           -> add a DNS TXT record with the returned signature
//   2 = URL prefix  url "https://media.goheza.com/"  -> host `file_name` at that path, content = signature
// "verify" request shape is ASSUMED to mirror "add" (the verify doc has not been checked).
export async function POST(request: NextRequest) {
    const denied = requireApiKey(request)
    if (denied) return denied

    try {
        const body = await request.json().catch(() => ({}))
        const { action, url, propertyType } = body as { action?: string; url?: string; propertyType?: number }

        if ((action !== 'add' && action !== 'verify') || !url || (propertyType !== 1 && propertyType !== 2)) {
            return NextResponse.json(
                { success: false, error: 'Provide action ("add" | "verify"), url and propertyType (1 = domain, 2 = URL prefix)' },
                { status: 400 }
            )
        }

        const result =
            action === 'add' ? await addUrlProperty(url, propertyType) : await verifyUrlProperty(url, propertyType)

        if (!result.ok) {
            return NextResponse.json(
                { success: false, error: result.json?.message ?? `Property ${action} failed`, details: result.json },
                { status: 502 }
            )
        }
        return NextResponse.json({ success: true, data: result.json.data })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message ?? 'Internal server error' }, { status: 500 })
    }
}