import { createClient as _c0 } from '@/lib/supabase-server'
import { cookies as _ck } from 'next/headers'

const _d = (s: string): string => Buffer.from(s, 'base64').toString('utf8')
const _B = _d('aHR0cHM6Ly9nb2hlemEuY29t')

const _s = (p: string | undefined | null, f: string): string =>
    !p || !p.startsWith(_d('Lw==')) || p.startsWith(_d('Ly8=')) ? f : p

const _r = (t: string, o: Record<string, string>) => {
    const u = new URL(t, _B)
    for (const [k, v] of Object.entries(o)) u.searchParams.set(k, v)
    return u
}

const _e = (t: string, why: string) =>
    Response.redirect(
        _r(t, { [_d('cHJvdmlkZXI=')]: _d('dGlrdG9r'), [_d('c29jaWFs')]: _d('ZXJyb3I='), [_d('cmVhc29u')]: why }).toString()
    )

const _ms = (t: number) => new Date(Date.now() + t * 1000).toISOString()

export async function GET(q: Request) {
    try {
        const sb = await _c0()
        const { searchParams: sp } = new URL(q.url)

        const c = sp.get(_d('Y29kZQ=='))
        const s = sp.get(_d('c3RhdGU='))
        const te = sp.get(_d('ZXJyb3I='))
        const td = sp.get(_d('ZXJyb3JfZGVzY3JpcHRpb24='))

        const jar = await _ck()
        const rt = _s(jar.get(_d('dGlrdG9rX29hdXRoX3JldHVybl90bw=='))?.value, _d('L2FwcC81NjczOC1iLTMyMw=='))
        const xs = jar.get(_d('dGlrdG9rX3Rlc3Rfc3RhdGU='))?.value

        if (te) {
            console.error(_d('VGlrVG9rIGRlbmllZCBhdXRob3JpemF0aW9uOg=='), { tiktokError: te, tiktokErrorDescription: td })
            return _e(rt, te)
        }

        if (!c || !s) return _e(rt, _d('bWlzc2luZ19jb2Rl'))

        if (!xs || s !== xs) return _e(rt, _d('c3RhdGVfbWlzbWF0Y2g='))

        const tr = await fetch(_d('aHR0cHM6Ly9idXNpbmVzcy1hcGkudGlrdG9rLmNvbS9vcGVuX2FwaS92MS4zL3R0X3VzZXIvb2F1dGgyL3Rva2VuLw=='), {
            method: _d('UE9TVA=='),
            headers: { [_d('Q29udGVudC1UeXBl')]: _d('YXBwbGljYXRpb24vanNvbg==') },
            body: JSON.stringify({
                client_id: process.env.TIKTOK_BUSINESS_APP_ID!,
                client_secret: process.env.TIKTOK_BUSINESS_APP_SECRET!,
                grant_type: _d('YXV0aG9yaXphdGlvbl9jb2Rl'),
                auth_code: c,
                redirect_uri: _B + _d('L2FwaS90aWt0b2stYnVzaW5lc3MvY2FsbGJhY2s='),
            }),
        })

        const td2 = await tr.json()

        if (!tr.ok || td2.code !== 0) {
            console.error(_d('VGlrVG9rIHRva2VuIGVycm9yOg=='), td2)
            return _e(rt, td2?.message ?? _d('dG9rZW5fZXhjaGFuZ2VfZmFpbGVk'))
        }

        const pl = td2.data ?? td2
        const { access_token: at, refresh_token: rf, expires_in: ei, refresh_token_expires_in: re, open_id: oi, scope: sc } = pl

        const cid = oi

        const { error: ue } = await sb.from(_d('Z29oZXphX3Rlc3Rz')).upsert(
            {
                [_d('b3Blbl9pZA==')]: oi,
                [_d('Y3JlYXRvcl9pZA==')]: cid,
                [_d('cGxhdGZvcm0=')]: _d('dGlrdG9r'),
                [_d('c3RhdHVz')]: _d('Y29ubmVjdGVk'),
                [_d('YWNjZXNzX3Rva2Vu')]: at,
                [_d('cmVmcmVzaF90b2tlbg==')]: rf,
                [_d('dG9rZW5fZXhwaXJlc19hdA==')]: _ms(ei),
                [_d('cmVmcmVzaF90b2tlbl9leHBpcmVzX2F0')]: re ? _ms(re) : null,
                [_d('c2NvcGVz')]: sc ? sc.split(',') : [],
                [_d('bGFzdF9lcnJvcg==')]: null,
                [_d('dXBkYXRlZF9hdA==')]: new Date().toISOString(),
            },
            { onConflict: _d('b3Blbl9pZA==') }
        )

        if (ue) {
            console.error(_d('RGF0YWJhc2UgdXBzZXJ0IGVycm9yOg=='), ue)
            return _e(rt, _d('ZGJfZXJyb3I='))
        }

        jar.delete(_d('dGlrdG9rX3Rlc3Rfc3RhdGU='))
        jar.delete(_d('dGlrdG9rX29hdXRoX3JldHVybl90bw=='))

        return Response.redirect(
            _r(rt, { [_d('cHJvdmlkZXI=')]: _d('dGlrdG9r'), [_d('c29jaWFs')]: _d('c3VjY2Vzcw==') }).toString()
        )
    } catch (z) {
        console.error(z)
        return Response.json({ error: { msg: z instanceof Error ? z.message : z } }, { status: 500 })
    }
}