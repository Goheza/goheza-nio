'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Logo } from '@/components/site/Logo'
import { supabase } from '@/lib/supabase'
import { updatePassword } from '@/lib/api/auth'

export default function ResetPasswordPage() {
    const router = useRouter()
    const [checkingLink, setCheckingLink] = useState(true)
    const [linkValid, setLinkValid] = useState(false)
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    // The reset link Supabase emails lands here with a recovery token in the
    // URL — supabase-js parses it automatically and fires a PASSWORD_RECOVERY
    // event. We also check getSession() directly in case that event already
    // fired before this listener attached.
    useEffect(() => {
        let cancelled = false
        let timeoutId: ReturnType<typeof setTimeout>

        async function check() {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (session && !cancelled) {
                setLinkValid(true)
                setCheckingLink(false)
                return
            }

            const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
                if (event === 'PASSWORD_RECOVERY' && s && !cancelled) {
                    setLinkValid(true)
                    setCheckingLink(false)
                }
            })

            timeoutId = setTimeout(() => {
                if (!cancelled) setCheckingLink(false)
            }, 4000)

            return () => listener.subscription.unsubscribe()
        }

        check()
        return () => {
            cancelled = true
            clearTimeout(timeoutId)
        }
    }, [])

    const canSubmit = password.length >= 6 && password === confirm

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!canSubmit) return
        try {
            setLoading(true)
            setError(null)
            await updatePassword(password)
            setDone(true)
            setTimeout(() => router.push('/app/auth/login'), 2000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-background">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                    background:
                        'radial-gradient(60% 50% at 20% 0%, oklch(0.92 0.10 70 / 0.35) 0%, transparent 60%), radial-gradient(50% 50% at 90% 20%, oklch(0.88 0.10 285 / 0.25) 0%, transparent 60%)',
                }}
            />

            <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
                <Logo height={32} />
                <Link href="/" className="text-sm font-medium text-ink-soft hover:text-ink">
                    Back to site
                </Link>
            </header>

            <main className="relative z-10 mx-auto flex max-w-md flex-col px-5 pb-20 pt-6 sm:pt-12">
                {checkingLink ? (
                    <div className="mt-16 flex flex-col items-center gap-3 text-sm font-medium text-ink-soft">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Verifying your link…
                    </div>
                ) : !linkValid ? (
                    <div className="mt-8 rounded-3xl border border-hairline bg-surface-elevated p-8 text-center shadow-card">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <h1 className="font-display mt-5 text-2xl font-semibold text-ink">Link expired or invalid</h1>
                        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                            This password reset link is no longer valid. Request a new one to continue.
                        </p>
                        <Link
                            href="/app/auth/forgot-password"
                            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90"
                        >
                            Request a new link
                        </Link>
                    </div>
                ) : done ? (
                    <div className="mt-8 rounded-3xl border border-hairline bg-surface-elevated p-8 text-center shadow-card">
                        <div
                            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-glow"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <h1 className="font-display mt-5 text-2xl font-semibold text-ink">Password updated</h1>
                        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">Taking you to log in…</p>
                    </div>
                ) : (
                    <>
                        <div className="text-center">
                            <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
                                Set a new password
                            </h1>
                            <p className="mt-3 text-[15px] text-muted-foreground">
                                Choose a new password for your account.
                            </p>
                        </div>

                        <div className="mt-8 rounded-3xl border border-hairline bg-surface-elevated p-6 shadow-card sm:p-8">
                            <form onSubmit={onSubmit} className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-ink-soft">
                                        New password
                                    </label>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="At least 6 characters"
                                            className="h-11 w-full rounded-xl border border-hairline bg-background pl-10 pr-3 text-sm text-ink outline-none transition-colors focus:border-ink/30"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-ink-soft">
                                        Confirm new password
                                    </label>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="password"
                                            required
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                            placeholder="Re-enter password"
                                            className="h-11 w-full rounded-xl border border-hairline bg-background pl-10 pr-3 text-sm text-ink outline-none transition-colors focus:border-ink/30"
                                        />
                                    </div>
                                </div>

                                {password && confirm && password !== confirm && (
                                    <p className="text-[13px] font-medium text-red-500">Passwords don't match.</p>
                                )}
                                {error && <p className="text-[13px] font-medium text-red-500">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={!canSubmit || loading}
                                    className="group mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.01] disabled:opacity-50"
                                >
                                    {loading ? 'Updating…' : 'Update password'}
                                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}
