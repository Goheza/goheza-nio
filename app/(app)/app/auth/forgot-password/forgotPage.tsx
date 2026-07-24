'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Mail, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/site/Logo'
import { requestPasswordReset } from '@/lib/api/auth'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [sent, setSent] = useState(false)

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        try {
            setLoading(true)
            setError(null)
            await requestPasswordReset(email)
            setSent(true)
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
                <Link
                    href="/"
                    className="text-sm font-medium text-ink-soft hover:text-ink"
                >
                    Back to site
                </Link>
            </header>

            <main className="relative z-10 mx-auto flex max-w-md flex-col px-5 pb-20 pt-6 sm:pt-12">
                {sent ? (
                    <div className="mt-8 rounded-3xl border border-hairline bg-surface-elevated p-8 text-center shadow-card">
                        <div
                            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-glow"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <h1 className="font-display mt-5 text-2xl font-semibold text-ink">Check your email</h1>
                        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                            If an account exists for <span className="font-medium text-ink">{email}</span>, we've sent a
                            link to reset your password.
                        </p>
                        <Link
                            href="/app/auth/login"
                            className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-5 py-2.5 text-sm font-semibold text-ink hover:bg-ink/5"
                        >
                            Back to log in
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="text-center">
                            <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
                                Forgot your password?
                            </h1>
                            <p className="mt-3 text-[15px] text-muted-foreground">
                                Enter your email and we'll send you a link to reset it.
                            </p>
                        </div>

                        <div className="mt-8 rounded-3xl border border-hairline bg-surface-elevated p-6 shadow-card sm:p-8">
                            <form
                                onSubmit={onSubmit}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-ink-soft">Email</label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@company.com"
                                            className="h-11 w-full rounded-xl border border-hairline bg-background pl-10 pr-3 text-sm text-ink outline-none transition-colors focus:border-ink/30"
                                        />
                                    </div>
                                </div>

                                {error && <p className="text-[13px] font-medium text-red-500">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.01] disabled:opacity-50"
                                >
                                    {loading ? 'Sending…' : 'Send reset link'}
                                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                </button>
                            </form>
                        </div>

                        <Link
                            href="/app/auth/login"
                            className="mt-6 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Back to log in
                        </Link>
                    </>
                )}
            </main>
        </div>
    )
}