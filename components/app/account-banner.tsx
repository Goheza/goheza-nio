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
    const [dismissed, setDismissed] = useState(true) // hidden until we check localStorage

    useEffect(() => {
        try {
            setDismissed(localStorage.getItem(storageKey) === 'true')
        } catch {
            setDismissed(false)
        }
    }, [storageKey])

    const handleDismiss = () => {
        try {
            localStorage.setItem(storageKey, 'true')
        } catch {}
        setDismissed(true)
    }

    if (dismissed) return null

    return (
        <div
            role="status"
            className="sticky top-0 z-50 w-full border-b bg-blue-50 px-3 py-3 text-blue-950 shadow-sm sm:px-4"
        >
            <div className="mx-auto flex max-w-6xl items-start gap-2 sm:items-center sm:gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 sm:mt-0" />

                {/* Message + link: stacked on mobile, inline row on sm+ */}
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <p className="flex-1 text-sm leading-5 sm:text-base">{message}</p>

                    <Link
                        href={linkHref}
                        className="w-full shrink-0 rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto sm:whitespace-nowrap sm:py-1.5"
                    >
                        {linkLabel}
                    </Link>
                </div>

                <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Dismiss"
                    className="-mr-1 shrink-0 rounded p-1 text-blue-700 opacity-70 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    )
}
