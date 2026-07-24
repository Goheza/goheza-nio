'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import type { BrandProfile } from '@/types/brand'

export default function Profile() {
    const [profile, setProfile] = useState<BrandProfile | null>(null)
    const [form, setForm] = useState({
        brand_name: '',
        website: '',
        country: '',
        brand_email: '',
        phone: '',
        contact: '',
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData?.user) return
            const { data } = await supabase
                .from('brand_profiles')
                .select('*')
                .eq('user_id', userData.user.id)
                .maybeSingle()
            if (cancelled) return
            const p = data as BrandProfile | null
            setProfile(p)
            setForm({
                brand_name: p?.brand_name ?? '',
                website: p?.website ?? '',
                country: p?.country ?? '',
                brand_email: p?.brand_email ?? '',
                phone: p?.phone ?? '',
                contact: p?.contact ?? '',
            })
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
            const { error } = await supabase.from('brand_profiles').update(form).eq('user_id', profile.user_id)
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

    const initial = (form.brand_name || '?').slice(0, 1).toUpperCase()

    return (
        <div className="space-y-6">
            <PageHeader title="Brand Profile" subtitle="How creators see your brand. Keep it sharp and on-brand." />

            <DashCard>
                <div className="flex flex-wrap items-center gap-5">
                    {profile.logo_url ? (
                        <img
                            src={profile.logo_url}
                            alt={form.brand_name}
                            className="h-20 w-20 rounded-3xl object-cover shadow-card"
                        />
                    ) : (
                        <span
                            className="flex h-20 w-20 items-center justify-center rounded-3xl text-2xl font-bold text-white shadow-card"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            {initial}
                        </span>
                    )}
                    <div className="min-w-0">
                        <p className="font-display text-2xl font-semibold text-ink">
                            {form.brand_name || 'Your brand'}
                        </p>
                        <p className="text-sm text-muted-foreground">{form.brand_email}</p>
                    </div>
                    <button
                        disabled
                        title="Coming soon"
                        className="ml-auto rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink/40 cursor-not-allowed"
                    >
                        Upload Logo
                    </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Company name"
                        value={form.brand_name}
                        onChange={(v) => setForm((f) => ({ ...f, brand_name: v }))}
                    />
                    <Field
                        label="Website"
                        value={form.website}
                        onChange={(v) => setForm((f) => ({ ...f, website: v }))}
                    />
                    <Field
                        label="Country"
                        value={form.country}
                        onChange={(v) => setForm((f) => ({ ...f, country: v }))}
                    />
                    <Field
                        label="Company email"
                        value={form.brand_email}
                        onChange={(v) => setForm((f) => ({ ...f, brand_email: v }))}
                    />
                    <Field label="Phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
                    <Field
                        label="Contact person"
                        value={form.contact}
                        onChange={(v) => setForm((f) => ({ ...f, contact: v }))}
                    />
                </div>
            </DashCard>

            <div className="flex items-center justify-end gap-3">
                {saved && <span className="text-sm font-medium text-[oklch(0.45_0.14_152)]">Saved</span>}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.02] disabled:opacity-50"
                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                >
                    {saving ? 'Saving…' : 'Save Profile'}
                </button>
            </div>
        </div>
    )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                {label}
            </span>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-hairline bg-background px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
        </label>
    )
}
