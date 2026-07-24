'use client'

import { useState } from 'react'
import { CreditCard, Bell, Shield } from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'


export default function Settings() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Settings"
                subtitle="Account, billing and notification preferences."
            />

            <DashCard>
                <Header
                    icon={<Shield className="h-4 w-4" />}
                    title="Account"
                />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Input
                        label="Account email"
                        defaultValue="team@acmestudio.com"
                    />
                    <Input
                        label="Phone number"
                        defaultValue="+1 555 010 1234"
                    />
                </div>
                <div className="mt-5 flex justify-end">
                    <button className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white hover:bg-ink/85">
                        Save
                    </button>
                </div>
            </DashCard>

            <DashCard>
                <Header
                    icon={<CreditCard className="h-4 w-4" />}
                    title="Payment methods"
                />
                <ul className="mt-4 space-y-2">
                    {[
                        { brand: 'Visa', last4: '4242', exp: '08/28', primary: true },
                        { brand: 'Mastercard', last4: '9821', exp: '12/27', primary: false },
                    ].map((card) => (
                        <li
                            key={card.last4}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-background p-3 sm:p-4"
                        >
                            <div className="flex items-center gap-3">
                                <span className="flex h-9 w-12 items-center justify-center rounded-lg bg-ink text-[11px] font-bold uppercase text-white">
                                    {card.brand}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-ink">•••• {card.last4}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Expires {card.exp}
                                        {card.primary ? ' · Default' : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!card.primary && (
                                    <button className="rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5">
                                        Set default
                                    </button>
                                )}
                                <button className="rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5">
                                    Remove
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
                <button className="mt-4 rounded-full border border-dashed border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5">
                    + Add new payment method
                </button>
            </DashCard> 

            <DashCard>
                <Header icon={<Bell className="h-4 w-4" />} title="Notifications" />
                <ul className="mt-4 space-y-3 text-sm">
                    {[
                        "New creator applications",
                        "Submission updates",
                        "Approval & rejection actions by teammates",
                        "Submission limit reached",
                        "Live phase transitions",
                        "Campaign ended",
                        "Payment milestones",
                        "Wallet balance low",
                        "Platform announcements",
                    ].map((label) => (
                        <li key={label} className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-background p-3">
                            <span className="text-ink">{label}</span>
                            <Toggle defaultOn />
                        </li>
                    ))}
                </ul>
            </DashCard> 
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

function Input({ label, defaultValue }: { label: string; defaultValue?: string }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                {label}
            </span>
            <input
                defaultValue={defaultValue}
                className="w-full rounded-xl border border-hairline bg-background px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
        </label>
    )
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
    const [checked, setChecked] = useState(defaultOn)
    return (
        <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-ink/10 peer-checked:bg-primary peer-checked:[background-image:var(--gradient-primary)] transition-colors duration-200" />
            <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-5" />
        </label>
    )
}