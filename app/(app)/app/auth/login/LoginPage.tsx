'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Mail, Lock, UserRound, X } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/site/Logo'
import { GoogleLogo } from '@/components/app/brand-logos'
import { loginWithEmail, loginWithGoogle, resolveDashboardRoute } from '@/lib/api/auth'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { getProfile } from '@/lib/Auth/checkProfile'

type LoginAuthCheck = {
    user: User | null
    result: boolean
}

type LoggedInState = {
    email: string | null
    destination: string
    label: string
} | null

export function LoginPage() {
    const navigate = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loggedIn, setLoggedIn] = useState<LoggedInState>(null)
    const [bannerDismissed, setBannerDismissed] = useState(false)

    const checkAccountAvailability = async () => {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) return

        const currentProfile = await getProfile(user.id)

        if (currentProfile === 'brand') {
            setLoggedIn({ email: user.email ?? null, destination: '/app/brand', label: 'brand dashboard' })
        } else if (currentProfile === 'admin') {
            setLoggedIn({ email: user.email ?? null, destination: '/app/admin', label: 'admin dashboard' })
        } else if (currentProfile === 'creator') {
            setLoggedIn({ email: user.email ?? null, destination: '/app/creator', label: 'creator dashboard' })
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut({ scope: 'local' })
        navigate.refresh()
    }

    useEffect(() => {
        checkAccountAvailability()
    }, [])

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setLoading(true)
            setError(null)
            /**
             * Login the user
             */
            const user = await loginWithEmail(email, password)
            if (!user) throw new Error('Login failed. Please try again.')

            /**
             * Resolve the current user for the Action.
             */
            const args = await resolveDashboardRoute(user.id)

            navigate.push(args.route)
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message === 'Invalid login credentials'
                        ? 'Incorrect email or password.'
                        : err.message
                    : 'Something went wrong. Please try again.'
            )
        } finally {
            setLoading(false)
        }
    }

    const onGoogle = async () => {
        try {
            setGoogleLoading(true)
            setError(null)
            await loginWithGoogle()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Google sign-in failed.')
            setGoogleLoading(false)
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
                <Logo />
                <Link href="/" className="text-sm font-medium text-ink-soft hover:text-ink">
                    Back to site
                </Link>
            </header>

            <main className="relative z-10 mx-auto flex max-w-md flex-col px-5 pb-20 pt-6 sm:pt-12">
                {loggedIn && !bannerDismissed && (
                    <div className="mx-auto mb-8 w-full max-w-xl px-4 sm:flex sm:justify-center sm:px-0">
                        <div className="flex w-full flex-col gap-3 rounded-2xl border border-primary/30 bg-surface-elevated p-3 shadow-card sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:rounded-full sm:py-2 sm:pl-2 sm:pr-3">
                            {/* Top row: identity + dismiss (always visible, always one line) */}
                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <UserRound className="h-4 w-4" />
                                </span>

                                <button
                                    type="button"
                                    onClick={() => navigate.push(loggedIn.destination)}
                                    className="group flex min-w-0 flex-1 items-center gap-2 text-left"
                                >
                                    <span className="min-w-0 truncate text-[13px] leading-tight text-ink-soft">
                                        Signed in{loggedIn.email ? ` as ${loggedIn.email}` : ''} —{' '}
                                        <span className="font-semibold text-ink underline-offset-4 group-hover:underline">
                                            continue to your {loggedIn.label}
                                        </span>
                                    </span>
                                    <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 sm:inline-block" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setBannerDismissed(true)}
                                    aria-label="Dismiss"
                                    className="shrink-0 rounded-full p-1 text-ink-soft/60 hover:bg-ink/5 hover:text-ink-soft"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {/* Bottom row on mobile only: full-width actions so they're easy to tap */}
                            <div className="flex items-center gap-2 sm:hidden">
                                <button
                                    type="button"
                                    onClick={() => navigate.push(loggedIn.destination)}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
                                >
                                    Continue
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="flex-1 rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink"
                                >
                                    Log out
                                </button>
                            </div>

                            {/* Desktop-only log out, inline in the pill */}
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="hidden shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink sm:block"
                            >
                                Log out
                            </button>
                        </div>
                    </div>
                )}

                <div className="text-center">
                    <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
                        Welcome back
                    </h1>
                    <p className="mt-3 text-[15px] text-muted-foreground">Log in to your Goheza account</p>
                </div>

                <div className="mt-8 rounded-3xl border border-hairline bg-surface-elevated p-6 shadow-card sm:p-8">
                    <button
                        type="button"
                        onClick={onGoogle}
                        disabled={googleLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-background px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink/5 disabled:opacity-50"
                    >
                        <GoogleLogo className="h-4 w-4" />
                        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                    </button>

                    <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        <span className="h-px flex-1 bg-hairline" />
                        or with email
                        <span className="h-px flex-1 bg-hairline" />
                    </div>

                    <form onSubmit={onSubmit} className="space-y-4">
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
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <label className="block text-xs font-medium text-ink-soft">Password</label>
                                <Link
                                    href="/app/auth/forgot-password"
                                    className="text-xs font-medium text-ink-soft hover:text-ink"
                                >
                                    Forgot?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
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
                            {loading ? 'Logging in…' : 'Log in'}
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </button>
                    </form>
                </div>

                <p className="mt-6 text-center text-sm text-ink-soft">
                    New to Goheza?{' '}
                    <Link
                        href="/app/get-started?as=brand"
                        className="font-semibold text-ink underline-offset-4 hover:underline"
                    >
                        Create an account
                    </Link>
                </p>
            </main>
        </div>
    )
}
