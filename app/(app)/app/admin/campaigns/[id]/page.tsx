'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Eye,
    FileText,
    Loader2,
    Lock,
    RefreshCw,
    Search,
} from 'lucide-react'
import { getCampaignPeople, type CampaignPeople, type CampaignPerson } from '@/lib/api/admin-payouts'
import { CampaignPayoutsSection } from '@/components/app/admin/campaigns/campaign-payouts'
import { ErrorText, formatWhen } from '@/components/app/admin/payouts/shared'

const shell = 'rounded-2xl border border-hairline bg-surface-elevated'
const thead =
    'border-b border-hairline bg-[oklch(0.97_0.012_78)] text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground'

const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft',
    inreview: 'In review',
    submission_review: 'Open for submissions',
    live: 'Live',
    paused: 'Paused',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
}

type Stage = 'not_opened' | 'no_video' | 'in_review' | 'needs_work' | 'short' | 'met' | 'not_accepted'

const STAGES: Record<Stage, { label: string; tone: string }> = {
    not_accepted: { label: 'Application not accepted', tone: 'bg-ink/5 text-ink-soft' },
    not_opened: { label: "Hasn't opened the invite", tone: 'bg-[oklch(0.94_0.05_25)] text-[oklch(0.5_0.18_25)]' },
    no_video: { label: 'No video yet', tone: 'bg-[oklch(0.94_0.07_55)] text-[oklch(0.5_0.18_45)]' },
    in_review: { label: 'Video in review', tone: 'bg-[oklch(0.94_0.05_75)] text-[oklch(0.45_0.12_70)]' },
    needs_work: { label: 'Video sent back', tone: 'bg-[oklch(0.94_0.07_55)] text-[oklch(0.5_0.18_45)]' },
    short: { label: 'Approved, short of target', tone: 'bg-[oklch(0.93_0.04_268)] text-[oklch(0.4_0.14_268)]' },
    met: { label: 'Target met', tone: 'bg-[oklch(0.93_0.08_152)] text-[oklch(0.4_0.14_152)]' },
}

// Where a creator is, so admins can see who to chase.
function stageOf(p: CampaignPerson): Stage {
    // no_application: videos here without an application row (older data).
  if (p.status !== 'approved' && p.status !== 'no_application') return 'not_accepted'
    if (p.approved_videos > 0) return p.target_met ? 'met' : 'short'
    if (p.videos > 0) {
        const pending = (p.submissions ?? []).some((s) => s.status === 'pending' || s.status === 'screening')
        return pending ? 'in_review' : 'needs_work'
    }
    return p.invited && p.invite_seen === false ? 'not_opened' : 'no_video'
}

