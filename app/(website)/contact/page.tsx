'use client'

import type { Metadata } from 'next'
import { Mail, Phone, MapPin } from 'lucide-react'
import { AudienceProvider } from '@/components/site/AudienceContext'
import { Nav } from '@/components/site/Nav'
import { Footer } from '@/components/site/Footer'

// Note: If you need export const metadata, split into a separate layout.tsx
// or metadata file since this page contains interactive form handlers.
const CONTACT_METHODS = [
    { icon: Mail, label: 'Email', value: 'hello@goheza.com' },
    { icon: Phone, label: 'Phone', value: '+256 700 000 000' },
    { icon: MapPin, label: 'HQ', value: 'Kampala, Uganda · Remote-first' },
]

export default function ContactPage() {
    return (
        <AudienceProvider>
            <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
                <Nav />
                <main className="pt-32 pb-20 sm:pt-40">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="font-display italic text-[14px] text-ink-soft/70">Contact</p>
                        <h1 className="font-display mt-2 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-6xl">
                            Let's build your performance channel.
                        </h1>
                        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
                            Tell us about your brand or your creator goals. We'll get back within one business day.
                        </p>
                    </div>

                    <div className="mx-auto mt-12 grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[1.1fr_1fr]">
                        <div className="space-y-5">
                            {CONTACT_METHODS.map(({ icon: Icon, label, value }) => (
                                <div key={label} className="flex items-center gap-4">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[oklch(0.95_0.03_70)] text-[oklch(0.55_0.18_45)]">
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                            {label}
                                        </p>
                                        <p className="text-sm font-semibold text-ink">{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form
                            onSubmit={(e) => e.preventDefault()}
                            className="rounded-3xl border border-hairline bg-surface-elevated p-6 shadow-card sm:p-8"
                        >
                            <div className="grid gap-4">
                                <Field label="Full name" placeholder="Jane Doe" />
                                <Field label="Email" type="email" placeholder="you@company.com" />
                                <Field label="Company / Handle" placeholder="Acme Inc / @creator" />
                                <div>
                                    <label className="text-[13px] font-medium text-ink-soft">How can we help?</label>
                                    <textarea
                                        rows={5}
                                        placeholder="Tell us about your goals…"
                                        className="mt-1.5 w-full rounded-2xl border border-hairline bg-background px-4 py-3 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
                                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                                >
                                    Send message
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
                <Footer />
            </div>
        </AudienceProvider>
    )
}

function Field({ label, type = 'text', placeholder }: { label: string; type?: string; placeholder?: string }) {
    return (
        <div>
            <label className="text-[13px] font-medium text-ink-soft">{label}</label>
            <input
                type={type}
                placeholder={placeholder}
                className="mt-1.5 w-full rounded-full border border-hairline bg-background px-4 py-3 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
        </div>
    )
}
