'use client'

import { useEffect, useState } from 'react'
import { Landmark, Smartphone, Plus, Star, Trash2, Check, Loader2 } from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import {
    listPaymentMethods,
    addPaymentMethod,
    setDefaultPaymentMethod,
    removePaymentMethod,
} from '@/lib/api/creator-payment-methods'
import type { CreatorPaymentMethod, PaymentMethodType } from '@/types/payment-method'

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Settings" subtitle="Manage your account, security, payment methods, and preferences." />

            {/* NOTE: Account/Security/Notification prefs/Privacy below are UI-only —
                no DB columns exist for password change, 2FA, notification
                preferences, or privacy toggles yet. Only Payment Methods is real. */}
            <DashCard>
                <p className="text-sm font-semibold text-ink">Account</p>
                <p className="mt-1 text-xs text-muted-foreground">Email and username editing coming soon.</p>
            </DashCard>

            <PaymentMethodsCard />

            <DashCard>
                <p className="text-sm font-semibold text-ink">Notification Preferences</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Not wired yet — all notifications are currently on by default.
                </p>
            </DashCard>

            <DashCard className="border-[oklch(0.85_0.06_25)] bg-[oklch(0.98_0.02_25)]">
                <p className="text-sm font-semibold text-[oklch(0.45_0.18_25)]">Danger Zone</p>
                <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-ink-soft">Permanently delete your account and all of its data.</p>
                    <button
                        disabled
                        title="Coming soon"
                        className="rounded-full bg-[oklch(0.55_0.18_25)]/40 px-5 py-2 text-sm font-semibold text-white cursor-not-allowed"
                    >
                        Delete Account
                    </button>
                </div>
            </DashCard>
        </div>
    )
}

function PaymentMethodsCard() {
    const [methods, setMethods] = useState<CreatorPaymentMethod[]>([])
    const [creatorId, setCreatorId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState<null | PaymentMethodType>(null)
    const [flash, setFlash] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const [bank, setBank] = useState({ bankName: '', accountName: '', accountNumber: '' })
    const [momo, setMomo] = useState({ network: '', phone: '', registeredName: '' })

    async function load() {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) return
        setCreatorId(userData.user.id)
        const list = await listPaymentMethods(userData.user.id)
        setMethods(list)
    }

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            setLoading(true)
            await load()
            if (!cancelled) setLoading(false)
        })()
        return () => {
            cancelled = true
        }
    }, [])

    function notify(msg: string) {
        setFlash(msg)
        window.setTimeout(() => setFlash(null), 2500)
    }

    async function makeDefault(id: string) {
        if (!creatorId) return
        setBusy(true)
        await setDefaultPaymentMethod(creatorId, id)
        await load()
        setBusy(false)
        notify('Default payment method updated.')
    }

    async function remove(id: string) {
        setBusy(true)
        await removePaymentMethod(id)
        await load()
        setBusy(false)
        notify('Payment method removed.')
    }

    async function saveNew() {
        if (!creatorId) return
        setBusy(true)
        try {
            if (adding === 'Bank Account' && bank.bankName && bank.accountNumber) {
                await addPaymentMethod(creatorId, {
                    type: 'Bank Account',
                    label: bank.bankName,
                    details: `${bank.accountName} · ••••${bank.accountNumber.slice(-4)}`,
                })
                setBank({ bankName: '', accountName: '', accountNumber: '' })
                notify('Bank account added.')
            } else if (adding === 'Mobile Money' && momo.network && momo.phone) {
                await addPaymentMethod(creatorId, {
                    type: 'Mobile Money',
                    label: momo.network,
                    details: `${momo.registeredName} · ${momo.phone}`,
                })
                setMomo({ network: '', phone: '', registeredName: '' })
                notify('Mobile money account added.')
            }
            setAdding(null)
            await load()
        } finally {
            setBusy(false)
        }
    }

    return (
        <DashCard>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-ink">Payment Methods</p>
                    <p className="text-xs text-muted-foreground">Add or update where your earnings get sent.</p>
                </div>
                {!adding && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setAdding('Bank Account')}
                            className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5"
                        >
                            <Plus className="h-3.5 w-3.5" /> Bank
                        </button>
                        <button
                            onClick={() => setAdding('Mobile Money')}
                            className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5"
                        >
                            <Plus className="h-3.5 w-3.5" /> Mobile Money
                        </button>
                    </div>
                )}
            </div>

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
                <ul className="mt-4 space-y-3">
                    {methods.map((m) => (
                        <li
                            key={m.id}
                            className="flex flex-wrap items-center gap-4 rounded-2xl border border-hairline bg-background p-4"
                        >
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink/5">
                                {m.type === 'Bank Account' ? (
                                    <Landmark className="h-5 w-5 text-ink" />
                                ) : (
                                    <Smartphone className="h-5 w-5 text-ink" />
                                )}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-ink">{m.label}</p>
                                    {m.is_default && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.94_0.07_55)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[oklch(0.5_0.18_45)]">
                                            <Star className="h-2.5 w-2.5 fill-current" /> Default
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {m.type} · {m.details}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {!m.is_default && (
                                    <button
                                        disabled={busy}
                                        onClick={() => makeDefault(m.id)}
                                        className="rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                                    >
                                        Set default
                                    </button>
                                )}
                                <button
                                    disabled={busy}
                                    onClick={() => remove(m.id)}
                                    className="rounded-full border border-hairline bg-background p-2 text-[oklch(0.55_0.18_25)] hover:bg-[oklch(0.97_0.04_25)] disabled:opacity-50"
                                    aria-label="Remove"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </li>
                    ))}
                    {methods.length === 0 && (
                        <p className="text-sm text-muted-foreground">No payment methods added yet.</p>
                    )}
                </ul>
            )}

            {adding && (
                <div className="mt-5 rounded-2xl border border-hairline bg-[oklch(0.97_0.012_78)] p-5">
                    <p className="text-sm font-semibold text-ink">Add {adding}</p>
                    {adding === 'Bank Account' ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            <Field
                                label="Bank Name"
                                value={bank.bankName}
                                onChange={(v) => setBank({ ...bank, bankName: v })}
                            />
                            <Field
                                label="Account Name"
                                value={bank.accountName}
                                onChange={(v) => setBank({ ...bank, accountName: v })}
                            />
                            <Field
                                label="Account Number"
                                value={bank.accountNumber}
                                onChange={(v) => setBank({ ...bank, accountNumber: v })}
                            />
                        </div>
                    ) : (
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            <Field
                                label="Mobile Network"
                                value={momo.network}
                                onChange={(v) => setMomo({ ...momo, network: v })}
                                placeholder="MTN, Airtel, M-Pesa…"
                            />
                            <Field
                                label="Phone Number"
                                value={momo.phone}
                                onChange={(v) => setMomo({ ...momo, phone: v })}
                                placeholder="+256…"
                            />
                            <Field
                                label="Registered Name"
                                value={momo.registeredName}
                                onChange={(v) => setMomo({ ...momo, registeredName: v })}
                            />
                        </div>
                    )}
                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            onClick={() => setAdding(null)}
                            className="rounded-full border border-hairline bg-background px-4 py-2 text-xs font-semibold text-ink hover:bg-ink/5"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={busy}
                            onClick={saveNew}
                            className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            {busy ? 'Saving…' : 'Save Payment Method'}
                        </button>
                    </div>
                </div>
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
