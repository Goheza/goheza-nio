'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Info } from 'lucide-react'

interface AccountStatusBannerProps {
    message?: string
    linkHref?: string
    linkLabel?: string
    storageKey?: string
}

export default function AccountStatusBanner({
    message = 'Quick check: please confirm your TikTok connection is up to date. Nothing is wrong with your account — this just helps us make sure everything is ready to go.',
    linkHref = '/app/creator/profile',
    linkLabel = 'Confirm connection',
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
        <div role="status" className="sticky top-0 z-50 w-full border-b bg-blue-50 px-4 py-3 text-blue-950 shadow-sm">
            <div className="mx-auto flex max-w-6xl items-center gap-3">
                <Info className="h-5 w-5 shrink-0 text-blue-600" />

                <p className="flex-1 text-sm leading-5 sm:text-base">{message}</p>

                <Link
                    href={linkHref}
                    className="shrink-0 whitespace-nowrap rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                    {linkLabel}
                </Link>

                <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Dismiss"
                    className="shrink-0 rounded p-1 text-blue-700 opacity-70 transition hover:opacity-100"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    )
}
