'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, CreditCard, Smartphone, Sparkles, PartyPopper, ArrowRight } from 'lucide-react'
import { OnboardingShell } from '@/components/app/onboarding/OnboardingShell'
import { loadOnboarding, saveOnboarding, clearOnboarding } from '@/lib/onboarding-storage'
import {
    TikTokLogo,
    InstagramLogo,
    YouTubeLogo,
    FacebookLogo,
    XLogo,
    LinkedInLogo,
    GoogleLogo,
} from '@/components/app/brand-logos'
import { supabase } from '@/lib/supabase'
import { signUpCreatorWithEmail, signInCreatorWithGoogle } from '@/lib/api/creator-auth'
// import { startTikTokConnect } from '@/lib/api/tiktok-oauth'
import {
    getCreatorProfile,
    getCreatorSocialAccounts,
    submitCreatorOnboarding,
    resumeStepForProfile,
} from '@/lib/api/creator-onboarding'
import { activateTiktokOAuth } from '@/lib/tiktok-auth'
import { activateInstagramOAuth } from '@/lib/instagram-auth'

const PROVIDER_ICONS = {
    tiktok: TikTokLogo,
} as const

const TOTAL = 9
const STORAGE_KEY = 'goheza.onboarding.creator'

type PaymentMethod = 'bank' | 'mobile' | ''

type CreatorData = {
    fullName: string
    email: string
    password: string
    confirm: string
    displayName: string
    username: string
    bio: string
    country: string
    city: string
    languages: string[]
    categories: string[]
    referral: string
    paymentMethod: PaymentMethod
    bankName: string
    bankAccountName: string
    bankAccountNumber: string
    mobilePhone: string
    mobileName: string
    connected: string[]
}

const DEFAULT: CreatorData = {
    fullName: '',
    email: '',
    password: '',
    confirm: '',
    displayName: '',
    username: '',
    bio: '',
    country: '',
    city: '',
    languages: [],
    categories: [],
    referral: '',
    paymentMethod: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    mobilePhone: '',
    mobileName: '',
    connected: [],
}

const LANGUAGES = ['English', 'Luganda', 'Swahili', 'French', 'Arabic', 'Spanish', 'Portuguese', 'Other']
const CATEGORIES = [
    'Beauty',
    'Fashion',
    'Lifestyle',
    'Travel',
    'Food',
    'Technology',
    'Gaming',
    'Comedy',
    'Education',
    'Business',
    'Fitness',
    'Outdoor',
    'Photography',
    'Music',
    'Family',
    'Sports',
    'DIY',
    'Finance',
    'Cars',
    'Entertainment',
]
const REFERRALS = [
    'TikTok',
    'Instagram',
    'YouTube',
    'Friend',
    'Google Search',
    'Facebook',
    'LinkedIn',
    'Event',
    'Advertisement',
    'Other',
]

const PROVIDERS = [{ id: 'tiktok', name: 'TikTok', color: '#000000', accent: '#FE2C55' }]

