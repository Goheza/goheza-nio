'use client'

import Link from 'next/link'
import logoSrc from '@/assets/goheza-logo.png'

export function Logo({ className = '', height = 28 }: { className?: string; height?: number }) {
    return (
        <Link href={'/'} aria-label="Goheza home" className={`inline-flex items-center ${className}`}>
            <img
                src={logoSrc.src}
                alt="Goheza"
                height={height}
                style={{ height: `${height}px`, width: 'auto' }}
                className="block select-none"
                draggable={false}
            />
        </Link>
    )
}
