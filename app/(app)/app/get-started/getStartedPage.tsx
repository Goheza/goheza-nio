'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Briefcase, Sparkles, Check } from 'lucide-react'
import { Logo } from '@/components/site/Logo'
import { AudienceProvider, useAudience } from '@/components/site/AudienceContext'


export default function GetStarted() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { setAudience } = useAudience()

    // Replaces validateSearch logic
    const asParam = searchParams.get('as')
    const as = asParam === 'creator' ? 'creator' : 'brand'

    const [choice, setChoice] = useState<'brand' | 'creator'>(as)

    useEffect(() => {
        setChoice(as)
    }, [as])

    const handleContinue = () => {
        setAudience(choice === 'brand' ? 'brands' : 'creators')
        router.push(choice === 'brand' ? '/app/onboarding/brand' : '/app/onboarding/creator')
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-background">
            {/* Soft aurora bg */}
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

            <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8 sm:pt-10">
                <div className="text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-elevated px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Choose your path
                    </span>
                    <h1 className="font-display mt-5 text-4xl font-semibold tracking-[-0.03em] text-ink sm:text-[56px]">
                        How will you use Goheza?
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
                        You can always switch later. Pick the journey that matches you today.
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
                        cta="Continue as Brand"
                        onContinue={handleContinue}
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
                        cta="Continue as Creator"
                        onContinue={handleContinue}
                        accent="ink"
                    />
                </div>

                <p className="mt-10 text-center text-xs text-muted-foreground">
                    Setup takes about 2 minutes. You can pause and resume anytime.
                </p>
                <p className="mt-3 text-center text-sm text-ink-soft">
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
    onContinue,
    icon,
    eyebrow,
    title,
    body,
    bullets,
    cta,
    accent,
}: {
    selected: boolean
    onSelect: () => void
    onContinue: () => void
    icon: React.ReactNode
    eyebrow: string
    title: string
    body: string
    bullets: string[]
    cta: string
    accent: 'primary' | 'ink'
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
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
                onClick={(e) => {
                    e.stopPropagation()
                    onSelect()
                    onContinue()
                }}
                className={`mt-7 inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] ${
                    accent === 'primary' ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-ink text-background'
                }`}
                style={accent === 'primary' ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
            >
                {cta}
                <ArrowRight className="h-3.5 w-3.5" />
            </span>
        </button>
    )
}