export default function CreatorOnboarding() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [step, setStep] = useState(1)
    const [data, setData] = useState<CreatorData>(DEFAULT)
    const [loadingPhase, setLoadingPhase] = useState(0)
    const [checkingSession, setCheckingSession] = useState(true)
    const [authLoading, setAuthLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [authError, setAuthError] = useState<string | null>(null)
    const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [connectingTiktok, setConnectingTiktok] = useState(false)
    const [socialConnectError, setSocialConnectError] = useState<string | null>(null)
    const [connectingInstagram, setConnectingInstagram] = useState(false)

    useEffect(() => setData(loadOnboarding(STORAGE_KEY, DEFAULT)), [])
    // Never persist password/confirm to localStorage — only the redacted
    // rest of the draft. A page reload mid-flow means re-typing the
    // password, which is an acceptable tradeoff for not leaving plaintext
    // credentials sitting in the browser's storage.
    useEffect(() => {
        const { password, confirm, ...redacted } = data
        saveOnboarding(STORAGE_KEY, redacted)
    }, [data])

    useEffect(() => {
        if (searchParams.get('social') === 'error') {
            const provider = searchParams.get('provider')
            setSocialConnectError(
                provider === 'instagram'
                    ? 'Could not connect your Instagram account. Please try again.'
                    : 'Could not connect your TikTok account. Please try again.'
            )
            const params = new URLSearchParams(searchParams.toString())
            params.delete('social')
            params.delete('provider')
            const rest = params.toString()
            window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''))
        }
    }, [searchParams])

    const connectInstagramAccount = async () => {
        try {
            setSocialConnectError(null)
            setConnectingInstagram(true)
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session?.user) {
                throw new Error('Your session expired — please sign in again.')
            }
            activateInstagramOAuth()
        } catch (err) {
            setConnectingInstagram(false)
            setSocialConnectError(err instanceof Error ? err.message : 'Could not start the Instagram connection.')
        }
    }

    const connectTiktokAccount = async () => {
        try {
            setSocialConnectError(null)
            setConnectingTiktok(true)
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session?.user) {
                throw new Error('Your session expired — please sign in again.')
            }
            await activateTiktokOAuth()
        } catch (err) {
            setConnectingTiktok(false)
            setSocialConnectError(err instanceof Error ? err.message : 'Could not start the TikTok connection.')
        }
    }

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
                const [profile, connectedPlatforms] = await Promise.all([
                    getCreatorProfile(session.user.id),
                    getCreatorSocialAccounts(session.user.id),
                ])

                if (cancelled) return

                if (profile) {
                    setData((d) => ({
                        ...d,
                        fullName: profile.full_name || d.fullName,
                        email: profile.email || d.email,
                        displayName: profile.display_name || d.displayName,
                        username: profile.username || d.username,
                        bio: profile.bio || d.bio,
                        country: profile.country || d.country,
                        city: profile.city || d.city,
                        languages: profile.languages?.length ? profile.languages : d.languages,
                        categories: profile.content_niches?.length ? profile.content_niches : d.categories,
                        referral: profile.referral_source || d.referral,
                        paymentMethod: (profile.payment_method as PaymentMethod) || d.paymentMethod,
                        bankName: profile.payment_bank_name || d.bankName,
                        bankAccountName: profile.payment_account_name || d.bankAccountName,
                        bankAccountNumber: profile.payment_account_number || d.bankAccountNumber,
                        mobilePhone: profile.payment_mobilemoney_number || d.mobilePhone,
                        mobileName: profile.payment_mobilemoney_name || d.mobileName,
                        connected: connectedPlatforms.length ? connectedPlatforms : d.connected,
                    }))

                    setStep(resumeStepForProfile(profile, connectedPlatforms.length))
                }
            } catch (err) {
                console.error('Failed to load existing creator profile:', err)
            } finally {
                if (!cancelled) setCheckingSession(false)
            }
        }

        resume()
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        if (step !== 8) return
        setLoadingPhase(0)

        const phaseTimers = [900, 1500, 2200].map((d, i) => setTimeout(() => setLoadingPhase(i + 1), d))

        async function finish() {
            try {
                const { data: userData } = await supabase.auth.getUser()
                if (!userData?.user) throw new Error('Session expired. Please sign in again.')

                await submitCreatorOnboarding({
                    userId: userData.user.id,
                    fullName: data.fullName,
                    email: data.email,
                    displayName: data.displayName,
                    username: data.username,
                    bio: data.bio,
                    country: data.country,
                    city: data.city,
                    languages: data.languages,
                    categories: data.categories,
                    referral: data.referral,
                    paymentMethod: data.paymentMethod,
                    bankName: data.bankName,
                    bankAccountName: data.bankAccountName,
                    bankAccountNumber: data.bankAccountNumber,
                    mobilePhone: data.mobilePhone,
                    mobileName: data.mobileName,
                    connected: data.connected,
                })
                // Onboarding fully complete — clear the draft (including any
                // leftover non-sensitive fields) rather than letting it sit
                // in localStorage indefinitely.
                clearOnboarding(STORAGE_KEY)
                setStep(9)
            } catch (err) {
                setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
                setStep(7)
            }
        }

        const minDisplay = setTimeout(finish, 3200)

        return () => {
            phaseTimers.forEach(clearTimeout)
            clearTimeout(minDisplay)
        }
    }, [step, data])

    const set = (p: Partial<CreatorData>) => setData((d) => ({ ...d, ...p }))
    const toggle = (key: 'languages' | 'categories' | 'connected', v: string, max?: number) =>
        setData((d) => {
            const has = d[key].includes(v)
            let next = has ? d[key].filter((x) => x !== v) : [...d[key], v]
            if (max && next.length > max) next = next.slice(0, max)
            return { ...d, [key]: next }
        })

    const canContinue = useMemo(() => {
        if (step === 1)
            return data.fullName && data.email && data.password.length >= 6 && data.password === data.confirm
        if (step === 2) return data.displayName && data.username && data.country
        if (step === 3) return data.languages.length > 0
        if (step === 4) return data.categories.length > 0
        if (step === 5) return !!data.referral
        if (step === 6) {
            if (data.paymentMethod === 'bank') return data.bankName && data.bankAccountName && data.bankAccountNumber
            if (data.paymentMethod === 'mobile') return data.mobilePhone && data.mobileName
            return false
        }
        if (step === 7) return data.connected.length >= 1
        return true
    }, [step, data])

    const next = () => setStep((s) => Math.min(TOTAL, s + 1))
    const back = () => setStep((s) => Math.max(1, s - 1))

    const handleNext = async () => {
        if (step === 1) {
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
                const { hasSession } = await signUpCreatorWithEmail(data.fullName, data.email, data.password)
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
        next()
    }

    async function handleGoogle() {
        try {
            setGoogleLoading(true)
            setAuthError(null)
            await signInCreatorWithGoogle()
        } catch (err) {
            setAuthError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.')
            setGoogleLoading(false)
        }
    }

    const titles = [
        'Create Your Creator Account',
        "Let's Create Your Profile",
        'Tell us about your Content',
        'What content do you create?',
        'How did you find Goheza?',
        'How would you like to be paid?',
        'Link your Social Accounts',
        '',
        '',
    ]
    const subtitles = [
        'Join thousands of creators earning from real performance.',
        'Your profile is how brands discover and trust you.',
        'Pick every language you create in.',
        'Here leave the ones that havent connected yet as coming soon',
        "We'd love to know how you found us.",
        'Choose a payout method. You can change this anytime.',
        'Here leave the ones that havent connected yet as coming soon',
        '',
        '',
    ]

    const side = step >= 2 && step <= 7 ? <ProfilePreview data={data} /> : null

    if (checkingSession) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
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
                        <Check className="h-6 w-6" />
                    </div>
                    <h1 className="font-display mt-5 text-2xl font-semibold text-ink">Check your email</h1>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                        We've sent a confirmation link to <span className="font-medium text-ink">{data.email}</span>.
                        Click it to activate your account, then come back to continue onboarding.
                    </p>
                    <Link
                        href="/"
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
            title={titles[step - 1]}
            subtitle={subtitles[step - 1]}
            onBack={step > 1 && step !== 8 && step !== 9 ? back : undefined}
            onContinue={step < TOTAL ? handleNext : () => router.push('/')}
            continueLabel={
                step === 1
                    ? authLoading
                        ? 'Creating account…'
                        : 'Continue'
                    : step === 8
                    ? ''
                    : step === 9
                    ? 'Browse Campaigns'
                    : 'Continue'
            }
            continueDisabled={!canContinue || authLoading}
            hideFooter={step === 8 || step === 9}
            side={side}
        >
            {step === 1 && (
                <>
                    <AccountStep data={data} set={set} onGoogle={handleGoogle} googleLoading={googleLoading} />
                    {authError && <p className="mt-3 text-sm font-medium text-red-500">{authError}</p>}
                </>
            )}
            {step === 2 && <ProfileStep data={data} set={set} />}
            {step === 3 && (
                <SelectGrid
                    options={LANGUAGES}
                    selected={data.languages}
                    onToggle={(v) => toggle('languages', v)}
                    subLabel={`${data.languages.length}/${LANGUAGES.length} selected`}
                />
            )}
            {step === 4 && (
                <SelectGrid
                    options={CATEGORIES}
                    selected={data.categories}
                    onToggle={(v) => toggle('categories', v, 6)}
                    subLabel={`${data.categories.length}/6 — Choose up to 6`}
                />
            )}
            {step === 5 && (
                <SelectGrid
                    options={REFERRALS}
                    selected={data.referral ? [data.referral] : []}
                    onToggle={(v) => set({ referral: data.referral === v ? '' : v })}
                    subLabel={data.referral ? `Selected: ${data.referral}` : 'Pick one'}
                    single
                />
            )}
            {step === 6 && <PaymentStep data={data} set={set} />}
            {step === 7 && (
                <>
                    <SocialsStep
                        connected={data.connected}
                        connecting={connectingTiktok}
                        onConnectTiktok={connectTiktokAccount}
                        onConnectInstagram={connectInstagramAccount}
                        connectingInstagram={connectingInstagram}
                    />
                    {(socialConnectError || submitError) && (
                        <p className="mt-3 text-sm font-medium text-red-500">{socialConnectError || submitError}</p>
                    )}
                </>
            )}
            {step === 8 && <ConnectingStep phase={loadingPhase} />}
            {step === 9 && <SuccessStep data={data} />}
        </OnboardingShell>
    )
}

