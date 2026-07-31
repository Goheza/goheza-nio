'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle } from 'lucide-react'
import { Logo } from '@/components/site/Logo'
import { supabase } from '@/lib/supabase'
import { resolveUserRole, resolveDashboardRoute } from '@/lib/api/auth'
import type { User } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type RoleParam = 'brand' | 'creator' | null

export default function AuthCallbackPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [error, setError] = useState<string | null>(null)

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
            const oauthError = searchParams.get('error_description') || searchParams.get('error')

            if (oauthError) {
                if (isMounted) setError(oauthError)
                return
            }

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
                    <h1 className="font-display mt-5 text-2xl font-semibold text-ink">Sign-in failed</h1>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{error}</p>
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
