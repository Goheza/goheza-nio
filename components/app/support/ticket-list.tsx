'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, LifeBuoy, Loader2, Plus } from 'lucide-react'
import { DashCard, PageHeader, StatusPill } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { listMyTickets } from '@/lib/api/support'
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_UI } from '@/types/support'
import type { SupportRole, TicketListItem, TicketUiStatus } from '@/types/support'
import NewTicketDialog from '@/components/app/support/new-ticket-dialog'

const FILTERS: ('All' | TicketUiStatus)[] = ['All', 'Open', 'In Progress', 'Awaiting You', 'Resolved', 'Closed']

const COPY: Record<SupportRole, { subtitle: string; empty: string }> = {
    brand: {
        subtitle: 'Get help with campaigns, creators, billing or your account. Replies show up here.',
        empty: 'Open a ticket when something is wrong with a campaign, a payment or your account.',
    },
    creator: {
        subtitle: 'Get help with campaigns, submissions, payouts or your account. Replies show up here.',
        empty: 'Open a ticket when something is wrong with a submission, a payout or your account.',
    },
}

export default function TicketList({ role }: { role: SupportRole }) {
    const [tickets, setTickets] = useState<TicketListItem[]>([])
    const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const { data: userData } = await supabase.auth.getUser()
                if (!userData?.user) throw new Error('Not signed in.')
                const list = await listMyTickets(userData.user.id)
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

    const list = useMemo(
        () => tickets.filter((t) => filter === 'All' || TICKET_STATUS_UI[t.status] === filter),
        [filter, tickets]
    )
    const awaitingYou = tickets.filter((t) => t.status === 'awaiting_user').length

    return (
        <div className="space-y-6">
            <PageHeader
                title="Support"
                subtitle={COPY[role].subtitle}
                action={
                    <button
                        onClick={() => setDialogOpen(true)}
                        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.02]"
                        style={{ backgroundImage: 'var(--gradient-primary)' }}
                    >
                        <Plus className="h-4 w-4" /> New ticket
                    </button>
                }
            />

            {awaitingYou > 0 && (
                <DashCard className="!border-[oklch(0.85_0.08_55)] !bg-[oklch(0.97_0.03_70)] !py-4 text-sm text-ink">
                    {awaitingYou === 1
                        ? 'One ticket is waiting for your reply.'
                        : `${awaitingYou} tickets are waiting for your reply.`}
                </DashCard>
            )}

            <DashCard>
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                filter === f
                                    ? 'text-primary-foreground shadow-sm'
                                    : 'border border-hairline bg-background text-ink hover:bg-ink/5'
                            }`}
                            style={filter === f ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
                        >
                            {f}
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
                                    href={`/app/${role}/support/${t.id}`}
                                    className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-ink/[0.02] sm:px-6"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-ink">{t.subject}</p>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                            #{t.ticket_number} · {TICKET_CATEGORY_LABEL[t.category]}
                                            {t.campaignName ? ` · ${t.campaignName}` : ''} · Updated{' '}
                                            {new Date(t.updated_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <StatusPill status={TICKET_STATUS_UI[t.status]} />
                                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </DashCard>
            )}

            {!loading && !error && list.length === 0 && (
                <DashCard className="flex flex-col items-center gap-3 py-10 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[oklch(0.93_0.04_268)] text-[oklch(0.45_0.12_268)]">
                        <LifeBuoy className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-semibold text-ink">
                        {tickets.length === 0 ? 'No tickets yet' : 'No tickets match this filter'}
                    </p>
                    <p className="max-w-sm text-xs text-muted-foreground">
                        {tickets.length === 0 ? COPY[role].empty : 'Try another status.'}
                    </p>
                    {tickets.length === 0 && (
                        <button
                            onClick={() => setDialogOpen(true)}
                            className="mt-1 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/85"
                        >
                            New ticket
                        </button>
                    )}
                </DashCard>
            )}

            <NewTicketDialog role={role} open={dialogOpen} onClose={() => setDialogOpen(false)} />
        </div>
    )
}