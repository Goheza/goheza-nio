'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    ExternalLink,
    Loader2,
    Lock,
    ShieldAlert,
    UserPlus,
} from 'lucide-react'
import { AddCreatorsModal } from '@/components/app/admin/add-creators-modal'
import { DashCard } from '@/components/app/creator/dash-ui'
import { formatMoney } from '@/components/app/brand/brand-constants'
import { getBrandDetailForAdmin, type AdminBrandDetail } from '@/lib/admin-brand'
import {
    getPrivateCampaignDetail,
    listPrivateCampaignInvitees,
    type PrivateCampaignDetail,
    type PrivateCampaignInvitee,
} from '@/lib/api/admin-private-campaigns'
import { isTopupCampaign , TopupBadge } from '@/components/app/admin/topup-flag'


const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft',
    inreview: 'In review',
    submission_review: 'Submission review',
    live: 'Live',
    paused: 'Paused',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
}

const TYPE_LABEL: Record<string, string> = {
    creator: 'Creator Campaign',
    referral: 'Referral Campaign',
    logo: 'Logo / Flyer Placement',
    clipping: 'Clipping Campaign',
    ambassador: 'Ambassador Campaign',
    event: 'Event Activation',
}

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—')

export default function AdminPrivateCampaignDetailPage() {
    const params = useParams()
    const brandId = params?.brandId as string
    const campaignId = params?.campaignId as string

    const [detail, setDetail] = useState<PrivateCampaignDetail | null>(null)
    const [brand, setBrand] = useState<AdminBrandDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [addOpen, setAddOpen] = useState(false)
    const [invitees, setInvitees] = useState<PrivateCampaignInvitee[]>([])
    const [inviteesError, setInviteesError] = useState<string | null>(null)


    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const [d, b] = await Promise.all([
                    getPrivateCampaignDetail(campaignId),
                    getBrandDetailForAdmin(brandId),
                ])
                if (cancelled) return
                setDetail(d)
                setBrand(b)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load campaign.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [campaignId, brandId])

    async function loadInvitees() {
        try {
            setInvitees(await listPrivateCampaignInvitees(campaignId))
            setInviteesError(null)
        } catch (err) {
            setInviteesError(err instanceof Error ? err.message : 'Failed to load invited creators.')
        }
    }

    // Refresh after creators are added (campaign counts and the invited list).
    async function reloadAfterAdd() {
        setDetail(await getPrivateCampaignDetail(campaignId))
        await loadInvitees()
    }

    useEffect(() => {
        loadInvitees()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campaignId])

    const backHref = `/app/admin/private-campaigns/${brandId}`

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    if (error || !detail) {
        return (
            <div className="space-y-4">
                <BackLink href={backHref} label="Back to brand" />
                <DashCard className="text-center">
                    <p className="text-sm font-semibold text-ink">{error ?? 'Campaign not found.'}</p>
                </DashCard>
            </div>
        )
    }

    const { campaign: c, stats } = detail
    const row = c as unknown as Record<string, any>
    const ownerMismatch = c.created_by !== brandId
    const cover: string | null = row.cover_image_url ?? row.image_url ?? null
    const total: number = row.total_budget_pool ?? 0
    const remaining: number = row.remaining_budget_pool ?? total
    const spent = total - remaining
    const dos: string[] = row.dos ?? []
    const donts: string[] = row.donts ?? []
    const countries: string[] = row.target_countries ?? []
    const assets: { url: string; name: string; category: string }[] = row.brief_assets ?? []
    const typeDetails: Record<string, unknown> = row.type_specific_details ?? {}
    const typeEntries = Object.entries(typeDetails).filter(
        ([k, v]) => k !== 'type' && k!== 'topup' && v !== '' && v != null && !(Array.isArray(v) && v.length === 0)
    )
    const canAddCreators = !['completed', 'cancelled', 'expired'].includes(c.status)

    return (
        <div className="space-y-6">
            <BackLink href={backHref} label={`${brand?.brand_name ?? 'Brand'} · private campaigns`} />

            {ownerMismatch && (
                <div className="flex items-start gap-2 rounded-xl border border-[oklch(0.8_0.12_75)] bg-[oklch(0.97_0.04_75)] px-4 py-3 text-sm text-[oklch(0.4_0.12_75)]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        This campaign is not owned by {brand?.brand_name ?? 'this brand'} - its owner is a different
                        account, so the brand won't see it. Run the owner fix (see the SQL notes) to assign it.
                    </span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                    <span className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-ink/5 ring-1 ring-hairline">
                        {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink">
                                {c.name}
                            </h1>
                            
                            <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-ink">
                                {STATUS_LABEL[c.status] ?? c.status}
                            </span>
                            {isTopupCampaign(c) && <TopupBadge />}
                            <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.95_0.05_152)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.4_0.12_152)]">
                                <Lock className="h-3 w-3" /> Private
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {TYPE_LABEL[row.campaign_type] ?? row.campaign_type} · Created {fmtDate(row.created_at)}
                            {row.admin_created_by ? ' · Created by Goheza team' : ''}
                        </p>
                        {brand && (
                            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                                <Building2 className="h-3.5 w-3.5" /> {brand.brand_name || 'Unnamed brand'}
                                {brand.account_status === 'suspended' && (
                                    <span className="inline-flex items-center gap-1 text-[oklch(0.45_0.16_25)]">
                                        <ShieldAlert className="h-3 w-3" /> Suspended
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {row.rejection_reason && (
                <div className="rounded-xl border border-[oklch(0.7_0.15_25)] bg-[oklch(0.97_0.03_25)] px-4 py-3 text-sm text-[oklch(0.4_0.15_25)]">
                    <span className="font-semibold">Rejection reason:</span> {row.rejection_reason}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Creators requested" value={String(row.num_creators ?? 0)} />
                <Stat label="Submissions received" value={String(stats.received)} />
                <Stat label="Approved videos" value={String(stats.approved)} />
                <Stat label="Approved views" value={stats.views.toLocaleString('en-US')} />
            </div>

            {/* Invited creators */}
            <DashCard>
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">
                        Invited creators{' '}
                        {!inviteesError && (
                            <span className="font-normal text-muted-foreground">({invitees.length})</span>
                        )}
                    </p>
                    {canAddCreators && (
                        <button
                            onClick={() => setAddOpen(true)}
                            disabled={!!inviteesError}
                            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            <UserPlus className="h-3.5 w-3.5" /> Add creators
                        </button>
                    )}
                </div>
                {inviteesError ? (
                    <p className="mt-3 text-sm text-[oklch(0.5_0.18_25)]">{inviteesError}</p>
                ) : invitees.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">No creators invited yet.</p>
                ) : (
                    <ul className="mt-3 divide-y divide-hairline">
                        {invitees.map((i) => (
                            <li key={i.user_id} className="flex items-center gap-3 py-2.5 text-sm">
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-semibold text-ink">
                                        {i.full_name || 'Unnamed creator'}
                                    </span>
                                    {i.email && (
                                        <span className="block truncate text-xs text-muted-foreground">{i.email}</span>
                                    )}
                                </span>
                                {i.username && <span className="text-xs text-muted-foreground">@{i.username}</span>}
                            </li>
                        ))}
                    </ul>
                )}
            </DashCard>

            <div className="grid gap-5 lg:grid-cols-2">
                <DashCard>
                    <p className="text-sm font-semibold text-ink">Brief</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-ink-soft">
                        {row.description || 'No brief provided.'}
                    </p>
                    {countries.length > 0 && (
                        <p className="mt-3 text-xs text-muted-foreground">Countries: {countries.join(', ')}</p>
                    )}
                </DashCard>

                <DashCard>
                    <p className="text-sm font-semibold text-ink">Budget & payout</p>
                    <dl className="mt-3 space-y-2 text-sm">
                        <Row label="Total budget" value={formatMoney(total)} />
                        <Row label="Spent" value={formatMoney(spent)} />
                        <Row label="Remaining" value={formatMoney(remaining)} />
                        {row.campaign_type !== 'referral' && (
                            <Row label="Max pay / creator" value={formatMoney(Number(row.max_pay ?? 0))} />
                        )}
                        <Row label="Reward / 1,000 views" value={formatMoney(row.cost_per_1k_views ?? 0)} />
                        {row.flat_fee && <Row label="Flat fee" value={formatMoney(Number(row.flat_fee))} />}
                    </dl>
                </DashCard>

                <DashCard>
                    <p className="text-sm font-semibold text-ink">Schedule</p>
                    <dl className="mt-3 space-y-2 text-sm">
                        <Row
                            label="Live duration"
                            value={row.live_duration_days ? `${row.live_duration_days} days` : '—'}
                        />
                        <Row label="Submission deadline" value={fmtDate(row.submission_deadline)} />
                        <Row label="Live starts" value={fmtDate(row.live_starts_at)} />
                        <Row label="Live ends" value={fmtDate(row.live_ends_at)} />
                        <Row label="Reviewed" value={fmtDate(row.reviewed_at)} />
                    </dl>
                </DashCard>

                {typeEntries.length > 0 && (
                    <DashCard>
                        <p className="text-sm font-semibold text-ink">
                            {TYPE_LABEL[row.campaign_type] ?? 'Campaign'} details
                        </p>
                        <dl className="mt-3 space-y-3 text-sm">
                            {typeEntries.map(([k, v]) => (
                                <div key={k}>
                                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {k.replace(/([A-Z])/g, ' $1')}
                                    </dt>
                                    <dd className="mt-0.5 whitespace-pre-wrap break-words text-ink-soft">
                                        {Array.isArray(v) ? v.join('\n') : String(v)}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </DashCard>
                )}
            </div>

            {(dos.length > 0 || donts.length > 0) && (
                <DashCard>
                    <p className="text-sm font-semibold text-ink">Content policy</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <PolicyBlock title="Do's" items={dos} tone="do" />
                        <PolicyBlock title="Don'ts" items={donts} tone="dont" />
                    </div>
                </DashCard>
            )}

            {assets.length > 0 && (
                <DashCard>
                    <p className="text-sm font-semibold text-ink">Brief assets</p>
                    <ul className="mt-3 divide-y divide-hairline">
                        {assets.map((a, i) => (
                            <li key={i} className="flex items-center gap-3 py-2 text-sm">
                                <span className="flex-1 truncate text-ink">{a.name}</span>
                                <span className="text-[11px] uppercase text-muted-foreground">{a.category}</span>
                                <a
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                >
                                    Open <ExternalLink className="h-3 w-3" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </DashCard>
            )}

            {addOpen && (
                <AddCreatorsModal
                    campaign={c}
                    invitedIds={invitees.map((i) => i.user_id)}
                    onClose={() => setAddOpen(false)}
                    onAdded={reloadAfterAdd}
                />
            )}
        </div>
    )
}

function BackLink({ href, label }: { href: string; label: string }) {
    return (
        <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
        >
            <ArrowLeft className="h-3.5 w-3.5" /> {label}
        </Link>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-hairline bg-background p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="font-display mt-1 text-xl font-semibold text-ink">{value}</p>
        </div>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold text-ink">{value}</dd>
        </div>
    )
}

function PolicyBlock({ title, items, tone }: { title: string; items: string[]; tone: 'do' | 'dont' }) {
    const cls =
        tone === 'do'
            ? 'border-[oklch(0.85_0.10_152)] bg-[oklch(0.97_0.04_152)] text-[oklch(0.36_0.12_152)]'
            : 'border-[oklch(0.85_0.04_25)] bg-[oklch(0.97_0.03_25)] text-[oklch(0.45_0.16_25)]'
    return (
        <div className={`rounded-2xl border p-4 ${cls}`}>
            <p className="text-xs font-bold uppercase tracking-[0.14em]">{title}</p>
            {items.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">None set.</p>
            ) : (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink">
                    {items.map((it, i) => (
                        <li key={i}>{it}</li>
                    ))}
                </ul>
            )}
        </div>
    )
}