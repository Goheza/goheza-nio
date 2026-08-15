'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, AlertTriangle } from 'lucide-react'

interface AccountStatusBannerProps {
    message?: string
    linkHref?: string
    linkLabel?: string
    storageKey?: string
}

export default function AccountStatusBanner({
    message = 'Maintenance check: make sure your TikTok connection is still active and up to date.',
    linkHref = '/app/creator/profile',
    linkLabel = 'Check profile',
    storageKey = 'goheza_account_banner_dismissed',
}: AccountStatusBannerProps) {
    const [dismissed, setDismissed] = useState(true) // default hidden until we check localStorage

    useEffect(() => {
        const wasDismissed = localStorage.getItem(storageKey) === 'true'
        setDismissed(wasDismissed)
    }, [storageKey])

    const handleDismiss = () => {
        localStorage.setItem(storageKey, 'true')
        setDismissed(true)
    }

    if (dismissed) return null

    return (
        <div
            role="alert"
            className="sticky top-0 z-50 w-full border-b-2 border-amber-500 bg-amber-400 px-4 py-3 text-amber-950 shadow-md"
        >
            <div className="mx-auto flex max-w-6xl items-center gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse text-amber-950" />

                <p className="flex-1 text-sm font-semibold leading-5 sm:text-base">
                    {message}
                </p>

                <Link
                    href={linkHref}
                    className="shrink-0 whitespace-nowrap rounded-md bg-amber-950 px-3 py-1.5 text-sm font-semibold text-amber-50 transition hover:bg-amber-900"
                >
                    {linkLabel}
                </Link>

                <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Dismiss"
                    className="shrink-0 rounded p-1 text-amber-950 opacity-70 transition hover:opacity-100"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    )
}