export default function AdminCampaignFullPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [data, setData] = useState<CampaignPeople | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const [stage, setStage] = useState<Stage | 'all'>('all')
    const [search, setSearch] = useState('')
    const [open, setOpen] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        getCampaignPeople(id)
            .then((d) => {
                if (cancelled) return
                setData(d)
                setError(null)
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load the campaign.')
            })
            .finally(() => {
                if (!cancelled) setRefreshing(false)
            })
        return () => {
            cancelled = true
        }
    }, [id, reloadKey])

    const people = useMemo(() => (data?.creators ?? []).map((p) => ({ ...p, stage: stageOf(p) })), [data])
    const counts = useMemo(() => {
        const m = new Map<Stage, number>()
        for (const p of people) m.set(p.stage, (m.get(p.stage) ?? 0) + 1)
        return m
    }, [people])
    const visible = people.filter(
        (p) =>
            (stage === 'all' || p.stage === stage) &&
            (!search.trim() ||
                [p.name, p.email, p.tiktok].some((v) => v?.toLowerCase().includes(search.trim().toLowerCase()))),
    )

    if (!data) {
        return error ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{error}</p>
        ) : (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    const c = data.campaign
    const people_ = (label: string, value: string | null) => (
        <div className="rounded-xl border border-hairline bg-background p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold text-ink">{value ?? '—'}</p>
        </div>
    )

    return (
        <div className="space-y-6">
            <Link
                href="/app/admin/campaigns?filter=all"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
            >
                <ArrowLeft className="h-4 w-4" /> Campaigns
            </Link>

            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{c.name}</h1>
                        <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                            {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                        {c.views_only && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                                <Eye className="h-3 w-3" /> Follow-up · views only
                            </span>
                        )}
                        {c.is_private && !c.views_only && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                                <Lock className="h-3 w-3" /> Private
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {c.brand ?? 'Unknown brand'} · {c.payout ?? '—'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href={`/app/admin/campaigns?filter=all&open=${c.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5"
                    >
                        <FileText className="h-3.5 w-3.5" /> Brief &amp; actions
                    </Link>
                    <button
                        onClick={() => {
                            setRefreshing(true)
                            setReloadKey((k) => k + 1)
                        }}
                        aria-label="Refresh"
                        className="grid h-8 w-8 place-items-center rounded-full border border-hairline bg-background hover:bg-ink/5"
                    >
                        {refreshing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
            </header>
            <ErrorText error={error} />

            <section className="space-y-2">
                <h2 className="font-display text-lg font-semibold text-ink">Who&apos;s running it</h2>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    {people_('Created by', c.created_by_admin ? `${c.created_by_admin} (Goheza)` : c.brand)}
                    {people_('Approved by', c.approved_by ?? c.reviewed_by)}
                    {people_(
                        'Payouts released',
                        c.payouts_released_at
                            ? `${formatWhen(c.payouts_released_at)}${c.payouts_released_by ? ` · ${c.payouts_released_by}` : ''}`
                            : 'Held',
                    )}
                    {people_('Created', formatWhen(c.created_at))}
                    {people_('Deadline', c.submission_deadline ? formatWhen(c.submission_deadline) : 'None')}
                </div>
            </section>

            <section className={`${shell} p-5`}>
                <CampaignPayoutsSection
                    key={reloadKey}
                    campaignId={c.id}
                    brandName={c.brand}
                    onOpenCampaign={(other) => router.push(`/app/admin/campaigns/${other}`)}
                />
            </section>

            <section className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="font-display text-lg font-semibold text-ink">
                            {c.is_private ? 'Invited creators' : 'Creators'} ({people.length})
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {c.views_only
                                ? "Views here count toward each creator's original campaign; progress is against that campaign's target."
                                : 'Progress counts views from follow-ups too.'}
                        </p>
                    </div>
                    <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Find a creator"
                            className="w-full rounded-full border border-hairline bg-background py-2 pl-9 pr-4 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => setStage('all')}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${stage === 'all' ? 'bg-ink text-white' : 'border border-hairline bg-background text-ink-soft hover:bg-ink/5'}`}
                    >
                        All {people.length}
                    </button>
                    {(Object.keys(STAGES) as Stage[])
                        .filter((s) => counts.get(s))
                        .map((s) => (
                            <button
                                key={s}
                                onClick={() => setStage(s)}
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${stage === s ? 'bg-ink text-white' : 'border border-hairline bg-background text-ink-soft hover:bg-ink/5'}`}
                            >
                                {STAGES[s].label} {counts.get(s)}
                            </button>
                        ))}
                </div>

                <div className={`${shell} overflow-x-auto`}>
                    <table className="w-full min-w-[960px] text-sm">
                        <thead className={thead}>
                            <tr>
                                <th className="px-5 py-3">Creator</th>
                                {c.views_only ? (
                                    <th className="px-3 py-3">Counts toward</th>
                                ) : (
                                    <th className="px-3 py-3">In follow-up</th>
                                )}
                                <th className="px-3 py-3">Where they are</th>
                                <th className="px-3 py-3 text-right">Videos</th>
                                <th className="px-3 py-3 text-right">Views here</th>
                                <th className="px-3 py-3 text-right">Progress</th>
                                <th className="px-3 py-3">{c.is_private ? 'Added' : 'Applied'}</th>
                                <th className="px-5 py-3">Last video</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {visible.map((p) => {
                                const expanded = open === p.creator_id
                                const s = STAGES[p.stage]
                                return (
                                    <Fragment key={p.creator_id}>
                                        <tr
                                            className="cursor-pointer hover:bg-ink/[0.02]"
                                            onClick={() => setOpen(expanded ? null : p.creator_id)}
                                        >
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    {expanded ? (
                                                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold text-ink">
                                                            {p.name ?? 'Creator'}
                                                        </p>
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {p.email ?? '—'}
                                                            {p.tiktok ? ` · @${p.tiktok}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            {!c.views_only && (
                                                <td className="px-3 py-3 text-xs">
                                                    {p.in_follow_ups?.length ? (
                                                        p.in_follow_ups.map((f) => (
                                                            <Link
                                                                key={f.id}
                                                                href={`/app/admin/campaigns/${f.id}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="block font-semibold text-ink hover:text-primary"
                                                            >
                                                                {f.name}
                                                            </Link>
                                                        ))
                                                    ) : p.target_met === false && p.approved_videos > 0 ? (
                                                        <span className="text-[oklch(0.45_0.12_70)]">
                                                            Short, not invited
                                                        </span>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                            )}
                                            {c.views_only && (
                                                <td className="px-3 py-3 text-xs">
                                                    {p.counts_toward ? (
                                                        <Link
                                                            href={`/app/admin/campaigns/${p.counts_toward.id}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="font-semibold text-ink hover:text-primary"
                                                        >
                                                            {p.counts_toward.name}
                                                        </Link>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-3 py-3">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.tone}`}
                                                >
                                                    {s.label}
                                                </span>
                                                {p.invited && p.invite_seen === true && p.stage === 'no_video' && (
                                                    <span className="mt-1 block text-[11px] text-muted-foreground">
                                                        Seen the invite
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right text-ink-soft">
                                                {p.approved_videos}/{p.videos}
                                                <span className="block text-[11px] text-muted-foreground">
                                                    approved
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-right text-ink-soft">
                                                {p.views_here.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <span
                                                    className={
                                                        p.target_met
                                                            ? 'font-semibold text-[oklch(0.45_0.12_150)]'
                                                            : 'text-ink'
                                                    }
                                                >
                                                    {(p.total_views ?? 0).toLocaleString()}
                                                    {p.target ? ` / ${p.target.toLocaleString()}` : ''}
                                                </span>
                                                <span className="block text-[11px] text-muted-foreground">
                                                    {p.target_met
                                                        ? 'target met'
                                                        : p.target
                                                          ? `${(p.target - (p.total_views ?? 0)).toLocaleString()} short`
                                                          : 'no target'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-muted-foreground">
                                                {formatWhen(p.applied_at)}
                                                {p.added_by ? <span className="block">by {p.added_by}</span> : null}
                                            </td>
                                            <td className="px-5 py-3 text-xs text-muted-foreground">
                                                {formatWhen(p.last_submitted_at)}
                                            </td>
                                        </tr>
                                        {expanded && (
                                            <tr className="bg-ink/[0.02]">
                                                <td colSpan={8} className="px-5 py-3">
                                                    {(p.submissions ?? []).length === 0 ? (
                                                        <p className="text-xs text-muted-foreground">
                                                            No videos submitted yet.
                                                        </p>
                                                    ) : (
                                                        <ul className="space-y-1.5">
                                                            {(p.submissions ?? []).map((v) => (
                                                                <li
                                                                    key={v.id}
                                                                    className="flex flex-wrap items-center gap-3 text-xs"
                                                                >
                                                                    <span className="w-36 text-muted-foreground">
                                                                        {formatWhen(v.submitted_at)}
                                                                    </span>
                                                                    <span className="w-28 font-semibold capitalize text-ink">
                                                                        {v.status.replace(/_/g, ' ')}
                                                                    </span>
                                                                    <span className="w-28 text-ink-soft">
                                                                        {(v.views ?? 0).toLocaleString()} views
                                                                    </span>
                                                                    {v.url ? (
                                                                        <a
                                                                            href={v.url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                                                                        >
                                                                            Open video{' '}
                                                                            <ExternalLink className="h-3 w-3" />
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">
                                                                            Not posted yet
                                                                        </span>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                )
                            })}
                            {visible.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                                        {people.length ? 'Nobody matches.' : 'No creators on this campaign yet.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}
