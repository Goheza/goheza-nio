'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle, Mail } from 'lucide-react'
import { Logo } from '@/components/site/Logo'
import { supabase } from '@/lib/supabase'
import { resolveUserRole, resolveDashboardRoute } from '@/lib/api/auth'
import type { User } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type RoleParam = 'brand' | 'creator' | null

// Reads Supabase auth errors from either the query string (PKCE-style
// redirects) or the hash fragment (implicit/magic-link redirects).
// `otp_expired` is the code Supabase uses for an expired confirmation
// or magic link.
function readAuthError(searchParams: URLSearchParams) {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
    const hashParams = new URLSearchParams(hash)

    const errorCode = searchParams.get('error_code') || hashParams.get('error_code')
    const error = searchParams.get('error') || hashParams.get('error')
    const description =
        searchParams.get('error_description') || hashParams.get('error_description')

    if (!error && !errorCode) return null

    return {
        code: errorCode,
        error,
        description: description ? decodeURIComponent(description.replace(/\+/g, ' ')) : null,
        isExpired: errorCode === 'otp_expired',
    }
}

export default function AuthCallbackPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [error, setError] = useState<string | null>(null)
    const [expired, setExpired] = useState(false)
    const [resendEmail, setResendEmail] = useState('')
    const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

    const handleResend = useCallback(async () => {
        if (!resendEmail) return
        setResendState('sending')
        try {
            const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email: resendEmail,
            })
            if (resendError) throw resendError
            setResendState('sent')
        } catch {
            setResendState('error')
        }
    }, [resendEmail])

    useEffect(() => {
        let isMounted = true
        let unsubscribe: (() => void) | undefined
        let timeoutId: ReturnType<typeof setTimeout>

        async function routeUser(user: User, roleParam: RoleParam) {
            try {
                const existingRole = await resolveUserRole(user.id)

                if (existingRole) {
                    const { route } = await resolveDashboardRoute(user.id)
                    if (isMounted) router.push(route)
                    return
                }

                if (!roleParam) {
                    if (isMounted) setError('We could not determine your account type. Please sign up again.')
                    return
                }

                if (roleParam === 'brand') {
                    await supabase.from('brand_profiles').insert({
                        user_id: user.id,
                        brand_email: user.email ?? null,
                    })
                    if (isMounted) router.push('/app/onboarding/brand')
                } else {
                    await supabase.from('creator_profiles').insert({
                        user_id: user.id,
                        full_name: (user.user_metadata?.full_name as string | undefined) ?? '',
                        email: user.email ?? '',
                    })
                    if (isMounted) router.push('/app/onboarding/creator')
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Something went wrong finishing sign-in.')
                }
            }
        }

        async function finish() {
            const roleParam = searchParams.get('role') as RoleParam

            // 1. Check for an explicit error Supabase attached to the redirect
            //    (covers both query-string and hash-fragment styles).
            const authError = readAuthError(searchParams)
            if (authError) {
                if (isMounted) {
                    if (authError.isExpired) {
                        setExpired(true)
                        setError('This verification link has expired. Enter your email below and we\'ll send you a new one.')
                    } else {
                        setError(authError.description || 'Sign-in failed. Please try again.')
                    }
                }
                return
            }

            // 2. PKCE flow: exchange the code for a session explicitly so we
            //    can catch an expired/already-used code here instead of
            //    letting it fail silently.
            const code = searchParams.get('code')
            if (code) {
                const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
                if (exchangeError) {
                    if (isMounted) {
                        const isExpired = /expired|invalid/i.test(exchangeError.message)
                        setExpired(isExpired)
                        setError(
                            isExpired
                                ? 'This verification link has expired. Enter your email below and we\'ll send you a new one.'
                                : exchangeError.message
                        )
                    }
                    return
                }
                if (data.session?.user) {
                    await routeUser(data.session.user, roleParam)
                    return
                }
            }

            // 3. Implicit flow / already-active session
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (session?.user) {
                await routeUser(session.user, roleParam)
                return
            }

            const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
                if (event === 'SIGNED_IN' && s?.user) {
                    routeUser(s.user, roleParam)
                }
            })
            unsubscribe = () => listener.subscription.unsubscribe()

            timeoutId = setTimeout(() => {
                if (isMounted) {
                    setError((prev) => prev ?? 'Sign-in is taking longer than expected. Please try again.')
                }
            }, 8000)
        }

        finish()

        return () => {
            isMounted = false
            unsubscribe?.()
            clearTimeout(timeoutId)
        }
    }, [router, searchParams])

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-5">
                <div className="w-full max-w-md rounded-3xl border border-hairline bg-surface-elevated p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <h1 className="font-display mt-5 text-2xl font-semibold text-ink">
                        {expired ? 'Link expired' : 'Sign-in failed'}
                    </h1>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{error}</p>

                    {expired ? (
                        <div className="mt-6 flex flex-col gap-3">
                            {resendState === 'sent' ? (
                                <p className="text-[14px] font-medium text-green-600">
                                    New link sent — check your inbox.
                                </p>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 rounded-full border border-hairline bg-background px-4 py-2.5">
                                        <Mail className="h-4 w-4 text-ink-soft" />
                                        <input
                                            type="email"
                                            placeholder="you@example.com"
                                            value={resendEmail}
                                            onChange={(e) => setResendEmail(e.target.value)}
                                            className="w-full bg-transparent text-sm outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleResend}
                                        disabled={!resendEmail || resendState === 'sending'}
                                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
                                    >
                                        {resendState === 'sending' ? 'Sending…' : 'Resend link'}
                                    </button>
                                    {resendState === 'error' && (
                                        <p className="text-[13px] text-red-500">
                                            Couldn't resend. Please try again in a moment.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    ) : null}

                    <Link
                        href="/app/auth/login"
                        className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-5 py-2.5 text-sm font-semibold text-ink hover:bg-ink/5"
                    >
                        Back to home
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-5">
            <Logo  />
            <div className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                <Loader2 className="h-4 w-4 animate-spin" />
                Finishing sign-in…
            </div>
        </div>
    )
}