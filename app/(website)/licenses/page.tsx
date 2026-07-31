import type { Metadata } from 'next'
import { ShieldCheck, FileBadge, Globe2, Lock } from 'lucide-react'
import { AudienceProvider } from '@/components/site/AudienceContext'
import { Nav } from '@/components/site/Nav'
import { Footer } from '@/components/site/Footer'

export const metadata: Metadata = {
    title: 'Our Licenses — Goheza',
    description: "Goheza's registrations, certifications, and compliance — built on trust.",
    openGraph: {
        title: 'Goheza Licenses & Compliance',
        description: 'Registrations, certifications, and compliance for the Goheza platform.',
    },
}

const LICENSE_ITEMS = [
    {
        icon: FileBadge,
        title: 'Business Registration',
        desc: 'Goheza Technologies Ltd · Registered in Uganda. ',
    },
    {
        icon: ShieldCheck,
        title: 'Data Protection',
        desc: 'Goheza is registered with the  Personal Data Protection Office (PDPO) ',
    },
    {
        icon: Globe2,
        title: 'International Operations',
        desc: 'Authorized to disburse creator payouts across 40+ countries through licensed payment partners.',
    },
    {
        icon: Lock,
        title: 'Security & Standards',
        desc: 'SOC 2 Type II program in progress. TLS 1.3, encryption at rest, and least-privilege access controls.',
    },
]

export default function LicensesPage() {
    return (
        <AudienceProvider>
            <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
                <Nav />
                <main className="pt-32 pb-20 sm:pt-40">
                    <div className="mx-auto max-w-5xl px-5 sm:px-8">
                        <p className="font-display italic text-[14px] text-ink-soft/70">Trust & Compliance</p>
                        <h1 className="font-display mt-2 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-6xl">
                            Our Licenses
                        </h1>
                        <p className="mt-5 max-w-2xl text-muted-foreground">
                            Goheza is built on transparent operations and verifiable trust. Below is an overview of our
                            registrations, certifications, and the standards we hold ourselves to.
                        </p>

                        <div className="mt-12 grid gap-4 sm:grid-cols-2">
                            {LICENSE_ITEMS.map(({ icon: Icon, title, desc }) => (
                                <div
                                    key={title}
                                    className="rounded-3xl border border-hairline bg-surface-elevated p-6 shadow-card transition-transform hover:-translate-y-1"
                                >
                                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[oklch(0.95_0.03_70)] text-[oklch(0.55_0.18_45)]">
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <h3 className="font-display mt-4 text-lg font-semibold tracking-[-0.02em] text-ink">
                                        {title}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 rounded-3xl border border-hairline bg-surface-warm p-6 sm:p-8">
                            <p className="text-sm text-ink-soft">
                                Need verification documents for procurement or compliance? Email{' '}
                                <a
                                    href="mailto:info@goheza.com"
                                    className="font-semibold text-ink underline underline-offset-4"
                                >
                                    info@goheza.com
                                </a>{' '}
                                and we'll respond within one business day.
                            </p>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </AudienceProvider>
    )
}
