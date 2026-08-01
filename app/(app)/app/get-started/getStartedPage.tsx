'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Briefcase, Sparkles, Check, UserRound, X } from 'lucide-react'
import { Logo } from '@/components/site/Logo'
import { AudienceProvider, useAudience } from '@/components/site/AudienceContext'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/Auth/checkProfile'

type LoggedInState = {
    email: string | null
    destination: string
    label: string
} | null

export default function GetStarted() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { setAudience } = useAudience()
    const asParam = searchParams.get('as')
    const as = asParam === 'creator' ? 'creator' : 'brand'
    const [choice, setChoice] = useState<'brand' | 'creator'>(as)
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

    useEffect(() => {
        checkAccountAvailability()
    }, [])

    useEffect(() => {
        setChoice(as)
    }, [as])

    const handleContinue = () => {
        setAudience(choice === 'brand' ? 'brands' : 'creators')
        router.push(choice === 'brand' ? '/app/onboarding/brand' : '/app/onboarding/creator')
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
            <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8 sm:pt-10">
                {loggedIn && !bannerDismissed && (
                    <div className="mx-auto mb-8 flex max-w-xl items-center justify-center">
                        <div className="flex w-full items-center gap-3 rounded-full border border-primary/30 bg-surface-elevated py-2 pl-2 pr-3 shadow-card sm:w-auto">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <UserRound className="h-4 w-4" />
                            </span>
                            <button
                                type="button"
                                onClick={() => router.push(loggedIn.destination)}
                                className="group flex flex-1 items-center gap-2 text-left"
                            >
                                <span className="text-[13px] leading-tight text-ink-soft">
                                    Signed in{loggedIn.email ? ` as ${loggedIn.email}` : ''} —{' '}
                                    <span className="font-semibold text-ink underline-offset-4 group-hover:underline">
                                        continue to your {loggedIn.label}
                                    </span>
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
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
                    </div>
                )}

                <div className="text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-elevated px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Choose your path
                    </span>
                    <h1 className="font-display mt-5 text-4xl font-semibold tracking-[-0.03em] text-ink sm:text-[56px]">
                        How will you use Goheza?
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
                        Pick the journey that matches you today, then continue below. You can always switch later.
                    </p>
                </div>

                <div className="mt-12 grid gap-5 md:grid-cols-2 md:gap-6">
                    <JourneyCard
                        selected={choice === 'brand'}
                        onSelect={() => setChoice('brand')}
                        icon={<Briefcase className="h-5 w-5" />}
                        eyebrow="For brands & marketing teams"
                        title="Join as a Brand"
                        body="Launch performance campaigns with thousands of vetted creators. Only pay for measurable results — installs, sales, signups."
                        bullets={['Performance-based pricing', 'Vetted creator network', 'Transparent attribution']}
                        accent="primary"
                    />
                    <JourneyCard
                        selected={choice === 'creator'}
                        onSelect={() => setChoice('creator')}
                        icon={<Sparkles className="h-5 w-5" />}
                        eyebrow="For UGC & performance creators"
                        title="Join as a Creator"
                        body="Earn money creating content for brands that pay on real performance. Get matched with briefs that fit your niche."
                        bullets={[
                            'Transparent per-view payouts',
                            'Briefs that match your niche',
                            'Fast, secure payments',
                        ]}
                        accent="ink"
                    />
                </div>

                <div className="mt-8 flex flex-col items-center gap-3">
                    <button
                        type="button"
                        onClick={handleContinue}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all duration-200 hover:scale-[1.02] hover:brightness-[1.05]"
                        style={{ backgroundImage: 'var(--gradient-primary)' }}
                    >
                        Continue as {choice === 'brand' ? 'Brand' : 'Creator'}
                        <ArrowRight className="h-4 w-4" />
                    </button>
                    <p className="text-xs text-muted-foreground">
                        Setup takes about 2 minutes. You can pause and resume anytime.
                    </p>
                </div>

                <p className="mt-6 text-center text-sm text-ink-soft">
                    Already have an account?{' '}
                    <Link href="/app/auth/login" className="font-semibold text-ink underline-offset-4 hover:underline">
                        Log in
                    </Link>
                </p>
            </main>
        </div>
    )
}

function JourneyCard({
    selected,
    onSelect,
    icon,
    eyebrow,
    title,
    body,
    bullets,
    accent,
}: {
    selected: boolean
    onSelect: () => void
    icon: React.ReactNode
    eyebrow: string
    title: string
    body: string
    bullets: string[]
    accent: 'primary' | 'ink'
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className={`group relative flex flex-col rounded-3xl border bg-surface-elevated p-7 text-left transition-all duration-300 sm:p-8 ${
                selected
                    ? 'border-primary/40 shadow-glow ring-2 ring-primary/30'
                    : 'border-hairline shadow-card hover:-translate-y-1 hover:border-ink/15'
            }`}
        >
            {selected && (
                <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                    <Check className="h-3 w-3" /> Selected
                </span>
            )}
            <span
                className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                    accent === 'primary' ? 'bg-primary/10 text-primary' : 'bg-ink/8 text-ink'
                }`}
            >
                {icon}
            </span>
            <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">{eyebrow}</p>
            <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
                {title}
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
            <ul className="mt-5 space-y-2">
                {bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-[13px] text-ink-soft">
                        <Check className="h-3.5 w-3.5 text-primary" /> {b}
                    </li>
                ))}
            </ul>
            <span
                className={`mt-7 inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold ${
                    accent === 'primary' ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-ink text-background'
                }`}
                style={accent === 'primary' ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
            >
                {selected ? 'Selected — continue below' : `Select ${title.replace('Join as a ', '')}`}
            </span>
        </button>
    )
}
