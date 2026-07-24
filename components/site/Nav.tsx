'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { Logo } from './Logo'
import { useAudience } from './AudienceContext'
import { ArrowRight, Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

type NavLink = {
    label: string
    /** in-page anchor on the home route */
    section?: string
    /** dedicated route */
    to?: string
}

const links: NavLink[] = [
    { label: 'How Goheza Works', section: 'how-it-works' },
    { label: 'Why Us', section: 'why-goheza' },
    { label: 'FAQs', section: 'faq' },
    { label: 'Licenses', to: '/licenses' },
    { label: 'Contact Us', to: '/contact' },
    { label: 'Blog', to: '/blog' },
]

export function Nav() {
    const { audience } = useAudience()
    const [scrolled, setScrolled] = useState(false)
    const [open, setOpen] = useState(false)
    const [activeSection, setActiveSection] = useState<string | null>(null)
    const location = usePathname()
    const onHome = location === '/'

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12)
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => {
        setOpen(false)
    }, [location])

    // Scrollspy for in-page sections
    useEffect(() => {
        if (!onHome) {
            setActiveSection(null)
            return
        }
        const ids = ['how-it-works', 'why-goheza', 'testimonials', 'faq', 'blog', 'cta']
        const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
        if (els.length === 0) return

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
                if (visible) setActiveSection(visible.target.id)
            },
            { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
        )
        els.forEach((el) => observer.observe(el))
        return () => observer.disconnect()
    }, [onHome])

    const ctaLabel = audience === 'brands' ? 'Launch My Campaign' : 'Start Earning Today'

    const handleSectionClick = (e: React.MouseEvent, section: string) => {
        if (!onHome) return // let the Link navigate to home + hash
        e.preventDefault()
        const el = document.getElementById(section)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            history.replaceState(null, '', `#${section}`)
        }
    }

    const isActive = (l: NavLink) => {
        if (l.section) return onHome && activeSection === l.section
        if (l.to) return location.startsWith(l.to)
        return false
    }

    return (
        <header
            className={`fixed inset-x-0 top-0 z-50 px-4 transition-all duration-500 ease-out ${
                scrolled ? 'pt-2 sm:pt-3' : 'pt-4 sm:pt-6'
            }`}
        >
            <div
                className={`mx-auto flex items-center justify-between transition-all duration-500 ease-out ${
                    scrolled
                        ? 'max-w-6xl rounded-full border border-hairline bg-background/90 px-3 py-2 shadow-[0_10px_40px_-20px_oklch(0.22_0.022_265/0.35)] backdrop-blur-xl sm:px-4 sm:py-2'
                        : 'max-w-7xl rounded-full border border-transparent bg-background/30 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-3.5'
                }`}
            >
                <Logo height={scrolled ? 36 : 44} className="transition-all duration-500" />

                <nav className="hidden items-center gap-0.5 lg:flex">
                    {links.map((l) => {
                        const className = `relative rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                            isActive(l) ? 'text-ink' : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
                        }`
                        const indicator = isActive(l) ? (
                            <span aria-hidden className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-coral" />
                        ) : null

                        if (l.section) {
                            return (
                                <a
                                    key={l.label}
                                    href={`/#${l.section}`}
                                    onClick={(e) => handleSectionClick(e, l.section!)}
                                    className={className}
                                >
                                    {l.label}
                                    {indicator}
                                </a>
                            )
                        }
                        return (
                            <Link key={l.label} href={l.to!} className={className}>
                                {l.label}
                                {indicator}
                            </Link>
                        )
                    })}
                </nav>

                <div className="hidden items-center gap-2 lg:flex">
                    <Link
                        href="/app/auth/login"
                        className={`rounded-full border-2 border-coral/30 bg-white font-semibold text-coral shadow-sm transition-all hover:-translate-y-0.5 hover:border-coral hover:bg-coral hover:text-white hover:shadow-md ${
                            scrolled ? 'px-3.5 py-1.5 text-[13px]' : 'px-4 py-2 text-[13px]'
                        }`}
                    >
                        Log in
                    </Link>
                    <a
                        href={`/app/get-started?as=${audience === 'brands' ? 'brand' : 'creator'}`}
                        className={`group inline-flex items-center gap-1.5 rounded-full bg-ink font-semibold text-background transition-all duration-300 hover:scale-[1.03] ${
                            scrolled ? 'px-4 py-2 text-[13px]' : 'px-5 py-2.5 text-[13.5px]'
                        }`}
                    >
                        {ctaLabel}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </a>
                </div>

                <button
                    aria-label="Toggle menu"
                    onClick={() => setOpen((v) => !v)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface-elevated lg:hidden"
                >
                    {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
            </div>

            {open && (
                <div className="mx-4 mt-2 rounded-3xl border border-hairline bg-background/95 p-5 shadow-elevated backdrop-blur-xl lg:hidden">
                    <nav className="grid">
                        {links.map((l) =>
                            l.section ? (
                                <a
                                    key={l.label}
                                    href={`/#${l.section}`}
                                    onClick={(e) => {
                                        handleSectionClick(e, l.section!)
                                        setOpen(false)
                                    }}
                                    className="rounded-xl px-3 py-3 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink"
                                >
                                    {l.label}
                                </a>
                            ) : (
                                <Link
                                    key={l.label}
                                    href={l.to!}
                                    className="rounded-xl px-3 py-3 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink"
                                >
                                    {l.label}
                                </Link>
                            )
                        )}
                        <Link
                            href="/app/auth/login"
                            className="rounded-xl px-3 py-3 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink"
                        >
                            Log in
                        </Link>
                    </nav>
                    <a
                        href={`/get-started?as=${audience === 'brands' ? 'brand' : 'creator'}`}
                        onClick={() => setOpen(false)}
                        className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-background"
                    >
                        {ctaLabel}
                        <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                </div>
            )}
        </header>
    )
}