/* --------- Step Subcomponents & Placeholders --------- */
const fieldClass =
    'w-full rounded-2xl border border-hairline bg-background px-4 py-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/25'

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <label className="text-xs font-semibold text-ink-soft">{label}</label>
            {children}
        </div>
    )
}

function ProfilePreview({ data }: { data: CreatorData }) {
    return (
        <div className="p-4 border border-hairline rounded-3xl bg-surface-elevated">
            Preview: {data.displayName || 'Creator'}
        </div>
    )
}
function SocialsStep({
    connected,
    connecting,
    onConnectTiktok,
    onConnectInstagram,
    connectingInstagram,
}: {
    connected: string[]
    connecting: boolean
    onConnectTiktok: () => void
    onConnectInstagram: () => void
    connectingInstagram: boolean
}) {
    return (
        <div className="rounded-3xl border border-hairline bg-surface-elevated p-7 sm:p-8 space-y-4">
            <button
                type="button"
                onClick={onConnectTiktok}
                disabled={connecting || connected.includes('tiktok')}
                className="flex w-full items-center justify-between rounded-2xl border border-hairline bg-background px-5 py-4 transition-colors hover:bg-ink/5 disabled:opacity-60"
            >
                <div className="flex items-center gap-3">
                    <TikTokLogo size={20} />
                    <span className="text-sm font-semibold text-ink">TikTok</span>
                </div>
                <span className="text-xs font-semibold text-primary">
                    {connected.includes('tiktok') ? 'Connected' : connecting ? 'Connecting...' : 'Connect'}
                </span>
            </button>
            <button
                type="button"
                onClick={onConnectInstagram}
                disabled={connectingInstagram || connected.includes('instagram')}
                className="flex w-full items-center justify-between rounded-2xl border border-hairline bg-background px-5 py-4 transition-colors hover:bg-ink/5 disabled:opacity-60"
            >
                <div className="flex items-center gap-3">
                    <InstagramLogo size={20} />
                    <span className="text-sm font-semibold text-ink">Instagram</span>
                </div>
                <span className="text-xs font-semibold text-primary">
                    {connected.includes('instagram') ? 'Connected' : connectingInstagram ? 'Connecting...' : 'Connect'}
                </span>
            </button>
            <div className="opacity-50 cursor-not-allowed flex w-full items-center justify-between rounded-2xl border border-hairline bg-background/50 px-5 py-4">
                <div className="flex items-center gap-3">
                    <YouTubeLogo size={20} />
                    <span className="text-sm font-semibold text-ink">YouTube</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground">Coming Soon</span>
            </div>
        </div>
    )
}
function ConnectingStep({ phase }: { phase: number }) {
    return (
        <div className="text-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-sm font-medium text-ink-soft">Processing phase {phase + 1}...</p>
        </div>
    )
}
function SuccessStep({ data }: { data: CreatorData }) {
    const router = useRouter()

    const onContinue = () => {
        router.push('/app/auth/login')
    }
    return (
        <div className="text-center p-8">
            <PartyPopper className="h-12 w-12 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold text-ink">Welcome aboard, {data.displayName || 'Creator'}!</h2>
            <button
                type="button"
                onClick={onContinue}
                className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                style={{ backgroundImage: 'var(--gradient-primary)' }}
            >
                Login
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
        </div>
    )
}
// (Include internal AccountStep, ProfileStep, SelectGrid,  logic from your original code here)

