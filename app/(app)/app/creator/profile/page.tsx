'use client'

import { useEffect, useState } from 'react'
import { Camera, MapPin, Languages, Tag, CreditCard, LinkIcon, Loader2 } from 'lucide-react'
import { DashCard, PageHeader, BrandAvatar } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { listPaymentMethods } from '@/lib/api/creator-payment-methods'
import type { CreatorProfile, SocialPlatform } from '@/types/creator'
import type { CreatorPaymentMethod } from '@/types/payment-method'

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
    tiktok: 'TikTok',
    instagram: 'Instagram',
    youtube: 'YouTube',
    facebook: 'Facebook',
    x: 'X',
    linkedin: 'LinkedIn',
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<CreatorProfile | null>(null)
    const [socials, setSocials] = useState<{ platform: string; external_username: string | null }[]>([])
    const [defaultPayment, setDefaultPayment] = useState<CreatorPaymentMethod | null>(null)
    const [bio, setBio] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData?.user) return

            const [{ data: p }, { data: s }, methods] = await Promise.all([
                supabase.from('creator_profiles').select('*').eq('user_id', userData.user.id).maybeSingle(),
                supabase
                    .from('creator_social_accounts')
                    .select('platform, external_username')
                    .eq('user_id', userData.user.id),
                listPaymentMethods(userData.user.id),
            ])

            if (cancelled) return
            setProfile(p as CreatorProfile)
            setBio((p as CreatorProfile)?.bio ?? '')
            setSocials(s ?? [])
            setDefaultPayment(methods.find((m) => m.is_default) ?? null)
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

    if (loading || !profile) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    const displayName = profile.display_name || profile.full_name

    return (
        <div className="space-y-6">
            <PageHeader title="Profile" subtitle="How brands and the Goheza community see you." />

            <DashCard>
                <div className="flex flex-wrap items-center gap-5">
                    <div className="relative">
                        {profile.avatar_url ? (
                            <img
                                src={profile.avatar_url}
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
                        <button
                            disabled
                            title="Coming soon"
                            className="absolute -bottom-1 -right-1 rounded-full bg-primary/40 p-1.5 text-primary-foreground cursor-not-allowed"
                            aria-label="Change photo"
                        >
                            <Camera className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div>
                        <p className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">{displayName}</p>
                        <p className="text-sm text-muted-foreground">
                            @{profile.username ?? '—'} · Joined{' '}
                            {new Date(profile.created_at).toLocaleDateString(undefined, {
                                month: 'long',
                                year: 'numeric',
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
                    <p className="text-sm font-semibold text-ink">Details</p>
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
                            value={defaultPayment ? `${defaultPayment.type} · ${defaultPayment.label}` : 'None set'}
                        />
                    </ul>
                </DashCard>

                <DashCard className="lg:col-span-2">
                    <p className="text-sm font-semibold text-ink">Connected Social Accounts</p>
                    <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                        {socials.map((s) => (
                            <li
                                key={s.platform}
                                className="flex items-center justify-between rounded-xl border border-hairline bg-background p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink/5 text-xs font-bold text-ink">
                                        {PLATFORM_LABELS[s.platform as SocialPlatform]?.slice(0, 2) ??
                                            s.platform.slice(0, 2)}
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-ink">
                                            {PLATFORM_LABELS[s.platform as SocialPlatform] ?? s.platform}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {s.external_username ?? 'Connected'}
                                        </p>
                                    </div>
                                </div>
                                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </li>
                        ))}
                        {socials.length === 0 && (
                            <p className="text-sm text-muted-foreground">No social accounts connected yet.</p>
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
