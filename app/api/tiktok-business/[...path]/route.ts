import { createClient } from '@/lib/supabase-server'

const BACKEND_URL = process.env.BACKEND_URL!     // e.g. https://api.goheza.com
const BACKEND_API_KEY = process.env.BACKEND_API_KEY!

async function proxy(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) return Response.json({ error: 'Not logged in' }, { status: 401 })

    const res = await fetch(`${BACKEND_URL}/api/tiktok-business/${path.join('/')}`, {
        method: req.method,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': BACKEND_API_KEY,
            Authorization: `Bearer ${session.access_token}`,
        },
        body: req.method === 'GET' ? undefined : await req.text(),
    })

    return new Response(await res.text(), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export const GET = proxy
export const POST = proxy