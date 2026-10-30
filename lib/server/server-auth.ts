// lib/server-auth.ts
import { createClient } from '@supabase/supabase-js'

export function getBearerToken(req: Request) {
    return req.headers.get('authorization')?.replace('Bearer ', '') ?? null
}

export async function getUserFromRequest(req: Request) {
    const token = getBearerToken(req)
    if (!token) return null

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANNON_KEY!
    )
    const { data, error } = await supabase.auth.getUser(token)
    return error ? null : data.user
}