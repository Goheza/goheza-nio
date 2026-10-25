import _x from 'crypto'
import { cookies as _ck } from 'next/headers'

const _d = (s: string): string => Buffer.from(s, 'base64').toString('utf8')
const _B = _d('aHR0cHM6Ly9nb2hlemEuY29t')
const _S = JSON.parse(_d('WyJ1c2VyLmluZm8uYmFzaWMiLCAidmlkZW8ubGlzdCIsICJ2aWRlby5pbnNpZ2h0cyIsICJ2aWRlby5wdWJsaXNoIiwgInZpZGVvLnVwbG9hZCIsICJiaXouY3JlYXRvci5pbmZvIiwgImJpei5jcmVhdG9yLmluc2lnaHRzIiwgInVzZXIuaW5mby51c2VybmFtZSIsICJ1c2VyLmluZm8uc3RhdHMiLCAidXNlci5pbmZvLnByb2ZpbGUiLCAidXNlci5hY2NvdW50LnR5cGUiLCAidXNlci5pbnNpZ2h0cyIsICJjb21tZW50Lmxpc3QiLCAiY29tbWVudC5saXN0Lm1hbmFnZSJd')) as string[]

const _o = {
    [_d('aHR0cE9ubHk=')]: !0,
    [_d('c2VjdXJl')]: !0,
    [_d('bWF4QWdl')]: 0x258,
    [_d('cGF0aA==')]: _d('Lw=='),
    [_d('c2FtZVNpdGU=')]: _d('bGF4'),
} as any

export async function POST(q: Request) {
    try {
        const b: any = await q.json().catch(() => ({}))
        const rt: string = b.returnTo ?? _d('L2FwcC81NjczOC1iLTMyMw==')

        const st = _x.randomBytes(0x10).toString(_d('aGV4') as BufferEncoding)

        const jar = await _ck()
        jar.set(_d('dGlrdG9rX3Rlc3Rfc3RhdGU='), st, _o)
        jar.set(_d('dGlrdG9rX29hdXRoX3JldHVybl90bw=='), rt, _o)

        const ck = process.env.TIKTOK_BUSINESS_APP_ID!
        const ru = _B + _d('L2FwaS90aWt0b2stYnVzaW5lc3MvY2FsbGJhY2s=')

        const au =
            _d('aHR0cHM6Ly93d3cudGlrdG9rLmNvbS92Mi9hdXRoL2F1dGhvcml6ZS8/') +
            _d('Y2xpZW50X2tleT0=') + ck + _d('Jg==') +
            _d('c2NvcGU9') + encodeURIComponent(_S.join(_d('LA=='))) + _d('Jg==') +
            _d('cmVzcG9uc2VfdHlwZT1jb2RlJg==') +
            _d('cmVkaXJlY3RfdXJpPQ==') + encodeURIComponent(ru) + _d('Jg==') +
            _d('c3RhdGU9') + st

        return Response.json({ [_d('YXV0aFVybA==')]: au })
    } catch (z) {
        console.error(z)
        return Response.json({ error: _d('R2VuZXJhdGlvbiBmYWlsZWQ=') }, { status: 500 })
    }
}