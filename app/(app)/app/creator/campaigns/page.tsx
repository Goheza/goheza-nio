'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { DollarSign, Users, Globe2, Clock, Loader2, ArrowRight, ImageOff } from 'lucide-react'
import { DashCard, StatusPill, BrandAvatar, PageHeader } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { browseCampaigns } from '@/lib/api/creator-campaigns'
import { listApplicationsForCreator } from '@/lib/api/campaign-applications'
import type { CreatorCampaignSummary } from '@/types/campaign'
import type { CampaignApplication, CampaignApplicationStatus } from '@/types/application'

type ApplicationUiStatus = 'none' | 'pending' | 'approved' | 'rejected'

type BrowseCampaign = {
    campaign: CreatorCampaignSummary
    application: CampaignApplication | null
    applicationStatus: ApplicationUiStatus
}

// revision_requested folds into "pending" here — from the creator's view on
// the browse grid there's nothing actionable to distinguish it from "under
// review" until they open the campaign workspace on the details page.
function toApplicationStatus(status?: CampaignApplicationStatus): ApplicationUiStatus {
    if (!status) return 'none'
    if (status === 'revision_requested') return 'pending'
    return status
}

const ACTION_LABEL: Record<ApplicationUiStatus, string> = {
    none: 'Apply Now',
    pending: 'Under Review',
    approved: 'Accepted',
    rejected: 'Rejected',
}

function formatMoney(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

function daysUntil(dateStr: string | null) {
    if (!dateStr) return null
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function BrowseCampaignsPage() {
    const [rows, setRows] = useState<BrowseCampaign[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const { data: userData } = await supabase.auth.getUser()
                if (!userData?.user) {
                    if (!cancelled) setRows([])
                    return
                }
                const creatorId = userData.user.id

                const { data: profile } = await supabase
                    .from('creator_profiles')
                    .select('country')
                    .eq('user_id', creatorId)
                    .maybeSingle()

                const [campaigns, applications] = await Promise.all([
                    browseCampaigns(profile?.country ?? null),
                    listApplicationsForCreator(creatorId),
                ])

                const appByCampaign = new Map(applications.map((a) => [a.campaign_id, a]))

                const combined: BrowseCampaign[] = campaigns.map((campaign) => {
                    const application = appByCampaign.get(campaign.id) ?? null
                    return {
                        campaign,
                        application,
                        applicationStatus: toApplicationStatus(application?.status),
                    }
                })

                if (!cancelled) setRows(combined)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load campaigns.')
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    return (
        <div className="space-y-6">
            <PageHeader title="Browse Campaigns" subtitle="Discover brand opportunities and apply to start earning." />

            {error && (
                <div className="rounded-2xl border border-[oklch(0.85_0.1_25)] bg-[oklch(0.97_0.04_25)] p-4 text-sm text-ink">
                    {error}
                </div>
            )}

            {!rows && !error && (
                <div className="flex min-h-[40vh] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                </div>
            )}

            {rows && rows.length === 0 && !error && (
                <DashCard>
                    <p className="text-sm text-ink-soft">No campaigns are open right now. Check back soon.</p>
                </DashCard>
            )}

            {rows && rows.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {rows.map((row) => (
                        <CampaignCard key={row.campaign.id} row={row} />
                    ))}
                </div>
            )}
        </div>
    )
}

function CampaignCard({ row }: { row: BrowseCampaign }) {
    const { campaign: c, applicationStatus } = row
    const days = daysUntil(c.submissionDeadline)

    return (
        <Link href={`/app/creator/campaigns/${c.id}`} className="group block">
            <DashCard className="flex h-full flex-col overflow-hidden !p-0 transition group-hover:border-primary/40">
                <div className="relative aspect-[16/9] overflow-hidden bg-ink">
                    {c.cover ? (
                        <img src={c.cover} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <ImageOff className="h-6 w-6 text-white/30" />
                        </div>
                    )}
                    {c.type && (
                        <span className="absolute left-3 top-3 rounded-full bg-ink/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
                            {c.type}
                        </span>
                    )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {c.brandName ?? 'Brand'}
                        </p>
                        <StatusPill status={applicationStatus} />
                    </div>

                    <h3 className="font-display line-clamp-2 text-lg font-semibold tracking-[-0.01em] text-ink">
                        {c.name}
                    </h3>

                    {c.brief && <p className="line-clamp-2 text-sm text-ink-soft">{c.brief}</p>}

                    <div className="mt-auto grid grid-cols-2 gap-2 border-t border-hairline pt-4 text-xs text-ink-soft">
                        <span className="inline-flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5" /> {formatMoney(c.rewardPerK)} / 1K
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" /> {c.creatorsNeeded} needed
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Globe2 className="h-3.5 w-3.5" />
                            {c.countries === 'global' ? 'Global' : c.countries.join(', ')}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /> {days !== null ? `${days}d left` : 'No deadline'}
                        </span>
                    </div>

                    <div
                        className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition group-hover:scale-[1.02]"
                        style={{ backgroundImage: 'var(--gradient-primary)' }}
                    >
                        {ACTION_LABEL[applicationStatus]}
                        {applicationStatus === 'none' && <ArrowRight className="h-3.5 w-3.5" />}
                    </div>
                </div>
            </DashCard>
        </Link>
    )
}
