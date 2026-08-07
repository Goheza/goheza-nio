'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Check, Rocket, Target, Sparkles, PartyPopper, Mail, Lock } from 'lucide-react'
import { OnboardingShell } from '@/components/app/onboarding/OnboardingShell'
import { loadOnboarding, saveOnboarding, clearOnboarding } from '@/lib/onboarding-storage'
import { supabase } from '@/lib/supabase'
import { signUpBrandWithEmail } from '@/lib/api/brand-auth'
import { submitBrandOnboarding, getBrandProfile, resumeStepForBrandProfile } from '@/lib/api/brand-onboarding'

// Note: Export metadata in a separate layout.ts or page.ts file if this is a server component wrapper,
// or manage document head attributes inside your layout root.

type BrandData = {
    email: string
    password: string
    confirm: string
    companyName: string
    website: string
    country: string
    companyEmail: string
    phoneNumber: string
    contactPerson: string
    goalsText: string
}

const DEFAULT: BrandData = {
    email: '',
    password: '',
    confirm: '',
    companyName: '',
    website: '',
    country: '',
    companyEmail: '',
    phoneNumber: '',
    contactPerson: '',
    goalsText: '',
}

const STORAGE_KEY = 'goheza.onboarding.brand'
const TOTAL = 5

export default function BrandOnboarding() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [data, setData] = useState<BrandData>(DEFAULT)
    const [checkingSession, setCheckingSession] = useState(true)
    const [authLoading, setAuthLoading] = useState(false)
    const [authError, setAuthError] = useState<string | null>(null)
    const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    /**
     * Check for existing profile, so that the user
     * does not go through the onboarding step again
     * @returns
     */

    useEffect(() => setData((d) => loadOnboarding(STORAGE_KEY, d)), [])
    // Never persist password/confirm to localStorage — same reasoning as
    // the creator onboarding flow. Only the redacted rest of the draft
    // is saved.
    useEffect(() => {
        const { password, confirm, ...redacted } = data
        saveOnboarding(STORAGE_KEY, redacted)
    }, [data])

    useEffect(() => {
        let cancelled = false

        async function resume() {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (!session?.user) {
                if (!cancelled) setCheckingSession(false)
                return
            }

            try {
                const profile = await getBrandProfile(session.user.id)
                if (cancelled) return

                if (profile) {
                    setData((d) => ({
                        ...d,
                        email: profile.brand_email || d.email,
                        companyName: profile.brand_name || d.companyName,
                        website: profile.website || d.website,
                        country: profile.country || d.country,
                        companyEmail: profile.brand_email || d.companyEmail,
                        phoneNumber: profile.phone || d.phoneNumber,
                        contactPerson: profile.contact || d.contactPerson,
                        goalsText: profile.goals || d.goalsText,
                    }))
                    setStep(resumeStepForBrandProfile(profile))
                } else {
                    setStep(3)
                }
            } catch (err) {
                console.error('Failed to load existing brand profile:', err)
            } finally {
                if (!cancelled) setCheckingSession(false)
            }
        }

        resume()
        return () => {
            cancelled = true
        }
    }, [])

    const canContinue = useMemo(() => {
        if (step === 2) return data.email && data.password.length >= 6 && data.password === data.confirm
        if (step === 3)
            return !!(data.companyName && data.website && data.country && data.phoneNumber && data.contactPerson)
        if (step === 4) return data.goalsText.trim().length > 0
        return true
    }, [step, data])

    const next = () => setStep((s) => Math.min(TOTAL, s + 1))
    const back = () => setStep((s) => Math.max(1, s - 1))

    const handleContinue = async () => {
        if (step === 2) {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (session?.user) {
                next()
                return
            }
            try {
                setAuthLoading(true)
                setAuthError(null)
                const { hasSession } = await signUpBrandWithEmail(data.email, data.password)
                if (!hasSession) {
                    setAwaitingConfirmation(true)
                    return
                }
                next()
            } catch (err) {
                setAuthError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
            } finally {
                setAuthLoading(false)
            }
            return
        }

        if (step === TOTAL - 1) {
            try {
                setSubmitting(true)
                setSubmitError(null)
                await submitBrandOnboarding({
                    companyName: data.companyName,
                    website: data.website,
                    country: data.country,
                    companyEmail: data.companyEmail || data.email,
                    phoneNumber: data.phoneNumber,
                    contactPerson: data.contactPerson,
                    goalsText: data.goalsText,
                })
                // Onboarding fully complete — clear the draft rather than
                // letting it sit in localStorage indefinitely.
                clearOnboarding(STORAGE_KEY)
                setStep(TOTAL)
            } catch (err) {
                setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
            } finally {
                setSubmitting(false)
            }
            return
        }

        if (step < TOTAL) {
            next()
            return
        }
        router.push('/app/brand')
    }

    if (checkingSession) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-soft border-t-transparent" />
            </div>
        )
    }

    if (awaitingConfirmation) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-5">
                <div className="w-full max-w-md rounded-3xl border border-hairline bg-surface-elevated p-8 text-center">
                    <div
                        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-glow"
                        style={{ backgroundImage: 'var(--gradient-primary)' }}
                    >
                        <Mail className="h-6 w-6" />
                    </div>
                    <h1 className="font-display mt-5 text-2xl font-semibold text-ink">Check your email</h1>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                        We've sent a confirmation link <span className="font-medium text-ink">{data.email}</span>. Click
                        the link to verify your email, then come back to continue onboarding. If you don't see the email
                        within a few minutes, please check your spam or junk folder.
                    </p>
                    <Link
                        href="/app/get-started?as=brand"
                        className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-5 py-2.5 text-sm font-semibold text-ink hover:bg-ink/5"
                    >
                        Back to home
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <OnboardingShell
            step={step}
            totalSteps={TOTAL}
            onBack={step > 1 && step < TOTAL ? back : undefined}
            onContinue={handleContinue}
            continueLabel={
                step === 2
                    ? authLoading
                        ? 'Creating account…'
                        : 'Continue'
                    : step === TOTAL - 1
                    ? submitting
                        ? 'Submitting…'
                        : 'Submit'
                    : step === TOTAL
                    ? 'Go to Dashboard'
                    : 'Continue'
            }
            continueDisabled={!canContinue || authLoading || submitting}
            title={titleFor(step)}
            subtitle={subtitleFor(step)}
            hideFooter={step === TOTAL}
        >
            {step === 1 && <WelcomeStep onStart={next} />}
            {step === 2 && (
                <>
                    <AccountStep data={data} set={(p) => setData((d) => ({ ...d, ...p }))} />
                    {authError && <p className="mt-3 text-sm font-medium text-red-500">{authError}</p>}
                </>
            )}
            {step === 3 && <CompanyStep data={data} set={(p) => setData((d) => ({ ...d, ...p }))} />}
            {step === 4 && (
                <>
                    <GoalsStep value={data.goalsText} onChange={(v) => setData((d) => ({ ...d, goalsText: v }))} />
                    {submitError && <p className="mt-3 text-sm font-medium text-red-500">{submitError}</p>}
                </>
            )}
            {step === 5 && <CompleteStep brand_email={data.email} brand_name={data.companyName} />}
        </OnboardingShell>
    )
}

