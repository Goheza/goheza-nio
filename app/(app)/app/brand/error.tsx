'use client'

import { useEffect } from 'react'
import { logError } from '@/lib/logger'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        logError('Next error boundary', error, { digest: error.digest })
    }, [error])

    return (
        <div className="m-6 rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-900">
            <p className="font-semibold">Something went wrong</p>
            <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
            {error.digest && <p className="mt-1 opacity-70">digest: {error.digest}</p>}
            <button onClick={reset} className="mt-4 rounded-full bg-red-600 px-4 py-2 text-white">
                Try again
            </button>
        </div>
    )
}
