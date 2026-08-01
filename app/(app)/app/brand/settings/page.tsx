'use client'

import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, X } from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { requestAccountDeletion, getPendingDeletionRequest } from '@/lib/api/account-deletion'

export default function Settings() {
    const [userId, setUserId] = useState<string | null>(null)
    const [form, setForm] = useState({ brand_email: '', phone: '' })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteReason, setDeleteReason] = useState('')
    const [deleteSubmitting, setDeleteSubmitting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [pendingDeletion, setPendingDeletion] = useState<{ requested_at: string } | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData?.user) return
            setUserId(userData.user.id)

            const { data: profile } = await supabase
                .from('brand_profiles')
                .select('brand_email, phone')
                .eq('user_id', userData.user.id)
                .maybeSingle()
            if (cancelled) return
            setForm({ brand_email: profile?.brand_email ?? '', phone: profile?.phone ?? '' })

            const pending = await getPendingDeletionRequest(userData.user.id)
            if (!cancelled) setPendingDeletion(pending)

            setLoading(false)
        })()
        return () => {
            cancelled = true
        }
    }, [])

    async function handleSave() {
        if (!userId) return
        try {
            setSaving(true)
            setSaveError(null)
            const { error } = await supabase.from('brand_profiles').update(form).eq('user_id', userId)
            if (error) throw error
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    async function handleDeleteRequest() {
        if (!userId) return
        try {
            setDeleteSubmitting(true)
            setDeleteError(null)
            await requestAccountDeletion(userId, 'brand', deleteReason)
            setPendingDeletion({ requested_at: new Date().toISOString() })
            setDeleteOpen(false)
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Failed to submit request. Please try again.')
        } finally {
            setDeleteSubmitting(false)
        }
    }

    if (loading) {
        return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Settings" subtitle="Account details and preferences." />

            <DashCard>
                <Header icon={<Shield className="h-4 w-4" />} title="Account" />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Input
                        label="Account email"
                        value={form.brand_email}
                        onChange={(v) => setForm((f) => ({ ...f, brand_email: v }))}
                    />
                    <Input
                        label="Phone number"
                        value={form.phone}
                        onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                    />
                </div>
                {saveError && <p className="mt-3 text-sm font-medium text-red-500">{saveError}</p>}
                <div className="mt-5 flex items-center justify-end gap-3">
                    {saved && <span className="text-sm font-medium text-[oklch(0.45_0.14_152)]">Saved</span>}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </DashCard>

            <DashCard className="border-[oklch(0.85_0.04_25)]">
                <Header icon={<AlertTriangle className="h-4 w-4" />} title="Danger zone" />
                <p className="mt-2 text-sm text-muted-foreground">
                    Requesting account deletion submits your request to our team for review. Your account and
                    campaign data remain active until the request is processed.
                </p>

                {pendingDeletion ? (
                    <div className="mt-4 rounded-xl border border-[oklch(0.85_0.04_25)] bg-[oklch(0.97_0.02_25)] p-3 text-sm text-[oklch(0.5_0.18_25)]">
                        Deletion requested on {new Date(pendingDeletion.requested_at).toLocaleDateString()}. Our team
                        will follow up before anything is removed.
                    </div>
                ) : (
                    <button
                        onClick={() => setDeleteOpen(true)}
                        className="mt-4 rounded-full border border-[oklch(0.85_0.04_25)] bg-background px-5 py-2 text-sm font-semibold text-[oklch(0.5_0.18_25)] hover:bg-[oklch(0.97_0.03_25)]"
                    >
                        Request account deletion
                    </button>
                )}
            </DashCard>

            {deleteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <button
                        aria-label="Close"
                        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
                        onClick={() => setDeleteOpen(false)}
                    />
                    <div className="relative w-full max-w-md rounded-2xl bg-surface-elevated p-5 shadow-elevated">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-display text-lg font-semibold text-ink">Request account deletion</p>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Tell us why — this helps our team process your request faster.
                                </p>
                            </div>
                            <button
                                onClick={() => setDeleteOpen(false)}
                                className="rounded-full bg-ink/5 p-1.5 text-ink hover:bg-ink/10"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <textarea
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            rows={3}
                            placeholder="Optional — let us know why you're leaving"
                            className="mt-4 w-full rounded-xl border border-hairline bg-background px-3 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        {deleteError && <p className="mt-2 text-sm font-medium text-red-500">{deleteError}</p>}
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setDeleteOpen(false)}
                                className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteRequest}
                                disabled={deleteSubmitting}
                                className="rounded-full bg-[oklch(0.5_0.18_25)] px-4 py-2 text-sm font-semibold text-white hover:bg-[oklch(0.45_0.18_25)] disabled:opacity-50"
                            >
                                {deleteSubmitting ? 'Submitting…' : 'Submit request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function Header({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink/5 text-ink-soft">{icon}</span>
            <p className="text-sm font-semibold text-ink">{title}</p>
        </div>
    )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
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