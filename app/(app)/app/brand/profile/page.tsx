'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { uploadBrandAsset, validateAsset } from '@/lib/api/storage'
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
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [logoError, setLogoError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

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
            setLogoUrl(p?.logo_url ?? null)
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

    async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file || !profile) return

        const invalid = validateAsset(file)
        if (invalid) {
            setLogoError(invalid)
            return
        }
        if (!file.type.startsWith('image/')) {
            setLogoError('Please choose an image file for your logo.')
            return
        }

        try {
            setLogoError(null)
            setUploadingLogo(true)
            const asset = await uploadBrandAsset(file, profile.user_id)

            const { error } = await supabase
                .from('brand_profiles')
                .update({ logo_url: asset.url })
                .eq('user_id', profile.user_id)
            if (error) throw error

            setLogoUrl(asset.url)
        } catch (err) {
            setLogoError(err instanceof Error ? err.message : 'Failed to upload logo. Please try again.')
        } finally {
            setUploadingLogo(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
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
                    {logoUrl ? (
                        <img
                            src={logoUrl}
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

                    <div className="ml-auto flex flex-col items-end gap-1.5">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingLogo}
                            className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                        >
                            {uploadingLogo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {uploadingLogo ? 'Uploading…' : logoUrl ? 'Change Logo' : 'Upload Logo'}
                        </button>
                        {logoError && <p className="text-xs font-medium text-red-500">{logoError}</p>}
                    </div>
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
