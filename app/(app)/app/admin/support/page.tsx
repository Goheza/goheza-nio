'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronRight, Hourglass, Inbox, Loader2, MessageCircle, Search } from 'lucide-react'
import { DashCard, PageHeader, StatCard, StatusPill } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { listAdminTickets } from '@/lib/api/admin-support'
import type { AdminTicketRow } from '@/lib/api/admin-support'
import { TICKET_CATEGORY_LABEL, TICKET_STATUSES, TICKET_STATUS_ADMIN_UI } from '@/types/support'
import type { SupportRole, TicketStatus } from '@/types/support'

type StatusFilter = 'all' | TicketStatus
type RoleFilter = 'all' | SupportRole

const isActiveStatus = (s: TicketStatus) => s !== 'resolved' && s !== 'closed'

const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? 'text-primary-foreground shadow-sm' : 'border border-hairline bg-background text-ink hover:bg-ink/5'
    }`
const chipStyle = (active: boolean) => (active ? { backgroundImage: 'var(--gradient-primary)' } : undefined)

export default function AdminSupport() {
    const [tickets, setTickets] = useState<AdminTicketRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [status, setStatus] = useState<StatusFilter>('all')
    const [role, setRole] = useState<RoleFilter>('all')
    const [query, setQuery] = useState('')

    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const { data: userData } = await supabase.auth.getUser()
                if (!userData?.user) throw new Error('Not signed in.')
                const list = await listAdminTickets()
                if (!cancelled) setTickets(list)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load tickets.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [])

    const counts = useMemo(
        () => ({
            open: tickets.filter((t) => t.status === 'open').length,
            inProgress: tickets.filter((t) => t.status === 'in_progress').length,
            awaiting: tickets.filter((t) => t.status === 'awaiting_user').length,
            highPriority: tickets.filter((t) => t.priority === 'high' && isActiveStatus(t.status)).length,
        }),
        [tickets]
    )

    const list = useMemo(() => {
        const q = query.trim().toLowerCase()
        return tickets.filter((t) => {
            if (status !== 'all' && t.status !== status) return false
            if (role !== 'all' && t.user_role !== role) return false
            if (!q) return true
            return (
                t.subject.toLowerCase().includes(q) ||
                t.requesterName.toLowerCase().includes(q) ||
                String(t.ticket_number) === q.replace('#', '') ||
                (t.campaignName ?? '').toLowerCase().includes(q)
            )
        })
    }, [tickets, status, role, query])

    return (
        <div className="space-y-6">
            <PageHeader title="Support" subtitle="Tickets from brands and creators, newest activity first." />

            <div className="flex flex-col gap-2 sm:flex-row sm:overflow-x-auto hide-scrollbar sm:pb-2">
                <div className="sm:min-w-[240px]">
                    <StatCard label="Open" value={String(counts.open)} icon={<Inbox className="h-4 w-4" />} tone="indigo" />
                </div>
                <div className="sm:min-w-[240px]">
                    <StatCard
                        label="In Progress"
                        value={String(counts.inProgress)}
                        icon={<MessageCircle className="h-4 w-4" />}
                        tone="orange"
                    />
                </div>
                <div className="sm:min-w-[240px]">
                    <StatCard
                        label="Awaiting User"
                        value={String(counts.awaiting)}
                        icon={<Hourglass className="h-4 w-4" />}
                    />
                </div>
                <div className="sm:min-w-[240px]">
                    <StatCard
                        label="High Priority"
                        value={String(counts.highPriority)}
                        icon={<AlertTriangle className="h-4 w-4" />}
                        tone="green"
                    />
                </div>
            </div>

            <DashCard className="space-y-4">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search subject, name, campaign or #number"
                        className="w-full rounded-full border border-hairline bg-background py-2 pl-9 pr-4 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setStatus('all')} className={chip(status === 'all')} style={chipStyle(status === 'all')}>
                        All
                    </button>
                    {TICKET_STATUSES.map((s) => (
                        <button key={s} onClick={() => setStatus(s)} className={chip(status === s)} style={chipStyle(status === s)}>
                            {TICKET_STATUS_ADMIN_UI[s]}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {(['all', 'brand', 'creator'] as RoleFilter[]).map((r) => (
                        <button key={r} onClick={() => setRole(r)} className={chip(role === r)} style={chipStyle(role === r)}>
                            {r === 'all' ? 'Brands & creators' : r === 'brand' ? 'Brands' : 'Creators'}
                        </button>
                    ))}
                </div>
            </DashCard>

            {loading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                </div>
            )}

            {error && <DashCard className="text-center text-sm text-muted-foreground">{error}</DashCard>}

            {!loading && !error && list.length > 0 && (
                <DashCard className="!p-0 sm:!p-0">
                    <ul className="divide-y divide-hairline">
                        {list.map((t) => (
                            <li key={t.id}>
                                <Link
                                    href={`/app/admin/support/${t.id}`}
                                    className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-ink/[0.02] sm:px-6"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-ink">{t.subject}</p>
                                            {t.priority === 'high' && (
                                                <span className="rounded-full bg-[oklch(0.94_0.05_25)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.5_0.18_25)]">
                                                    High
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                            #{t.ticket_number} · {t.requesterName} ({t.user_role === 'brand' ? 'Brand' : 'Creator'}) ·{' '}
                                            {TICKET_CATEGORY_LABEL[t.category]}
                                            {t.campaignName ? ` · ${t.campaignName}` : ''}
                                        </p>
                                    </div>
                                    <div className="hidden shrink-0 text-right text-xs text-muted-foreground md:block">
                                        <p>{new Date(t.updated_at).toLocaleDateString()}</p>
                                    </div>
                                    <StatusPill status={TICKET_STATUS_ADMIN_UI[t.status]} />
                                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </DashCard>
            )}

            {!loading && !error && list.length === 0 && (
                <DashCard className="text-center text-sm text-muted-foreground">
                    {tickets.length === 0 ? 'No tickets yet.' : 'No tickets match these filters.'}
                </DashCard>
            )}

            {!loading && !error && tickets.length >= 300 && (
                <p className="text-center text-xs text-muted-foreground">
                    Showing the 300 most recently active tickets. Use search or filters to narrow down.
                </p>
            )}
        </div>
    )
}