'use client'

import { useEffect, useState } from 'react'
import { Landmark, Smartphone, Check, Loader2, AlertTriangle, X } from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { requestAccountDeletion, getPendingDeletionRequest } from '@/lib/api/account-deletion'



export default function SettingsPage() {
    const [userId, setUserId] = useState<string | null>(null)
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
            if (cancelled) return
            setUserId(userData.user.id)

            const pending = await getPendingDeletionRequest(userData.user.id)
            if (!cancelled) setPendingDeletion(pending)
        })()
        return () => {
            cancelled = true
        }
    }, [])

    async function handleDeleteRequest() {
        if (!userId) return
        try {
            setDeleteSubmitting(true)
            setDeleteError(null)
            await requestAccountDeletion(userId, 'creator', deleteReason)
            setPendingDeletion({ requested_at: new Date().toISOString() })
            setDeleteOpen(false)
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Failed to submit request. Please try again.')
        } finally {
            setDeleteSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Settings" subtitle="Manage your account, security, and payment methods." />


            <PaymentMethodsCard />

            <DashCard className="border-[oklch(0.85_0.06_25)] bg-[oklch(0.98_0.02_25)]">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[oklch(0.45_0.18_25)]" />
                    <p className="text-sm font-semibold text-[oklch(0.45_0.18_25)]">Danger Zone</p>
                </div>

                {pendingDeletion ? (
                    <div className="mt-3 rounded-xl border border-[oklch(0.85_0.04_25)] bg-[oklch(0.97_0.02_25)] p-3 text-sm text-[oklch(0.5_0.18_25)]">
                        Deletion requested on {new Date(pendingDeletion.requested_at).toLocaleDateString()}. Our
                        team will follow up before anything is removed.
                    </div>
                ) : (
                    <div className="mt-3 flex items-center justify-between">
                        <p className="text-sm text-ink-soft">Request deletion of your account and all of its data.</p>
                        <button
                            onClick={() => setDeleteOpen(true)}
                            className="rounded-full bg-[oklch(0.55_0.18_25)] px-5 py-2 text-sm font-semibold text-white hover:bg-[oklch(0.5_0.18_25)]"
                        >
                            Delete Account
                        </button>
                    </div>
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

function PaymentMethodsCard() {
    const [userId, setUserId] = useState<string | null>(null)
    const [method, setMethod] = useState<'bank' | 'mobile' | ''>('')
    const [bank, setBank] = useState({ bankName: '', accountName: '', accountNumber: '' })
    const [momo, setMomo] = useState({ phone: '', registeredName: '' })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [flash, setFlash] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData?.user) return
            setUserId(userData.user.id)

            const { data: p } = await supabase
                .from('creator_profiles')
                .select('payment_method, payment_bank_name, payment_account_name, payment_account_number, payment_mobilemoney_name, payment_mobilemoney_number')
                .eq('user_id', userData.user.id)
                .maybeSingle()

            if (cancelled || !p) {
                if (!cancelled) setLoading(false)
                return
            }
            setMethod((p.payment_method as 'bank' | 'mobile') ?? '')
            setBank({
                bankName: p.payment_bank_name ?? '',
                accountName: p.payment_account_name ?? '',
                accountNumber: p.payment_account_number ?? '',
            })
            setMomo({
                phone: p.payment_mobilemoney_number ?? '',
                registeredName: p.payment_mobilemoney_name ?? '',
            })
            setLoading(false)
        })()
        return () => {
            cancelled = true
        }
    }, [])

    function notify(msg: string) {
        setFlash(msg)
        window.setTimeout(() => setFlash(null), 2500)
    }

    async function handleSave() {
        if (!userId || !method) return
        setSaving(true)
        try {
            const hasPaymentDetails =
                method === 'bank'
                    ? !!(bank.bankName && bank.accountName && bank.accountNumber)
                    : !!(momo.phone && momo.registeredName)

            const { error } = await supabase
                .from('creator_profiles')
                .update({
                    payment_method: method,
                    payment_bank_name: bank.bankName || null,
                    payment_account_name: method === 'bank' ? bank.accountName : momo.registeredName || null,
                    payment_account_number: bank.accountNumber || null,
                    payment_mobilemoney_name: momo.registeredName || null,
                    payment_mobilemoney_number: momo.phone || null,
                    has_payment_details: hasPaymentDetails,
                })
                .eq('user_id', userId)
            if (error) throw error
            notify('Payment method updated.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <DashCard>
            <p className="text-sm font-semibold text-ink">Payment Method</p>
            <p className="text-xs text-muted-foreground">Where your earnings get sent when you withdraw.</p>

            {flash && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[oklch(0.93_0.08_152)] px-3 py-1.5 text-xs font-semibold text-[oklch(0.4_0.14_152)]">
                    <Check className="h-3 w-3" /> {flash}
                </div>
            )}

            {loading ? (
                <div className="mt-6 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
                </div>
            ) : (
                <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <button
                            onClick={() => setMethod('bank')}
                            className={`flex items-center gap-2.5 rounded-xl border p-3 text-left ${
                                method === 'bank' ? 'border-primary/40 bg-primary/5' : 'border-hairline bg-background'
                            }`}
                        >
                            <Landmark className="h-4 w-4 text-ink" />
                            <span className="text-sm font-semibold text-ink">Bank Account</span>
                        </button>
                        <button
                            onClick={() => setMethod('mobile')}
                            className={`flex items-center gap-2.5 rounded-xl border p-3 text-left ${
                                method === 'mobile' ? 'border-primary/40 bg-primary/5' : 'border-hairline bg-background'
                            }`}
                        >
                            <Smartphone className="h-4 w-4 text-ink" />
                            <span className="text-sm font-semibold text-ink">Mobile Money</span>
                        </button>
                    </div>

                    {method === 'bank' && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <Field label="Bank Name" value={bank.bankName} onChange={(v) => setBank({ ...bank, bankName: v })} />
                            <Field label="Account Name" value={bank.accountName} onChange={(v) => setBank({ ...bank, accountName: v })} />
                            <Field label="Account Number" value={bank.accountNumber} onChange={(v) => setBank({ ...bank, accountNumber: v })} />
                        </div>
                    )}
                    {method === 'mobile' && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <Field label="Phone Number" value={momo.phone} onChange={(v) => setMomo({ ...momo, phone: v })} placeholder="+256…" />
                            <Field label="Registered Name" value={momo.registeredName} onChange={(v) => setMomo({ ...momo, registeredName: v })} />
                        </div>
                    )}

                    {method && (
                        <div className="mt-4 flex justify-end">
                            <button
                                disabled={saving}
                                onClick={handleSave}
                                className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
                                style={{ backgroundImage: 'var(--gradient-primary)' }}
                            >
                                {saving ? 'Saving…' : 'Save Payment Method'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </DashCard>
    )
}

function Field({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
}) {
    return (
        <label className="block">
            <span className="text-xs font-medium text-ink-soft">{label}</span>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="mt-1.5 w-full rounded-xl border border-hairline bg-background px-4 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
        </label>
    )
}
