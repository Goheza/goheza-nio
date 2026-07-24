import { useEffect, useState } from 'react'
import { X, ShieldCheck } from 'lucide-react'

type Provider = {
    id: string
    name: string
    color: string
    accent: string
}

export function MockOAuthModal({
    provider,
    onCancel,
    onAuthorize,
}: {
    provider: Provider
    onCancel: () => void
    onAuthorize: () => void
}) {
    const [authorizing, setAuthorizing] = useState(false)

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [])

    const handleAuthorize = () => {
        setAuthorizing(true)
        setTimeout(() => {
            onAuthorize()
        }, 900)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-background shadow-elevated">
                {/* Mock provider chrome */}
                <div
                    className="flex items-center justify-between px-5 py-3"
                    style={{ background: provider.color, color: 'white' }}
                >
                    <span className="text-sm font-semibold">{provider.name} — Authorize</span>
                    <button
                        type="button"
                        aria-label="Cancel"
                        onClick={onCancel}
                        className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="px-6 py-7">
                    <div className="flex items-center gap-3">
                        <span
                            className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white"
                            style={{ background: provider.accent }}
                        >
                            {provider.name.slice(0, 1)}
                        </span>
                        <div>
                            <p className="text-[15px] font-semibold text-ink">
                                Goheza wants to connect to your {provider.name}
                            </p>
                            <p className="text-xs text-muted-foreground">goheza.com</p>
                        </div>
                    </div>

                    <ul className="mt-6 space-y-2 rounded-xl border border-hairline bg-surface-elevated p-4 text-[13px] text-ink-soft">
                        <li>• Read your public profile and account info</li>
                        <li>• View your content performance metrics</li>
                        <li>• Verify your account ownership</li>
                    </ul>

                    <div className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Goheza will never post on your behalf.
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-full border border-hairline bg-background px-4 py-2.5 text-sm font-semibold text-ink hover:bg-ink/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleAuthorize}
                            disabled={authorizing}
                            className="rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] disabled:opacity-70"
                            style={{ background: provider.accent }}
                        >
                            {authorizing ? 'Connecting…' : 'Authorize'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
