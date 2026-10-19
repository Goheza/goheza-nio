'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function ImpersonationBanner() {
    const [on, setOn] = useState(false)
    useEffect(() => setOn(sessionStorage.getItem('impersonating') === '1'), [])
    if (!on) return null

    const exit = async () => {
        await supabase.auth.signOut({ scope: 'local' }) // local only, real brand stays logged in
        sessionStorage.removeItem('impersonating')
        window.close()
    }

    return (
        <div className="sticky top-0 z-50 flex items-center justify-between bg-amber-500 px-4 py-2 text-sm font-medium text-black">
            Admin mode: you are viewing this account as the brand.
            <button onClick={exit} className="rounded bg-black/10 px-3 py-1">Exit</button>
        </div>
    )
}