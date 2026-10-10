'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Loader2, Send, StickyNote } from 'lucide-react'
import { BrandAvatar, DashCard, StatusPill } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { getTicketThread, signMessages } from '@/lib/api/support'
import { adminReply, getAdminNames, getRequester, updateTicket } from '@/lib/api/admin-support'
import type { Requester } from '@/lib/api/admin-support'
import {
    TICKET_CATEGORY_LABEL,
    TICKET_PRIORITY_LABEL,
    TICKET_STATUSES,
    TICKET_STATUS_ADMIN_UI,
} from '@/types/support'
import type { SupportMessage, TicketDetail, TicketPriority, TicketStatus } from '@/types/support'
import { AttachmentGrid, AttachmentPicker, useAttachments } from '@/components/app/support/attachments'

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

const selectCls =
    'w-full rounded-xl border border-hairline bg-background px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50'

export default function AdminSupportTicket() {
    const { id } = useParams<{ id: string }>()
    const att = useAttachments()

    const [adminId, setAdminId] = useState<string | null>(null)
    const [ticket, setTicket] = useState<TicketDetail | null>(null)
    const [messages, setMessages] = useState<SupportMessage[]>([])
    const [requester, setRequester] = useState<Requester>({ name: '', email: null })
    const [adminNames, setAdminNames] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [mode, setMode] = useState<'reply' | 'note'>('reply')
    const [body, setBody] = useState('')
    const [nextStatus, setNextStatus] = useState<'' | TicketStatus>('')
    const [sending, setSending] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const endRef = useRef<HTMLDivElement>(null)
    const knownAdmins = useRef<Record<string, string>>({})
    knownAdmins.current = adminNames

    const mergeAdminNames = (more: Record<string, string>) => setAdminNames((prev) => ({ ...prev, ...more }))

    // Initial load
    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const { data: userData } = await supabase.auth.getUser()
                if (!userData?.user) throw new Error('Not signed in.')
                if (!cancelled) setAdminId(userData.user.id)

                const thread = await getTicketThread(id)
                const [who, names] = await Promise.all([
                    getRequester(thread.ticket.created_by, thread.ticket.user_role),
                    getAdminNames([
                        userData.user.id,
                        ...thread.messages.filter((m) => m.from_admin).map((m) => m.sender_id),
                    ]),
                ])

                if (!cancelled) {
                    setTicket(thread.ticket)
                    setMessages(thread.messages)
                    setRequester(who)
                    setAdminNames(names)
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load this ticket.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [id])

    // Live updates
    useEffect(() => {
        const channel = supabase
            .channel(`admin-support-ticket-${id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'support_ticket_messages', filter: `ticket_id=eq.${id}` },
                async (payload) => {
                    const row = payload.new as Omit<SupportMessage, 'attachments'> & { attachments: any[] | null }
                    const [signed] = await signMessages([row])
                    if (row.from_admin && !knownAdmins.current[row.sender_id]) {
                        getAdminNames([row.sender_id]).then(mergeAdminNames).catch(() => {})
                    }
                    setMessages((prev) => (prev.some((m) => m.id === signed.id) ? prev : [...prev, signed]))
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${id}` },
                (payload) => {
                    const next = payload.new as Partial<TicketDetail>
                    setTicket((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  status: next.status ?? prev.status,
                                  priority: next.priority ?? prev.priority,
                                  updated_at: next.updated_at ?? prev.updated_at,
                              }
                            : prev
                    )
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [id])

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, [messages.length])

    async function patchTicket(patch: { status?: TicketStatus; priority?: TicketPriority }) {
        if (!ticket) return
        setBusy(true)
        setActionError(null)
        try {
            await updateTicket(ticket.id, patch)
            setTicket({ ...ticket, ...patch })
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Could not update the ticket.')
        } finally {
            setBusy(false)
        }
    }

    async function handleSend() {
        if (!ticket || !adminId || sending || body.trim().length === 0) return
        setSending(true)
        setActionError(null)
        try {
            const res = await adminReply({
                ticket,
                adminId,
                body,
                files: att.files,
                internal: mode === 'note',
                nextStatus: mode === 'reply' && nextStatus ? nextStatus : null,
            })
            setMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]))
            setTicket((prev) => (prev ? { ...prev, status: res.status } : prev))
            if (res.warning) setActionError(res.warning)
            setBody('')
            setNextStatus('')
            att.clear()
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Could not send. Try again.')
        } finally {
            setSending(false)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    if (error || !ticket) {
        return (
            <div className="space-y-4">
                <BackLink />
                <DashCard className="text-center text-sm text-muted-foreground">{error ?? 'Ticket not found.'}</DashCard>
            </div>
        )
    }

    const roleLabel = ticket.user_role === 'brand' ? 'Brand' : 'Creator'
    const isNote = mode === 'note'

    return (
        <div className="space-y-5">
            <BackLink />

            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
                        {ticket.subject}
                    </h1>
                    <p className="mt-1 text-xs text-muted-foreground">
                        #{ticket.ticket_number} · {TICKET_CATEGORY_LABEL[ticket.category]} · Opened {when(ticket.created_at)}
                    </p>
                </div>
                <StatusPill status={TICKET_STATUS_ADMIN_UI[ticket.status]} />
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                {/* Thread + composer */}
                <div className="space-y-5">
                    <ul className="space-y-4">
                        {messages.map((m) => {
                            const senderName = m.from_admin ? adminNames[m.sender_id] ?? 'Admin' : requester.name || roleLabel

                            if (m.is_internal) {
                                return (
                                    <li key={m.id}>
                                        <div className="rounded-2xl border border-[oklch(0.85_0.08_85)] bg-[oklch(0.97_0.04_90)] px-4 py-3 text-sm text-ink">
                                            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-[oklch(0.45_0.12_70)]">
                                                <StickyNote className="h-3.5 w-3.5" /> Internal note · {senderName} · {when(m.created_at)}
                                            </p>
                                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                                            <AttachmentGrid attachments={m.attachments} />
                                        </div>
                                    </li>
                                )
                            }

                            return (
                                <li key={m.id} className={`flex ${m.from_admin ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[88%] sm:max-w-[80%] ${m.from_admin ? 'text-right' : ''}`}>
                                        <p className="mb-1 text-[11px] text-muted-foreground">
                                            {senderName} · {when(m.created_at)}
                                        </p>
                                        <div
                                            className={`rounded-2xl px-4 py-3 text-left text-sm ${
                                                m.from_admin
                                                    ? 'text-primary-foreground shadow-sm'
                                                    : 'border border-hairline bg-surface-elevated text-ink shadow-card'
                                            }`}
                                            style={m.from_admin ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
                                        >
                                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                                            <AttachmentGrid attachments={m.attachments} />
                                        </div>
                                    </div>
                                </li>
                            )
                        })}
                        <div ref={endRef} />
                    </ul>

                    <DashCard className="space-y-3">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMode('reply')}
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                    !isNote ? 'bg-ink text-white' : 'border border-hairline bg-background text-ink hover:bg-ink/5'
                                }`}
                            >
                                Reply to {roleLabel.toLowerCase()}
                            </button>
                            <button
                                onClick={() => setMode('note')}
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                    isNote ? 'bg-ink text-white' : 'border border-hairline bg-background text-ink hover:bg-ink/5'
                                }`}
                            >
                                Internal note
                            </button>
                        </div>

                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            onPaste={att.onPaste}
                            onKeyDown={(e) => {
                                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend()
                            }}
                            rows={5}
                            placeholder={isNote ? 'Only admins can see this note' : `Write to ${requester.name || roleLabel.toLowerCase()}`}
                            className={`w-full resize-y rounded-xl border px-3 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                                isNote
                                    ? 'border-[oklch(0.85_0.08_85)] bg-[oklch(0.97_0.04_90)]'
                                    : 'border-hairline bg-background'
                            }`}
                        />

                        <AttachmentPicker att={att} disabled={sending} />

                        {actionError && (
                            <p className="rounded-xl bg-[oklch(0.94_0.05_25)] px-3 py-2 text-xs text-[oklch(0.5_0.18_25)]">
                                {actionError}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center justify-end gap-3">
                            {!isNote && (
                                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                    After sending
                                    <select
                                        value={nextStatus}
                                        onChange={(e) => setNextStatus(e.target.value as '' | TicketStatus)}
                                        className="rounded-xl border border-hairline bg-background px-2.5 py-1.5 text-xs text-ink"
                                    >
                                        <option value="">Keep status</option>
                                        <option value="awaiting_user">Awaiting user</option>
                                        <option value="resolved">Resolved</option>
                                    </select>
                                </label>
                            )}
                            <button
                                onClick={handleSend}
                                disabled={sending || body.trim().length === 0}
                                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
                                style={{ backgroundImage: 'var(--gradient-primary)' }}
                            >
                                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                {isNote ? 'Add note' : 'Send reply'}
                            </button>
                        </div>
                    </DashCard>
                </div>

                {/* Details */}
                <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                    <DashCard className="space-y-4 !p-5">
                        <div className="flex items-center gap-3">
                            <BrandAvatar
                                initial={(requester.name || roleLabel).slice(0, 1).toUpperCase()}
                                color="oklch(0.66 0.20 42)"
                                size={40}
                            />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink">{requester.name || roleLabel}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {roleLabel}
                                    {requester.email ? ` · ${requester.email}` : ''}
                                </p>
                            </div>
                        </div>

                        <dl className="space-y-2 text-xs">
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">Campaign</dt>
                                <dd className="truncate font-medium text-ink">{ticket.campaignName ?? 'None'}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">Last activity</dt>
                                <dd className="font-medium text-ink">{when(ticket.updated_at)}</dd>
                            </div>
                        </dl>
                    </DashCard>

                    <DashCard className="space-y-4 !p-5">
                        <label className="block">
                            <span className="mb-1.5 block text-xs font-semibold text-ink">Status</span>
                            <select
                                value={ticket.status}
                                disabled={busy}
                                onChange={(e) => patchTicket({ status: e.target.value as TicketStatus })}
                                className={selectCls}
                            >
                                {TICKET_STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                        {TICKET_STATUS_ADMIN_UI[s]}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-1.5 block text-xs font-semibold text-ink">Priority</span>
                            <select
                                value={ticket.priority}
                                disabled={busy}
                                onChange={(e) => patchTicket({ priority: e.target.value as TicketPriority })}
                                className={selectCls}
                            >
                                {(Object.keys(TICKET_PRIORITY_LABEL) as TicketPriority[]).map((p) => (
                                    <option key={p} value={p}>
                                        {TICKET_PRIORITY_LABEL[p]}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </DashCard>
                </aside>
            </div>
        </div>
    )
}

function BackLink() {
    return (
        <Link
            href="/app/admin/support"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
        >
            <ArrowLeft className="h-3.5 w-3.5" /> All tickets
        </Link>
    )
}