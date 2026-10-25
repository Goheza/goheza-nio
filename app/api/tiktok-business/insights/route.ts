import { NextRequest as _Q, NextResponse as _R } from 'next/server'
import { createClient as _c0 } from '@/lib/supabase-server'
import { getConnectedTestAccount as _g1, ensureFreshAccessToken as _e2 } from '@/lib/tiktok-business-test'

const _d = (s: string): string => Buffer.from(s, 'base64').toString('utf8')
const _l = (s: string): string[] => JSON.parse(_d(s))
const _u = (): string => {
    const v = process.env['XQ9_7f3a9c1e_UPSTREAM_BIZ_GRAPH_ENDPOINT_RESOLVER_B64_V2_9d41e8b2c6a05f37_SEGMENT_A1']
    if (!v) throw new Error(_d('TWlzc2luZyB1cHN0cmVhbSBlbmRwb2ludCBlbnYgdmFy'))
    return _d(v)
}

const _P = _l('WyJpc19idXNpbmVzc19hY2NvdW50IiwgImhhc19hZHZhbmNlZF9hY2Nlc3MiLCAicHJvZmlsZV9pbWFnZSIsICJkaXNwbGF5X25hbWUiLCAidXNlcm5hbWUiLCAicHJvZmlsZV9kZWVwX2xpbmsiLCAiYmlvX2Rlc2NyaXB0aW9uIiwgImlzX3ZlcmlmaWVkIiwgImZvbGxvd2luZ19jb3VudCIsICJmb2xsb3dlcnNfY291bnQiLCAidG90YWxfbGlrZXMiLCAidmlkZW9zX2NvdW50Il0=')
const _M = _l('WyJ2aWRlb192aWV3cyIsICJ1bmlxdWVfdmlkZW9fdmlld3MiLCAicHJvZmlsZV92aWV3cyIsICJsaWtlcyIsICJjb21tZW50cyIsICJzaGFyZXMiLCAicGhvbmVfbnVtYmVyX2NsaWNrcyIsICJsZWFkX3N1Ym1pc3Npb25zIiwgImFwcF9kb3dubG9hZF9jbGlja3MiLCAiYmlvX2xpbmtfY2xpY2tzIiwgImVtYWlsX2NsaWNrcyIsICJhZGRyZXNzX2NsaWNrcyIsICJkYWlseV90b3RhbF9mb2xsb3dlcnMiLCAiZGFpbHlfbmV3X2ZvbGxvd2VycyIsICJkYWlseV9sb3N0X2ZvbGxvd2VycyIsICJlbmdhZ2VkX2F1ZGllbmNlIiwgImF1ZGllbmNlX2FjdGl2aXR5IiwgImF1ZGllbmNlX2FnZXMiLCAiYXVkaWVuY2VfZ2VuZGVycyIsICJhdWRpZW5jZV9jb3VudHJpZXMiLCAiYXVkaWVuY2VfY2l0aWVzIl0=')
const _A = new Set<string>([..._P, ..._M])
const _D: string[] = [..._P, ..._M]
const _X = new RegExp(_d('XlxkezR9LVxkezJ9LVxkezJ9JA=='))
const _k = (o: Record<string, unknown>, s: number) => _R.json(o, { status: s })
const _f = (m: string, s: number) => _k({ [_d('c3VjY2Vzcw==')]: !1, [_d('ZXJyb3I=')]: m }, s)

export async function POST(r: _Q) {
    try {
        const b: any = await r.json().catch(() => ({}))
        const { startDate: s0, endDate: e0 } = b as { startDate?: string; endDate?: string }
        const q: unknown = b.fields

        if ((s0 && !_X.test(s0)) || (e0 && !_X.test(e0))) {
            return _f(_d('c3RhcnREYXRlIGFuZCBlbmREYXRlIG11c3QgYmUgWVlZWS1NTS1ERCAoVVRDKS4='), 400)
        }

        let f = _D
        if (q !== undefined) {
            if (!Array.isArray(q) || q.length === 0) {
                return _f(_d('ZmllbGRzIG11c3QgYmUgYSBub24tZW1wdHkgYXJyYXkgb2Ygc3RyaW5ncy4='), 400)
            }
            const x = q.filter((i) => typeof i !== 'string' || !_A.has(i))
            if (x.length) return _f(_d('VW5zdXBwb3J0ZWQgZmllbGRzOiA=') + x.join(', '), 400)
            f = q as string[]
        }

        const sb = await _c0()
        const a = await _g1(sb)
        if (!a) return _f(_d('Tm8gY29ubmVjdGVkIFRpa1RvayB0ZXN0IGFjY291bnQgZm91bmQu'), 400)

        const t = await _e2(sb, a)

        const u = new URL(_u())
        u.searchParams.set(_d('YnVzaW5lc3NfaWQ='), a.open_id)
        u.searchParams.set(_d('ZmllbGRz'), JSON.stringify(f))
        if (s0) u.searchParams.set(_d('c3RhcnRfZGF0ZQ=='), s0)
        if (e0) u.searchParams.set(_d('ZW5kX2RhdGU='), e0)

        const h: Record<string, string> = { [_d('QWNjZXNzLVRva2Vu')]: t }
        const p = await fetch(u.toString(), { headers: h })
        const j = await p.json()

        if (!p.ok || j.code !== 0) {
            console.error(_d('VGlrVG9rIGFjY291bnQgaW5zaWdodHMgZXJyb3I6'), j)
            return _k(
                { success: !1, error: j.message ?? _d('VGlrVG9rIGFjY291bnQgaW5zaWdodHMgcmVxdWVzdCBmYWlsZWQ='), details: j },
                502
            )
        }

        return _k({ success: !0, requestId: j.request_id, data: j.data }, 200)
    } catch (z: any) {
        console.error(_d('QWNjb3VudCBpbnNpZ2h0cyByb3V0ZSBlcnJvcjo='), z)
        return _f(z.message ?? _d('SW50ZXJuYWwgc2VydmVyIGVycm9y'), 500)
    }
}