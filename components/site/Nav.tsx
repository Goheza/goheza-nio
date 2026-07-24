'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { Logo } from './Logo'
import { useAudience } from './AudienceContext'
import { ArrowRight, Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

type NavLink = {
    label: string
    section?: string
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

    const pathname = usePathname()
    const onHome = pathname === '/'

    const [scrolled, setScrolled] = useState(false)
    const [open, setOpen] = useState(false)
    const [activeSection, setActiveSection] = useState<string | null>(null)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50)
        }

        handleScroll()

        window.addEventListener('scroll', handleScroll, {
            passive: true,
        })

        return () => {
            window.removeEventListener('scroll', handleScroll)
        }
    }, [])

    useEffect(() => {
        setOpen(false)
    }, [pathname])

    // Handle initial hash navigation
    useEffect(() => {
        if (!window.location.hash) return

        const id = window.location.hash.replace('#', '')

        setTimeout(() => {
            document.getElementById(id)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            })
        }, 50)
    }, [])

    // Scroll spy
    useEffect(() => {
        if (!onHome) {
            setActiveSection(null)
            return
        }

        const ids = ['how-it-works', 'why-goheza', 'testimonials', 'faq', 'blog', 'cta']

        const sections = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el))

        if (!sections.length) return

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

                if (visible) {
                    setActiveSection(visible.target.id)
                }
            },
            {
                rootMargin: '-30% 0px -55% 0px',
                threshold: [0, 0.25, 0.5, 0.75, 1],
            }
        )

        sections.forEach((section) => observer.observe(section))

        return () => observer.disconnect()
    }, [onHome])

    const ctaLabel = audience === 'brands' ? 'Launch My Campaign' : 'Start Earning Today'

    const handleSectionClick = (e: React.MouseEvent, section: string) => {
        if (!onHome) return

        e.preventDefault()

        const el = document.getElementById(section)

        if (el) {
            el.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            })

            window.history.replaceState(null, '', `#${section}`)
        }

        setOpen(false)
    }

    const isActive = (link: NavLink) => {
        if (link.section) {
            return onHome && activeSection === link.section
        }

        if (link.to) {
            return pathname.startsWith(link.to)
        }

        return false
    }

    return (
        <header className={`fixed inset-x-0 top-0 z-50 px-4 transition-all duration-500 ${scrolled ? 'pt-3' : 'pt-5'}`}>
            <div
                className={`mx-auto flex items-center justify-between transition-all duration-500 ${
                    scrolled
                        ? `
                        max-w-6xl
                        rounded-full
                        border
                        border-hairline
                        bg-background/90
                        px-4
                        py-2
                        shadow-[0_10px_40px_-20px_oklch(0.22_0.022_265/0.35)]
                        backdrop-blur-xl
                        `
                        : `
                        max-w-7xl
                        bg-transparent
                        px-4
                        py-3
                        sm:px-6
                        `
                }`}
            >
                <Logo height={scrolled ? 36 : 44} className="transition-all duration-500" />

                <nav className="hidden items-center gap-0.5 lg:flex">
                    {links.map((link) => {
                        const active = isActive(link)

                        const className = `
                            relative
                            rounded-full
                            px-3
                            py-1.5
                            text-[13px]
                            font-medium
                            transition-colors
                            ${active ? 'text-ink' : 'text-ink-soft hover:bg-ink/5 hover:text-ink'}
                        `

                        const indicator = active ? (
                            <span
                                aria-hidden
                                className="
                                    absolute
                                    inset-x-3
                                    -bottom-0.5
                                    h-0.5
                                    rounded-full
                                    bg-coral
                                    "
                            />
                        ) : null

                        if (link.section) {
                            return (
                                <a
                                    key={link.label}
                                    href={`/#${link.section}`}
                                    onClick={(e) => handleSectionClick(e, link.section!)}
                                    className={className}
                                >
                                    {link.label}
                                    {indicator}
                                </a>
                            )
                        }

                        return (
                            <Link key={link.label} href={link.to!} className={className}>
                                {link.label}
                                {indicator}
                            </Link>
                        )
                    })}
                </nav>

                <div className="hidden items-center gap-2 lg:flex">
                    <Link
                        href="/app/auth/login"
                        className={`
                        rounded-full
                        border-2
                        border-coral/30
                        bg-white
                        font-semibold
                        text-coral
                        shadow-sm
                        transition-all
                        hover:-translate-y-0.5
                        hover:border-coral
                        hover:bg-coral
                        hover:text-white
                        hover:shadow-md
                        ${scrolled ? 'px-3.5 py-1.5 text-[13px]' : 'px-4 py-2 text-[13px]'}
                        `}
                    >
                        Log in
                    </Link>

                    <a
                        href={`/app/get-started?as=${audience === 'brands' ? 'brand' : 'creator'}`}
                        className={`
                        group
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        bg-ink
                        font-semibold
                        text-background
                        transition-all
                        duration-300
                        hover:scale-[1.03]
                        ${scrolled ? 'px-4 py-2 text-[13px]' : 'px-5 py-2.5 text-[13.5px]'}
                        `}
                    >
                        {ctaLabel}

                        <ArrowRight
                            className="
                            h-3.5
                            w-3.5
                            transition-transform
                            group-hover:translate-x-0.5
                            "
                        />
                    </a>
                </div>

                <button
                    aria-label="Toggle menu"
                    aria-expanded={open}
                    onClick={() => setOpen((value) => !value)}
                    className="
                    inline-flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-hairline
                    bg-surface-elevated
                    lg:hidden
                    "
                >
                    {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
            </div>

            {open && (
                <div
                    className="
                    mx-4
                    mt-2
                    rounded-3xl
                    border
                    border-hairline
                    bg-background/95
                    p-5
                    shadow-elevated
                    backdrop-blur-xl
                    lg:hidden
                    "
                >
                    <nav className="grid">
                        {links.map((link) =>
                            link.section ? (
                                <a
                                    key={link.label}
                                    href={`/#${link.section}`}
                                    onClick={(e) => handleSectionClick(e, link.section!)}
                                    className="
                                    rounded-xl
                                    px-3
                                    py-3
                                    text-sm
                                    font-medium
                                    text-ink-soft
                                    hover:bg-ink/5
                                    hover:text-ink
                                    "
                                >
                                    {link.label}
                                </a>
                            ) : (
                                <Link
                                    key={link.label}
                                    href={link.to!}
                                    className="
                                    rounded-xl
                                    px-3
                                    py-3
                                    text-sm
                                    font-medium
                                    text-ink-soft
                                    hover:bg-ink/5
                                    hover:text-ink
                                    "
                                >
                                    {link.label}
                                </Link>
                            )
                        )}

                        <Link
                            href="/app/auth/login"
                            className="
                            rounded-xl
                            px-3
                            py-3
                            text-sm
                            font-medium
                            text-ink-soft
                            hover:bg-ink/5
                            hover:text-ink
                            "
                        >
                            Log in
                        </Link>
                    </nav>

                    <a
                        href={`/app/get-started?as=${audience === 'brands' ? 'brand' : 'creator'}`}
                        onClick={() => setOpen(false)}
                        className="
                        mt-3
                        flex
                        items-center
                        justify-center
                        gap-1.5
                        rounded-full
                        bg-ink
                        px-5
                        py-3
                        text-sm
                        font-semibold
                        text-background
                        "
                    >
                        {ctaLabel}

                        <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                </div>
            )}
        </header>
    )
}
