'use client'

import { Construction } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * ComingSoon
 *
 * Two ways to use it:
 *
 * 1. As a standalone banner/card, placed above a page's content:
 *
 *      <ComingSoon title="Analytics" />
 *      <RestOfPage />
 *
 * 2. As a wrapper that locks an entire page/section while it's under
 *    development — content behind it is dimmed, blurred, and not
 *    interactive:
 *
 *      <ComingSoon overlay title="Bulk Invites">
 *          <BulkInvitesPage />
 *      </ComingSoon>
 */

interface ComingSoonProps {
    title?: string
    description?: string
    icon?: ReactNode
    /** Renders as a full wrapper that dims/blocks `children` instead of a standalone banner. */
    overlay?: boolean
    /** Only used in overlay mode — content to lock behind the notice. */
    children?: ReactNode
    className?: string
}

export function ComingSoon({
    title = 'Coming soon',
    description = "We're building this. Check back shortly.",
    icon,
    overlay = false,
    children,
    className = '',
}: ComingSoonProps) {
    const card = (
        <div
            className={`rounded-3xl border border-dashed border-hairline bg-[oklch(0.97_0.02_75)] px-6 py-8 text-center shadow-card sm:px-10 sm:py-10 ${className}`}
        >
            <span
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-glow"
                style={{ backgroundImage: 'var(--gradient-primary)' }}
            >
                {icon ?? <Construction className="h-5 w-5" />}
            </span>
            <p className="font-display mt-4 text-lg font-semibold text-ink">{title}</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
    )

    if (!overlay) return card

    return (
        <div className="relative">
            <div className="pointer-events-none select-none blur-[2px] opacity-40">{children}</div>
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-md">{card}</div>
            </div>
        </div>
    )
}