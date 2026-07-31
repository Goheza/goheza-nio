'use client'

import Link from  'next/link'
import { MessageCircle, Mail, Calendar } from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'

export default function Support() {
    return (
        <div className="space-y-6">
            <PageHeader title="Support" subtitle="We're here whenever you need us." />

            <div className="grid gap-4 md:grid-cols-3">
                <Tile
                    icon={<MessageCircle className="h-5 w-5" />}
                    title="Live chat"
                    body="Average response under 5 minutes during business hours."
                    cta="Start chat"
                    href="#"
                />
                <Tile
                    icon={<Mail className="h-5 w-5" />}
                    title="Email"
                    body="info@goheza.com"
                    cta="Send email"
                    href="mailto:info@goheza.com"
                />
                {/* <Tile
                    icon={<Calendar className="h-5 w-5" />}
                    title="Talk to Sales"
                    body="Book a 30-minute strategy call."
                    cta="Schedule"
                    href="/schedule"
                    internal
                /> */}
            </div>

            <DashCard>
                <p className="text-sm font-semibold text-ink">Open a ticket</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Input label="Subject" />
                    <Input label="Campaign (optional)" />
                    <label className="block sm:col-span-2">
                        <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                            Describe your issue
                        </span>
                        <textarea
                            rows={5}
                            className="w-full rounded-xl border border-hairline bg-background p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </label>
                </div>
                <div className="mt-5 flex justify-end">
                    <button
                        className="rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.02]"
                        style={{ backgroundImage: 'var(--gradient-primary)' }}
                    >
                        Submit ticket
                    </button>
                </div>
            </DashCard>
        </div>
    )
}

function Tile({
    icon,
    title,
    body,
    cta,
    href,
    internal = false,
}: {
    icon: React.ReactNode
    title: string
    body: string
    cta: string
    href: string
    internal?: boolean
}) {
    return (
        <DashCard>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.94_0.07_55)] text-[oklch(0.55_0.18_45)]">
                {icon}
            </span>
            <p className="font-display mt-4 text-base font-semibold text-ink">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            {internal ? (
                <Link
                    href={href}
                    className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-ink/85"
                >
                    {cta}
                </Link>
            ) : (
                <a
                    href={href}
                    className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-ink/85"
                >
                    {cta}
                </a>
            )}
        </DashCard>
    )
}

function Input({ label }: { label: string }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                {label}
            </span>
            <input className="w-full rounded-xl border border-hairline bg-background px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </label>
    )
}
