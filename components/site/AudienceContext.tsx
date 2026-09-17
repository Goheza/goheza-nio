"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Audience = 'brands' | 'creators'

type Ctx = {
    audience: Audience
    setAudience: (a: Audience) => void
}

const AudienceCtx = createContext<Ctx | null>(null)
const STORAGE_KEY = 'goheza:audience'

export function AudienceProvider({ children }: { children: ReactNode }) {
    const [audience, setAudienceState] = useState<Audience>('creators')

    useEffect(() => {
        try {
            const v = localStorage.getItem(STORAGE_KEY)
            if (v === 'brands' || v === 'creators') setAudienceState(v)
        } catch {}
    }, [])

    const setAudience = (a: Audience) => {
        setAudienceState(a)
        try {
            localStorage.setItem(STORAGE_KEY, a)
        } catch {}
    }

    return <AudienceCtx.Provider value={{ audience, setAudience }}>{children}</AudienceCtx.Provider>
}

export function useAudience() {
    const ctx = useContext(AudienceCtx)
    if (!ctx) throw new Error('useAudience must be used within AudienceProvider')
    return ctx
}
