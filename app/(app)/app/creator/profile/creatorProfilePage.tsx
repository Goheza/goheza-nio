'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Camera, MapPin, Languages, Tag, CreditCard, LinkIcon, Loader2, Pencil, X, Check, Plus } from 'lucide-react'
import { DashCard, PageHeader, BrandAvatar } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { uploadCreatorAvatar } from '@/lib/api/storage'
import { activateTiktokOAuth } from '@/lib/tiktok-auth'
import { tiktokErrorMessage } from '@/lib/tiktok-error-message'
import type { CreatorProfile, SocialPlatform } from '@/types/creator'

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
    tiktok: 'TikTok',
    instagram: 'Instagram',
    youtube: 'YouTube',
    facebook: 'Facebook',
    x: 'X',
    linkedin: 'LinkedIn',
}

type SocialAccount = {
    platform: string
    external_username: string | null
    token_status: 'reconnect_required' | 'active'
}

type EditableDetails = {
    city: string
    country: string
    languages: string[]
    content_niches: string[]
    payment_method: string
    payment_bank_name: string
    payment_mobilemoney_name: string
}

export default function ProfilePage() {
    const searchParams = useSearchParams()

    const [profile, setProfile] = useState<CreatorProfile | null>(null)
    const [socials, setSocials] = useState<SocialAccount[]>([])
    const [bio, setBio] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [avatarError, setAvatarError] = useState<string | null>(null)
    const avatarInputRef = useRef<HTMLInputElement>(null)

    // TikTok connect state
    const [connectingTiktok, setConnectingTiktok] = useState(false)
    const [tiktokError, setTiktokError] = useState(false)
    const [tiktokErrorReason, setTiktokErrorReason] = useState<string | null>(null) // ADD THIS

    // Editable "Details" card state
    const [editingDetails, setEditingDetails] = useState(false)
    const [savingDetails, setSavingDetails] = useState(false)
    const [details, setDetails] = useState<EditableDetails>({
        city: '',
        country: '',
        languages: [],
        content_niches: [],
        payment_method: 'none',
        payment_bank_name: '',
        payment_mobilemoney_name: '',
    })
    const [languagesInput, setLanguagesInput] = useState('')
    const [nichesInput, setNichesInput] = useState('')

    /**
     * Check if they have the account Present in their database
     */
    const hasTikTok = socials.some((s) => s.platform === 'tiktok')
    /**
     * Check if the present account actually required reconnection.
     */
    const requiresReconnection = socials.some((s) => s.token_status == 'reconnect_required')

    // Handle redirect back from TikTok OAuth (?provider=tiktok&social=connected|error)
    useEffect(() => {
        const provider = searchParams.get('provider')
        const social = searchParams.get('social')
        const reason = searchParams.get('reason') // ADD THIS
        if (provider !== 'tiktok') return
        setTiktokError(social === 'error')
        setTiktokErrorReason(reason) // ADD THIS
        const p = new URLSearchParams(searchParams.toString())
        p.delete('social')
        p.delete('provider')
        p.delete('reason') // ADD THIS
        window.history.replaceState(null, '', window.location.pathname + (p.toString() ? `?${p}` : ''))
        reloadSocials()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])

    async function reloadSocials() {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) return
        const { data: s } = await supabase
            .from('creator_social_accounts')
            .select('platform, external_username,token_status')
            .eq('user_id', userData.user.id)
        setSocials(s ?? [])
    }

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData?.user) return

            const [{ data: p }, { data: s }] = await Promise.all([
                supabase.from('creator_profiles').select('*').eq('user_id', userData.user.id).maybeSingle(),
                supabase
                    .from('creator_social_accounts')
                    .select('platform, external_username,token_status')
                    .eq('user_id', userData.user.id),
            ])

            if (cancelled) return
            const prof = p as CreatorProfile
            //set the profile
            setProfile(prof)
            //set the avatar
            setAvatarUrl(prof?.avatar_url ?? null)
            setBio(prof?.bio ?? '')
            //set the socials option
            setSocials(s ?? [])
            setDetails({
                city: prof?.city ?? '',
                country: prof?.country ?? '',
                languages: prof?.languages ?? [],
                content_niches: prof?.content_niches ?? [],
                payment_method: prof?.payment_method ?? 'none',
                payment_bank_name: prof?.payment_bank_name ?? '',
                payment_mobilemoney_name: prof?.payment_mobilemoney_name ?? '',
            })
            setLanguagesInput((prof?.languages ?? []).join(', '))
            setNichesInput((prof?.content_niches ?? []).join(', '))
            setLoading(false)
        })()
        return () => {
            cancelled = true
        }
    }, [])

    async function handleSave() {
        if (!profile) return
        try {
            setSaving(true)
            const { error } = await supabase.from('creator_profiles').update({ bio }).eq('user_id', profile.user_id)
            if (error) throw error
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } finally {
            setSaving(false)
        }
    }

    async function handleConnectTiktok() {
        try {
            setTiktokError(false)
            setConnectingTiktok(true)
            await activateTiktokOAuth(`/app/creator/profile`)
        } catch {
            setTiktokError(true)
        } finally {
            setConnectingTiktok(false)
        }
    }

    function startEditingDetails() {
        setEditingDetails(true)
    }

    function cancelEditingDetails() {
        if (!profile) return
        setDetails({
            city: profile.city ?? '',
            country: profile.country ?? '',
            languages: profile.languages ?? [],
            content_niches: profile.content_niches ?? [],
            payment_method: profile.payment_method ?? 'none',
            payment_bank_name: profile.payment_bank_name ?? '',
            payment_mobilemoney_name: profile.payment_mobilemoney_name ?? '',
        })
        setLanguagesInput((profile.languages ?? []).join(', '))
        setNichesInput((profile.content_niches ?? []).join(', '))
        setEditingDetails(false)
    }

    async function saveDetails() {
        if (!profile) return
        try {
            setSavingDetails(true)
            const parsedLanguages = languagesInput
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            const parsedNiches = nichesInput
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)

            const updatePayload = {
                city: details.city || null,
                country: details.country || null,
                languages: parsedLanguages,
                content_niches: parsedNiches,
                payment_method: details.payment_method,
                payment_bank_name: details.payment_method === 'bank' ? details.payment_bank_name || null : null,
                payment_mobilemoney_name:
                    details.payment_method === 'mobile' ? details.payment_mobilemoney_name || null : null,
            }

            const { error } = await supabase
                .from('creator_profiles')
                .update(updatePayload)
                .eq('user_id', profile.user_id)
            if (error) throw error

            setProfile({ ...profile, ...updatePayload } as CreatorProfile)
            setDetails({
                ...details,
                languages: parsedLanguages,
                content_niches: parsedNiches,
            })
            setEditingDetails(false)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } finally {
            setSavingDetails(false)
        }
    }

    if (loading || !profile) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file || !profile) return
        try {
            setAvatarError(null)
            setUploadingAvatar(true)
            const url = await uploadCreatorAvatar(file, profile.user_id)
            const { error } = await supabase
                .from('creator_profiles')
                .update({ avatar_url: url })
                .eq('user_id', profile.user_id)
            if (error) throw error
            setAvatarUrl(url)
        } catch (err) {
            setAvatarError(err instanceof Error ? err.message : 'Failed to upload photo.')
        } finally {
            setUploadingAvatar(false)
            if (avatarInputRef.current) avatarInputRef.current.value = ''
        }
    }

    const displayName = profile.display_name || profile.full_name

    return (
        <div className="space-y-6">
            <PageHeader title="Profile" subtitle="How brands and the Goheza community see you." />

            <DashCard>
                <div className="flex flex-wrap items-center gap-5">
                    <div className="relative">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={displayName}
                                className="h-20 w-20 rounded-full object-cover ring-2 ring-hairline"
                            />
                        ) : (
                            <BrandAvatar
                                initial={displayName.slice(0, 1).toUpperCase()}
                                color="oklch(0.66 0.20 42)"
                                size={80}
                            />
                        )}
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                        />
                        <button
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground hover:scale-105 disabled:opacity-50"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                            aria-label="Change photo"
                        >
                            {uploadingAvatar ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Camera className="h-3.5 w-3.5" />
                            )}
                        </button>
                    </div>
                    {avatarError && <p className="mt-1.5 text-xs font-medium text-red-500">{avatarError}</p>}
                    <div>
                        <p className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">{displayName}</p>
                        <p className="text-sm text-muted-foreground">
                            @{profile.username ?? '—'} · Joined{' '}
                            {new Date(profile.created_at).toLocaleDateString(undefined, {
                                month: 'long',
                                year: 'numeric',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: 'numeric',
                                second: 'numeric',
                            })}
                        </p>
                    </div>
                </div>
            </DashCard>

            <div className="grid gap-5 lg:grid-cols-2">
                <DashCard>
                    <p className="text-sm font-semibold text-ink">Bio</p>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        className="mt-3 w-full rounded-xl border border-hairline bg-background p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                </DashCard>

                <DashCard>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">Details</p>
                        {!editingDetails ? (
                            <button
                                onClick={startEditingDetails}
                                className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink/5"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={cancelEditingDetails}
                                    disabled={savingDetails}
                                    className="inline-flex items-center gap-1 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink/5 disabled:opacity-50"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Cancel
                                </button>
                                <button
                                    onClick={saveDetails}
                                    disabled={savingDetails}
                                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
                                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                                >
                                    {savingDetails ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Check className="h-3.5 w-3.5" />
                                    )}
                                    Save
                                </button>
                            </div>
                        )}
                    </div>

                    {!editingDetails ? (
                        <ul className="mt-4 space-y-3 text-sm">
                            <Row
                                icon={<MapPin className="h-4 w-4" />}
                                label="Location"
                                value={[profile.city, profile.country].filter(Boolean).join(', ') || '—'}
                            />
                            <Row
                                icon={<Languages className="h-4 w-4" />}
                                label="Languages"
                                value={profile.languages.length ? profile.languages.join(', ') : '—'}
                            />
                            <Row
                                icon={<Tag className="h-4 w-4" />}
                                label="Categories"
                                value={profile.content_niches.length ? profile.content_niches.join(', ') : '—'}
                            />
                            <Row
                                icon={<CreditCard className="h-4 w-4" />}
                                label="Default payout"
                                value={
                                    profile.payment_method === 'bank'
                                        ? `Bank · ${profile.payment_bank_name ?? 'Not set'}`
                                        : profile.payment_method === 'mobile'
                                        ? `Mobile Money · ${profile.payment_mobilemoney_name ?? 'Not set'}`
                                        : 'None set'
                                }
                            />
                        </ul>
                    ) : (
                        <div className="mt-4 space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-muted-foreground">City</label>
                                    <input
                                        value={details.city}
                                        onChange={(e) => setDetails((d) => ({ ...d, city: e.target.value }))}
                                        className="w-full rounded-xl border border-hairline bg-background p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="e.g. Kampala"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                        Country
                                    </label>
                                    <input
                                        value={details.country}
                                        onChange={(e) => setDetails((d) => ({ ...d, country: e.target.value }))}
                                        className="w-full rounded-xl border border-hairline bg-background p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="e.g. Uganda"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                    Languages (comma separated)
                                </label>
                                <input
                                    value={languagesInput}
                                    onChange={(e) => setLanguagesInput(e.target.value)}
                                    className="w-full rounded-xl border border-hairline bg-background p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    placeholder="English, Luganda"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                    Categories (comma separated)
                                </label>
                                <input
                                    value={nichesInput}
                                    onChange={(e) => setNichesInput(e.target.value)}
                                    className="w-full rounded-xl border border-hairline bg-background p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    placeholder="Beauty, Tech, Comedy"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                    Default payout method
                                </label>
                                <select
                                    value={details.payment_method}
                                    onChange={(e) => setDetails((d) => ({ ...d, payment_method: e.target.value }))}
                                    className="w-full rounded-xl border border-hairline bg-background p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                                >
                                    <option value="none">None</option>
                                    <option value="bank">Bank</option>
                                    <option value="mobile">Mobile Money</option>
                                </select>
                            </div>

                            {details.payment_method === 'bank' && (
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                        Bank name
                                    </label>
                                    <input
                                        value={details.payment_bank_name}
                                        onChange={(e) =>
                                            setDetails((d) => ({ ...d, payment_bank_name: e.target.value }))
                                        }
                                        className="w-full rounded-xl border border-hairline bg-background p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="e.g. Stanbic Bank"
                                    />
                                </div>
                            )}

                            {details.payment_method === 'mobile' && (
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                        Mobile money provider
                                    </label>
                                    <input
                                        value={details.payment_mobilemoney_name}
                                        onChange={(e) =>
                                            setDetails((d) => ({ ...d, payment_mobilemoney_name: e.target.value }))
                                        }
                                        className="w-full rounded-xl border border-hairline bg-background p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="e.g. MTN Mobile Money"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </DashCard>

                <DashCard className="lg:col-span-2">
                    <p className="text-sm font-semibold text-ink">Connected Social Accounts</p>
                    <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                        {socials.map((s) => {
                            const isTikTok = s.platform === 'tiktok'
                            const needsReconnect = isTikTok && s.token_status === 'reconnect_required'

                            return (
                                <li
                                    key={s.platform}
                                    className="flex items-center justify-between rounded-xl border border-hairline bg-background p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        {isTikTok ? (
                                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink/5 text-ink">
                                                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                                                    <path d="M16.6 5.82c-1.02-.9-1.66-2.2-1.66-3.66H12.2v14.11a2.7 2.7 0 1 1-2.7-2.7c.24 0 .48.03.7.09V10.9a5.9 5.9 0 0 0-.7-.04A5.7 5.7 0 1 0 15 16.56V9.4c1.1.8 2.44 1.27 3.9 1.27V7.9c-.85 0-1.65-.25-2.3-.68a4.3 4.3 0 0 1-.02-1.4z" />
                                                </svg>
                                            </span>
                                        ) : (
                                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink/5 text-ink">
                                                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                                                    <path d="M16.6 5.82c-1.02-.9-1.66-2.2-1.66-3.66H12.2v14.11a2.7 2.7 0 1 1-2.7-2.7c.24 0 .48.03.7.09V10.9a5.9 5.9 0 0 0-.7-.04A5.7 5.7 0 1 0 15 16.56V9.4c1.1.8 2.44 1.27 3.9 1.27V7.9c-.85 0-1.65-.25-2.3-.68a4.3 4.3 0 0 1-.02-1.4z" />
                                                </svg>
                                            </span>
                                        )}

                                        <div>
                                            <p className="text-sm font-semibold text-ink">
                                                {PLATFORM_LABELS[s.platform as SocialPlatform] ?? s.platform}
                                            </p>

                                            <p className="text-xs text-muted-foreground">
                                                {needsReconnect
                                                    ? 'Requires Reconnection'
                                                    : s.external_username ?? 'Connected'}
                                            </p>
                                        </div>
                                    </div>

                                    {needsReconnect ? (
                                        <button
                                            onClick={handleConnectTiktok}
                                            disabled={connectingTiktok}
                                            className="text-xs font-semibold text-primary hover:underline"
                                        >
                                            {connectingTiktok ? 'Connecting...' : 'Reconnect'}
                                        </button>
                                    ) : (
                                        <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                </li>
                            )
                        })}

                        {!hasTikTok && (
                            <li className="flex flex-col gap-2 rounded-xl border border-dashed border-hairline bg-background p-3">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink/5 text-xs font-bold text-ink">
                                        Ti
                                    </span>

                                    <div>
                                        <p className="text-sm font-semibold text-ink">TikTok</p>

                                        <p className="text-xs text-muted-foreground">Not connected</p>
                                    </div>
                                </div>

                                {tiktokError && (
                                    <p className="text-xs font-medium text-red-500">
                                        {tiktokErrorMessage(tiktokErrorReason)}
                                    </p>
                                )}
                                <button
                                    onClick={handleConnectTiktok}
                                    disabled={connectingTiktok}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
                                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                                >
                                    {connectingTiktok ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Plus className="h-3.5 w-3.5" />
                                    )}

                                    {tiktokError ? 'Try again' : 'Connect TikTok'}
                                </button>
                            </li>
                        )}

                        {socials.length === 0 && !hasTikTok && (
                            <p className="text-sm text-muted-foreground sm:col-span-3">
                                No social accounts connected yet.
                            </p>
                        )}
                    </ul>
                </DashCard>
            </div>

            <div className="flex items-center justify-end gap-3">
                {saved && <span className="text-sm font-medium text-[oklch(0.45_0.14_152)]">Saved</span>}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.02] disabled:opacity-50"
                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                >
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </div>
    )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <li className="flex items-center justify-between border-b border-hairline pb-3 last:border-0 last:pb-0">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
                {icon}
                {label}
            </span>
            <span className="font-semibold text-ink">{value}</span>
        </li>
    )
}
