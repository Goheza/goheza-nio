"use client"

import { useAudience, type Audience } from './AudienceContext'

type Props = {
    size?: 'sm' | 'md'
    className?: string
}

export function AudienceToggle({ size = 'md', className = '' }: Props) {
    const { audience, setAudience } = useAudience()

    const options: { value: Audience; label: string }[] = [
        { value: 'brands', label: 'For Brands' },
        { value: 'creators', label: 'For Creators' },
    ]

    const padY = size === 'sm' ? 'py-1.5' : 'py-2'
    const padX = size === 'sm' ? 'px-4' : 'px-5'
    const text = size === 'sm' ? 'text-xs' : 'text-sm'

    return (
        <div
            role="tablist"
            aria-label="Audience"
            className={`relative inline-flex items-center rounded-full border border-hairline bg-surface-elevated p-1 shadow-sm ${className}`}
        >
            {options.map((o) => {
                const active = audience === o.value
                return (
                    <button
                        key={o.value}
                        role="tab"
                        aria-selected={active}
                        onClick={() => setAudience(o.value)}
                        className={`relative z-10 rounded-full ${padX} ${padY} ${text} font-medium tracking-tight transition-colors duration-300 ${
                            active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {active && (
                            <span
                                aria-hidden
                                className="absolute inset-0 -z-10 rounded-full bg-primary"
                                style={{ transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)' }}
                            />
                        )}
                        {o.label}
                    </button>
                )
            })}
        </div>
    )
}
