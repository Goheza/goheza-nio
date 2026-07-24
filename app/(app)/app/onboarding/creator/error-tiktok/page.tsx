'use client'

import { AlertCircle, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TikTokAuthErrorPage() {
    const router = useRouter()

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md rounded-3xl border border-hairline bg-surface-elevated p-8 text-center shadow-sm">
                {/* Error Icon */}
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <AlertCircle className="h-7 w-7" />
                </div>

                {/* Heading */}
                <h1 className="font-display mt-6 text-2xl font-semibold tracking-[-0.02em] text-ink">
                    Authentication Failed
                </h1>

                {/* Description */}
                <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                    Could not connect your TikTok account. The authorization request
                    was canceled or timed out. Please try again.
                </p>

                {/* Return Button */}
                <div className="mt-8">
                    <button
                        type="button"
                        onClick={() => router.replace('/app/onboarding/creator')}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-hairline bg-background px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Return to Onboarding
                    </button>
                </div>
            </div>
        </div>
    )
}