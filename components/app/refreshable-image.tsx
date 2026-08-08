'use client'

import { useState } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'

type RefreshableImageProps = {
    src: string
    alt: string
    onRefresh: () => void | Promise<void>
    size?: number
}

/**
 * RefreshableImage
 *
 * Same visual language as the avatar in the profile page (rounded-full,
 * ring-hairline). On hover, a dark overlay fades in with a refresh icon
 * centered on top of the image. Click triggers onRefresh and gives a
 * tactile press effect (scale down), then shows a spinner while the
 * refresh is in flight.
 */
export function RefreshableImage({ src, alt, onRefresh, size = 80 }: RefreshableImageProps) {
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isPressed, setIsPressed] = useState(false)

    async function handleClick() {
        if (isRefreshing) return
        try {
            setIsRefreshing(true)
            await onRefresh()
        } finally {
            setIsRefreshing(false)
        }
    }

    return (
        <button
            type="button"
            title='See whats new'
            onClick={handleClick}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            disabled={isRefreshing}
            className="group cursor-pointer hover:border-neutral-400 border-3 mr-6 relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            style={{ width: size, height: size }}
            aria-label="Refresh image"
        >
            <img
                src={src}
                alt={alt}
                className={`h-full w-full rounded-full object-cover ring-2 ring-hairline transition-transform duration-150 ease-out ${
                    isPressed ? 'scale-95' : 'scale-100'
                }`}
            />

            <span
                className={`absolute inset-0 flex items-center justify-center rounded-full bg-ink/50 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 ${
                    isPressed ? 'scale-95' : 'scale-100'
                }`}
            >
                {isRefreshing ? (
                    <Loader2 className="h-1/3 w-1/3 animate-spin text-white" />
                ) : (
                    <RefreshCw className="h-1/3 w-1/3 text-white transition-transform duration-300 group-hover:rotate-90" />
                )}
            </span>
        </button>
    )
}

export default RefreshableImage