function titleFor(step: number) {
    return [
        'Welcome to Goheza',
        'Create your brand account',
        'Tell us about your company',
        'What are your goals?',
        "You're all set!",
    ][step - 1]
}

function subtitleFor(step: number) {
    return [
        'Performance-based creator campaigns, built for marketing teams that care about ROI.',
        'Launch performance-based creator campaigns.',
        'We use this to verify your account and reach you for kickoff.',
        "Tell us what you're hoping to achieve — you can refine this for each campaign later.",
        '',
    ][step - 1]
}

function WelcomeStep({ onStart }: { onStart: () => void }) {
    const items = [
        {
            icon: <Rocket className="h-4 w-4" />,
            title: 'Launch in minutes',
            body: 'Brief, budget, assets — go live the same day.',
        },
        {
            icon: <Target className="h-4 w-4" />,
            title: 'Pay only for results',
            body: 'Per install, sale, signup, or 1,000 verified views.',
        },
        {
            icon: <Sparkles className="h-4 w-4" />,
            title: 'Vetted creators',
            body: 'Pre-screened for quality, audience, and performance.',
        },
    ]
    return (
        <div className="overflow-hidden rounded-3xl border border-hairline bg-surface-elevated p-7 sm:p-10">
            <div className="grid gap-6 sm:grid-cols-3">
                {items.map((i) => (
                    <div key={i.title} className="rounded-2xl border border-hairline bg-background p-5">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            {i.icon}
                        </span>
                        <p className="font-display mt-4 text-base font-semibold text-ink">{i.title}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{i.body}</p>
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={onStart}
                className="mt-7 inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
                style={{ backgroundImage: 'var(--gradient-primary)' }}
            >
                Let's begin
            </button>
        </div>
    )
}

function AccountStep({ data, set }: { data: BrandData; set: (p: Partial<BrandData>) => void }) {
    return (
        <div className="rounded-3xl border border-hairline bg-surface-elevated p-7 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company email" icon={<Mail className="h-4 w-4" />} full>
                    <input
                        type="email"
                        value={data.email}
                        onChange={(e) => set({ email: e.target.value })}
                        placeholder="team@acme.com"
                        className={fieldClass}
                    />
                </Field>
                <Field label="Password" icon={<Lock className="h-4 w-4" />}>
                    <input
                        type="password"
                        value={data.password}
                        onChange={(e) => set({ password: e.target.value })}
                        placeholder="At least 6 characters"
                        className={fieldClass}
                        minLength={6}
                    />
                </Field>
                <Field label="Confirm password" icon={<Lock className="h-4 w-4" />}>
                    <input
                        type="password"
                        value={data.confirm}
                        onChange={(e) => set({ confirm: e.target.value })}
                        placeholder="Re-enter password"
                        className={fieldClass}
                    />
                </Field>
            </div>

            {data.password && data.confirm && data.password !== data.confirm && (
                <p className="mt-3 text-[13px] font-medium text-red-500">Passwords don't match.</p>
            )}

            <p className="mt-5 text-[11px] text-muted-foreground">
                By creating an account you agree to our{' '}
                <Link href="/terms" className="underline hover:text-foreground transition-colors">
                    Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline hover:text-foreground transition-colors">
                    Privacy Policy
                </Link>
                .
            </p>
        </div>
    )
}

function CompanyStep({ data, set }: { data: BrandData; set: (p: Partial<BrandData>) => void }) {
    return (
        <div className="grid gap-5 rounded-3xl border border-hairline bg-surface-elevated p-7 sm:grid-cols-2 sm:p-8">
            <Field label="Company name">
                <input
                    value={data.companyName}
                    onChange={(e) => set({ companyName: e.target.value })}
                    placeholder="Acme Inc."
                    className={fieldClass}
                />
            </Field>
            <Field label="Website">
                <input
                    value={data.website}
                    onChange={(e) => set({ website: e.target.value })}
                    placeholder="https://"
                    className={fieldClass}
                />
            </Field>
            <Field label="Country">
                <input
                    value={data.country}
                    onChange={(e) => set({ country: e.target.value })}
                    placeholder="United States"
                    className={fieldClass}
                />
            </Field>
            <Field label="Company email">
                <input
                    type="email"
                    value={data.companyEmail || data.email}
                    onChange={(e) => set({ companyEmail: e.target.value })}
                    placeholder="team@acme.com"
                    className={fieldClass}
                />
            </Field>
            <Field label="Contact person">
                <input
                    value={data.contactPerson}
                    onChange={(e) => set({ contactPerson: e.target.value })}
                    placeholder="Jane Doe"
                    className={fieldClass}
                />
            </Field>
            <Field label="Phone number">
                <input
                    type="tel"
                    value={data.phoneNumber}
                    onChange={(e) => set({ phoneNumber: e.target.value })}
                    placeholder="+1 555 000 0000"
                    className={fieldClass}
                />
            </Field>
        </div>
    )
}

function GoalsStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="rounded-3xl border border-hairline bg-surface-elevated p-7 sm:p-8">
            <Field label="Your goals">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="e.g. Drive app installs ahead of our Q3 launch, and build a pool of creators we can re-engage for future campaigns."
                    rows={6}
                    className={`${fieldClass} resize-none`}
                />
            </Field>
        </div>
    )
}

type StepDetailsB = {
    brand_name: string
    brand_email: string
}

function CompleteStep(props: StepDetailsB) {
   
   
    return (
        <div className="overflow-hidden rounded-3xl border border-hairline bg-surface-elevated p-8 text-center sm:p-12">
            <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-glow"
                style={{ backgroundImage: 'var(--gradient-primary)' }}
            >
                <PartyPopper className="h-7 w-7" />
            </div>
            <h2 className="font-display mt-6 text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
                Your account is being prepared
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
                Thanks for the details. A member of our team will reach out within one business day to verify your
                account and guide you through your first campaign. Please make sure you remember or safely note down
                your password, as you’ll need it to sign in once your account has been verified.
            </p>
            <div className="mx-auto mt-7 grid max-w-md gap-3 text-left">
                {['Account verification', 'Personalized creator pool', 'Campaign launch walkthrough'].map((t) => (
                    <div
                        key={t}
                        className="flex items-center gap-3 rounded-2xl border border-hairline bg-background px-4 py-3 text-sm text-ink"
                    >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3.5 w-3.5" />
                        </span>
                        {t}
                    </div>
                ))}
            </div>
        </div>
    )
}

const fieldClass =
    'w-full rounded-xl border border-hairline bg-background px-4 py-3 text-[14px] text-ink placeholder:text-ink-soft/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'

function Field({
    label,
    icon,
    children,
    full = false,
}: {
    label: string
    icon?: React.ReactNode
    children: React.ReactNode
    full?: boolean
}) {
    return (
        <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
            <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                {icon}
                {label}
            </span>
            {children}
        </label>
    )
}
