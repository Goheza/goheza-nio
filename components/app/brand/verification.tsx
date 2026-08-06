'use client'

import { ShieldAlert, Clock, Mail, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'

export default function VerificationPending() {
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleCheckStatus = () => {
        setIsRefreshing(true)

        setTimeout(() => {
            setIsRefreshing(false)
        }, 1000)
    }

    return (
        <div className="space-y-5  h-screen sm:space-y-6 flex items-center flex-col justify-center">
           

            <div className="mx-auto w-full max-w-2xl px-2 sm:px-0">
                <DashCard className="flex flex-col items-center text-center p-5 sm:p-8 lg:p-12">
                    {/* Icon */}
                    <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[oklch(0.96_0.04_55)] text-[oklch(0.5_0.18_45)]">
                        <Clock className="h-7 w-7 sm:h-8 sm:w-8 animate-pulse" />
                    </div>

                    {/* Heading */}
                    <h2 className="font-display mt-5 sm:mt-6 text-lg sm:text-xl lg:text-2xl font-semibold leading-tight text-ink">
                        Awaiting Brand Verification
                    </h2>

                    {/* Description */}
                    <p className="mt-3 max-w-md text-xs sm:text-sm leading-relaxed text-ink-soft">
                        To maintain network integrity and security, all brand
                        compliance profiles are manually vetted. This deployment
                        cycle usually processes within <strong>24–48 hours</strong>.
                    </p>

                    {/* Restricted */}
                    <div className="mt-6 sm:mt-8 w-full border-t border-hairline pt-5 sm:pt-6">
                        <div className="flex gap-3 rounded-2xl border border-hairline bg-background p-3 sm:p-4">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink-soft">
                                <ShieldAlert className="h-4 w-4" />
                            </span>

                            <div className="min-w-0 text-left">
                                <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
                                    Restricted Operations
                                </p>

                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                    Campaign creation, creator contracts, and
                                    wallet funding modules remain disabled until
                                    compliance approval.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 sm:mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
                        <button
                            onClick={handleCheckStatus}
                            disabled={isRefreshing}
                            className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-50"
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${
                                    isRefreshing ? 'animate-spin' : ''
                                }`}
                            />

                            {isRefreshing
                                ? 'Checking state...'
                                : 'Refresh Status'}
                        </button>

                        <a
                            href="mailto:info@goheza.com?subject=Brand%20Verification%20Inquiry"
                            className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-hairline bg-background px-6 text-sm font-semibold text-ink transition hover:bg-ink/5"
                        >
                            <Mail className="h-4 w-4" />
                            Contact Compliance
                        </a>
                    </div>
                </DashCard>
            </div>
        </div>
    )
}