function AccountStep({
    data,
    set,
    onGoogle,
    googleLoading,
}: {
    data: CreatorData
    set: (p: Partial<CreatorData>) => void
    onGoogle: () => void
    googleLoading: boolean
}) {
    const checks = [
        { label: 'Full name added', ok: !!data.fullName.trim() },
        { label: 'Email added', ok: !!data.email.trim() },
        { label: 'Password is at least 6 characters', ok: data.password.length >= 6 },
        { label: 'Passwords match', ok: data.password.length > 0 && data.password === data.confirm },
    ]
    return (
        <div className="rounded-3xl border border-hairline bg-surface-elevated p-7 sm:p-8">
            <button
                type="button"
                onClick={onGoogle}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-hairline bg-background px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink/5 disabled:opacity-50"
            >
                <GoogleLogo size={18} />
                {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-hairline" />
                <span className="text-[11px] uppercase tracking-[0.16em] text-ink-soft">or sign up with email</span>
                <div className="h-px flex-1 bg-hairline" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                    <input
                        className={fieldClass}
                        value={data.fullName}
                        onChange={(e) => set({ fullName: e.target.value })}
                        placeholder="Jane Doe"
                    />
                </Field>
                <Field label="Email">
                    <input
                        className={fieldClass}
                        type="email"
                        value={data.email}
                        onChange={(e) => set({ email: e.target.value })}
                        placeholder="you@email.com"
                    />
                </Field>
                <Field label="Password">
                    <input
                        className={fieldClass}
                        type="password"
                        value={data.password}
                        onChange={(e) => set({ password: e.target.value })}
                        placeholder="Min 6 characters"
                    />
                </Field>
                <Field label="Confirm password">
                    <input
                        className={fieldClass}
                        type="password"
                        value={data.confirm}
                        onChange={(e) => set({ confirm: e.target.value })}
                        placeholder="Repeat password"
                    />
                </Field>
            </div>

            <ul className="mt-5 space-y-1.5">
                {checks.map((c) => (
                    <li
                        key={c.label}
                        className={`flex items-center gap-2 text-[12px] ${
                            c.ok ? 'text-[oklch(0.45_0.16_152)]' : 'text-muted-foreground'
                        }`}
                    >
                        <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full ${
                                c.ok ? 'bg-[oklch(0.95_0.08_152)]' : 'bg-ink/10'
                            }`}
                        >
                            {c.ok ? (
                                <Check className="h-2.5 w-2.5" />
                            ) : (
                                <span className="h-1 w-1 rounded-full bg-ink-soft" />
                            )}
                        </span>
                        {c.label}
                    </li>
                ))}
            </ul>

            <p className="mt-5 text-[11px] text-muted-foreground">
                By creating an account you agree to our <span className="underline">Terms</span> and{' '}
                <span className="underline">Privacy Policy</span>.
            </p>
        </div>
    )
}

function ProfileStep({ data, set }: { data: CreatorData; set: (p: Partial<CreatorData>) => void }) {
    return (
        <div className="rounded-3xl border border-hairline bg-surface-elevated p-7 sm:p-8">
            <Field label="Profile photo">
                <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/10 text-ink-soft">
                        {data.displayName ? data.displayName.slice(0, 1).toUpperCase() : '+'}
                    </div>
                    <button
                        type="button"
                        disabled
                        title="Coming soon"
                        className="rounded-full border border-hairline bg-background px-4 py-2 text-xs font-semibold text-ink/40 cursor-not-allowed"
                    >
                        Upload photo
                    </button>
                </div>
            </Field>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Display name">
                    <input
                        className={fieldClass}
                        value={data.displayName}
                        onChange={(e) => set({ displayName: e.target.value })}
                        placeholder="Jane D."
                    />
                </Field>
                <Field label="Username">
                    <input
                        className={fieldClass}
                        value={data.username}
                        onChange={(e) => set({ username: e.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase() })}
                        placeholder="@yourhandle"
                    />
                </Field>
                <Field label="Country">
                    <input
                        className={fieldClass}
                        value={data.country}
                        onChange={(e) => set({ country: e.target.value })}
                        placeholder="Uganda"
                    />
                </Field>
                <Field label="City">
                    <input
                        className={fieldClass}
                        value={data.city}
                        onChange={(e) => set({ city: e.target.value })}
                        placeholder="Kampala"
                    />
                </Field>
                <Field label="Bio" className="sm:col-span-2">
                    <textarea
                        className={`${fieldClass} min-h-[88px] resize-none`}
                        maxLength={60}
                        value={data.bio}
                        onChange={(e) => set({ bio: e.target.value })}
                        placeholder="A short one-liner about you"
                    />
                    <span className="mt-1 block text-right text-[11px] text-muted-foreground">
                        {data.bio.length}/60
                    </span>
                </Field>
            </div>
        </div>
    )
}

function SelectGrid({
    options,
    selected,
    onToggle,
    subLabel,
    single,
}: {
    options: string[]
    selected: string[]
    onToggle: (v: string) => void
    subLabel: string
    single?: boolean
}) {
    return (
        <div className="rounded-3xl border border-hairline bg-surface-elevated p-7 sm:p-8">
            <div className="flex flex-wrap gap-2.5">
                {options.map((o) => {
                    const on = selected.includes(o)
                    return (
                        <button
                            key={o}
                            type="button"
                            onClick={() => onToggle(o)}
                            className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all ${
                                on
                                    ? 'border-primary/40 bg-primary/10 text-ink shadow-glow'
                                    : 'border-hairline bg-background text-ink-soft hover:border-ink/20 hover:text-ink'
                            }`}
                        >
                            {single ? o : on ? `✓ ${o}` : o}
                        </button>
                    )
                })}
            </div>
            <p className="mt-5 text-xs font-medium text-muted-foreground">{subLabel}</p>
        </div>
    )
}

