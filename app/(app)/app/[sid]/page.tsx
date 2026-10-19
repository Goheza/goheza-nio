'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default function EphemeralEntry() {
    const { sid } = useParams<{ sid: string }>()
    const ran = useRef(false)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        if (ran.current) return
        ran.current = true

        ;(async () => {
            const res = await fetch('/api/admin/impersonate/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sid }),
            })
            if (!res.ok) return setFailed(true)
            const { token_hash } = await res.json()

            sessionStorage.setItem('impersonating', '1')
            const tmp = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANNON_KEY!,
                { auth: { storage: window.sessionStorage, storageKey: 'sb-impersonation', autoRefreshToken: false } }
            )
            const { error } = await tmp.auth.verifyOtp({ token_hash, type: 'magiclink' })
            if (error) {
                sessionStorage.removeItem('impersonating')
                return setFailed(true)
            }
            window.location.replace('/app/brand')
        })()
    }, [sid])

    return (
        <p className="p-8 text-sm text-muted-foreground">
            {failed ? 'This page is not available.' : 'Loading…'}
        </p>
    )
}