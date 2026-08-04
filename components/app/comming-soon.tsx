'use client'

import { Construction } from 'lucide-react'
import type { ReactNode } from 'react'

interface ComingSoonProps {
    title?: string
    description?: string
    icon?: ReactNode
    overlay?: boolean
    children?: ReactNode
    className?: string
}

export function ComingSoon({
    title = 'Coming Soon',
    description = "We're building this feature. Check back shortly.",
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

            <p className="font-display mt-4 text-lg font-semibold text-ink">
                {title}
            </p>

            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                {description}
            </p>
        </div>
    )

    if (!overlay) {
        return card
    }

    return (
        <div className="relative min-h-full">
            {/* Locked content */}
            <div className="pointer-events-none select-none blur-sm opacity-20">
                {children}
            </div>

            {/* Frosted overlay */}
            <div className="absolute inset-0 bg-white/45 backdrop-blur-lg" />

            {/* Message */}
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    {card}
                </div>
            </div>
        </div>
    )
}