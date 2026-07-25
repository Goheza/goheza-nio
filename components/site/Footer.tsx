"use client"

import Link from 'next/link'
import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { useAudience } from './AudienceContext'
import logoSrc from '@/assets/goheza-logo.png'

const navCol = {
    title: 'Navigation',
    links: [
        { label: 'Discover', to: '/' },
        { label: 'Creators', to: '/' },
        { label: 'Brands', to: '/' },
        { label: 'Blog', to: '/blog' },
    ],
}

const socialsCol = {
    title: 'Socials',
    links: [
        { label: 'Twitter/X', to: '/' },
        { label: 'Instagram', to: '/' },
        { label: 'LinkedIn', to: '/' },
    ],
}

const pagesCol = {
    title: 'Pages',
    links: [
        { label: 'Terms of Service', to: '/licenses' },
        { label: 'Privacy Policy', to: '/licenses' },
        { label: 'Our Licenses', to: '/licenses' },
        { label: 'Contact Us', to: '/contact' },
    ],
}

export function Footer() {
    const { audience } = useAudience()
    const ctaLabel = audience === 'brands' ? 'Launch My Campaign' : 'Start Earning Today'

    return (
        <footer className="relative overflow-hidden bg-background">
            {/* Main footer content — two-up: brand | link columns */}
            <div className="mx-auto max-w-7xl px-5 pt-10 pb-14 sm:px-8 lg:pt-16">
                <div className="grid gap-12 lg:grid-cols-[1.05fr_1.4fr] lg:gap-16">
                    {/* Brand side */}
                    <div>
                        <img src={logoSrc.src} alt="Goheza" className="block h-10 w-auto" draggable={false} />
                        <div className="mt-6 h-px w-full bg-hairline" />
                        <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ink-soft/80">
                            Performance marketing, powered by creators. Brands pay for outcomes. Creators earn on real
                            performance.
                        </p>
                        <div className="mt-8 flex items-center gap-3">
                            <a
                                href={`/app/get-started?as=${audience === 'brands' ? 'brand' : 'creator'}`}
                                className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-background shadow-[0_10px_30px_-12px_oklch(0.22_0.022_265/0.55)] transition-transform hover:scale-[1.02]"
                            >
                                {ctaLabel}
                                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            </a>
                            <a
                                href="#"
                                aria-label="Community"
                                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-ink text-background transition-transform hover:scale-[1.05]"
                            >
                                <MessageCircle className="h-4 w-4" />
                            </a>
                        </div>
                    </div>

                    {/* Link columns */}
                    <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
                        {[navCol, socialsCol, pagesCol].map((col) => (
                            <div key={col.title}>
                                <p className="text-[17px] font-semibold text-ink">{col.title}</p>
                                <ul className="mt-5 space-y-3.5">
                                    {col.links.map((l) => (
                                        <li key={l.label}>
                                            <Link
                                                href={l.to}
                                                className="text-[15px] text-ink-soft/75 transition-colors hover:text-coral"
                                            >
                                                {l.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="relative mt-2 overflow-hidden">
                <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(180deg, transparent 0%, oklch(0.88 0.09 55 / 0.45) 30%, oklch(0.745 0.175 51.2 / 0.85) 70%, oklch(0.62 0.20 55 / 0.95) 100%)',
                    }}
                />
                <div
                    aria-hidden
                    className="absolute inset-0 opacity-60"
                    style={{
                        background:
                            'radial-gradient(60% 50% at 20% 100%, oklch(0.85 0.10 51.2 / 0.5) 0%, transparent 60%), radial-gradient(50% 50% at 85% 80%, oklch(0.78 0.16 51.2 / 0.45) 0%, transparent 65%)',
                    }}
                />
                <div className="relative mx-auto max-w-[1400px] px-5 pt-16 sm:px-8 sm:pt-24">
                    <div className="flex items-end justify-center">
                        <span
                            className="font-display select-none text-center font-extrabold leading-[0.85] tracking-[-0.05em]"
                            style={{
                                fontSize: 'clamp(72px, 19vw, 280px)',
                                color: 'transparent',
                                WebkitTextStroke: '0px transparent',
                                background:
                                    'linear-gradient(180deg, oklch(1 0 0 / 0.98) 0%, oklch(1 0 0 / 0.6) 55%, oklch(0.97 0.05 51.2 / 0.4) 100%)',
                                WebkitBackgroundClip: 'text',
                                backgroundClip: 'text',
                                textShadow: '0 2px 0 oklch(1 0 0 / 0.15)',
                            }}
                        >
                            GOHEZA
                        </span>
                    </div>

                    <div className="mt-8 h-px w-full bg-white/30" />
                    <div className="flex flex-col items-center justify-between gap-2 py-5 sm:flex-row">
                        <p className="text-xs font-medium text-white/90">Goheza © {new Date().getFullYear()}</p>
                        <p className="text-xs font-medium text-white/90">All rights reserved.</p>
                    </div>
                </div>
            </div>
        </footer>
    )
}
