'use client'

import { ShieldAlert, Clock, Mail, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'

export default function VerificationPending() {
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleCheckStatus = () => {
        setIsRefreshing(true)
        // Simulate checking verification webhook/database status
        setTimeout(() => {
            setIsRefreshing(false)
        }, 1000)
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Account Verification"
                subtitle="Your corporate profile is currently under review."
            />

            <div className="mx-auto max-w-2xl">
                <DashCard className="flex flex-col items-center text-center p-8 sm:p-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[oklch(0.96_0.04_55)] text-[oklch(0.5_0.18_45)]">
                        <Clock className="h-8 w-8 animate-pulse" />
                    </div>

                    <h2 className="font-display mt-6 text-xl font-semibold text-ink sm:text-2xl">
                        Awaiting Brand Verification
                    </h2>
                    
                    <p className="mt-3 text-sm text-ink-soft max-w-md leading-relaxed">
                        To maintain network integrity and security, all brand compliance profiles are manually vetted. This deployment cycle usually processes within **24–48 hours**.
                    </p>

                    <div className="mt-8 w-full border-t border-hairline pt-6 text-left">
                        <div className="flex items-start gap-3 rounded-2xl border border-hairline bg-background p-4">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink-soft">
                                <ShieldAlert className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">Restricted Operations</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Campaign creation, creator contract deployments, and live wallet funding modules are disabled until approval is signed off by compliance.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row w-full items-center justify-center gap-3">
                        <button 
                            onClick={handleCheckStatus}
                            disabled={isRefreshing}
                            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Checking state...' : 'Refresh Status'}
                        </button>
                        
                        <a 
                            href="mailto:info@goheza.com?subject=Brand%20Verification%20Inquiry"
                            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-hairline bg-background px-6 py-2.5 text-sm font-semibold text-ink hover:bg-ink/5"
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