'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/site/Logo'

type Props = {
    step: number
    totalSteps: number
    title?: string
    subtitle?: string
    children: ReactNode
    side?: ReactNode
    onBack?: () => void
    onContinue?: () => void
    continueLabel?: string
    continueDisabled?: boolean
    hideFooter?: boolean
    showExit?: boolean
    /**
     * If the current step's fields are wrapped in a <form id={formId}>,
     * pass that id here. The Continue button becomes type="submit"
     * form={formId} instead of a plain onClick button, so the browser
     * runs native constraint validation (required, type="email",
     * minLength, pattern, etc.) and blocks submission with its own
     * inline errors before onContinue ever fires. The form's onSubmit
     * handler is expected to call onContinue itself after
     * preventDefault().
     */
    formId?: string
}

export function OnboardingShell({
    step,
    totalSteps,
    title,
    subtitle,
    children,
    side,
    onBack,
    onContinue,
    continueLabel = 'Continue',
    continueDisabled,
    hideFooter,
    showExit = true,
    formId,
}: Props) {
    return (
        <div className="min-h-screen bg-background">
            {/* Top bar */}
            <header className="sticky top-0 z-30 border-b border-hairline bg-background/85 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
                    <Logo  />
                    {showExit && (
                        <Link href="/app/get-started?as=brand" className="text-xs font-medium text-ink-soft hover:text-ink sm:text-sm">
                            Exit
                        </Link>
                    )}
                </div>
            </header>

            {/* Progress */}
            <div className="mx-auto max-w-6xl px-5 pt-6 sm:px-8">
                <div className="flex gap-1.5">
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                                i < step ? 'bg-primary' : 'bg-ink/10'
                            }`}
                            style={i < step ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
                        />
                    ))}
                </div>
                <p className="mt-2 text-xs font-medium text-ink-soft">
                    Step {step} of {totalSteps}
                </p>
            </div>

            {/* Body */}
            <main className="mx-auto max-w-6xl px-5 pb-32 pt-8 sm:px-8 sm:pt-12">
                <div className={`grid gap-8 ${side ? 'lg:grid-cols-[1.1fr_1fr] lg:gap-14' : ''}`}>
                    <div>
                        {title && (
                            <h1 className="font-display text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-[40px]">
                                {title}
                            </h1>
                        )}
                        {subtitle && (
                            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                                {subtitle}
                            </p>
                        )}
                        <div className="mt-8">{children}</div>
                    </div>
                    {side && <aside className="hidden lg:block">{side}</aside>}
                </div>
            </main>

            {/* Footer actions */}
            {!hideFooter && (
                <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-background/95 backdrop-blur">
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
                        <button
                            type="button"
                            onClick={onBack}
                            disabled={!onBack}
                            className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/5 disabled:opacity-40"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Back
                        </button>
                        {formId ? (
                            <button
                                type="submit"
                                form={formId}
                                disabled={continueDisabled}
                                className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                style={{ backgroundImage: 'var(--gradient-primary)' }}
                            >
                                {continueLabel}
                                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onContinue}
                                disabled={continueDisabled}
                                className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                style={{ backgroundImage: 'var(--gradient-primary)' }}
                            >
                                {continueLabel}
                                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}