function PaymentStep({ data, set }: { data: CreatorData; set: (p: Partial<CreatorData>) => void }) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
                <PaymentCard
                    selected={data.paymentMethod === 'bank'}
                    onClick={() => set({ paymentMethod: 'bank' })}
                    icon={<CreditCard className="h-5 w-5" />}
                    title="Bank Account"
                    body="Best for larger payouts. 1–3 business days."
                />
                <PaymentCard
                    selected={data.paymentMethod === 'mobile'}
                    onClick={() => set({ paymentMethod: 'mobile' })}
                    icon={<Smartphone className="h-5 w-5" />}
                    title="Mobile Money"
                    body="Fast, near-instant payouts to your phone."
                />
            </div>

            {data.paymentMethod === 'bank' && (
                <div className="rounded-3xl border border-hairline bg-surface-elevated p-7">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Bank name">
                            <input
                                className={fieldClass}
                                value={data.bankName}
                                onChange={(e) => set({ bankName: e.target.value })}
                            />
                        </Field>
                        <Field label="Account name">
                            <input
                                className={fieldClass}
                                value={data.bankAccountName}
                                onChange={(e) => set({ bankAccountName: e.target.value })}
                            />
                        </Field>
                        <Field label="Account number" className="sm:col-span-2">
                            <input
                                className={fieldClass}
                                value={data.bankAccountNumber}
                                onChange={(e) => set({ bankAccountNumber: e.target.value })}
                            />
                        </Field>
                    </div>
                </div>
            )}
            {data.paymentMethod === 'mobile' && (
                <div className="rounded-3xl border border-hairline bg-surface-elevated p-7">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Phone number">
                            <input
                                className={fieldClass}
                                value={data.mobilePhone}
                                onChange={(e) => set({ mobilePhone: e.target.value })}
                                placeholder="+256…"
                            />
                        </Field>
                        <Field label="Registered name">
                            <input
                                className={fieldClass}
                                value={data.mobileName}
                                onChange={(e) => set({ mobileName: e.target.value })}
                            />
                        </Field>
                    </div>
                </div>
            )}
        </div>
    )
}

function PaymentCard({
    selected,
    onClick,
    icon,
    title,
    body,
}: {
    selected: boolean
    onClick: () => void
    icon: React.ReactNode
    title: string
    body: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex flex-col items-start gap-3 rounded-3xl border p-6 text-left transition-all ${
                selected
                    ? 'border-primary/40 bg-primary/5 shadow-glow ring-2 ring-primary/30'
                    : 'border-hairline bg-surface-elevated hover:-translate-y-0.5 hover:border-ink/15'
            }`}
        >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {icon}
            </span>
            <p className="font-display text-lg font-semibold text-ink">{title}</p>
            <p className="text-[13px] text-muted-foreground">{body}</p>
        </button>
    )
}
