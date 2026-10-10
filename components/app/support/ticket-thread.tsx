'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import { DashCard, StatusPill } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { getTicketThread, postReply, setTicketStatus, signMessages } from '@/lib/api/support'
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_UI } from '@/types/support'
import type { SupportMessage, SupportRole, TicketDetail, TicketStatus } from '@/types/support'
import { AttachmentGrid, AttachmentPicker, useAttachments } from '@/components/app/support/attachments'

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export default function TicketThread({ role }: { role: SupportRole }) {
    const { id } = useParams<{ id: string }>()
    const att = useAttachments()

    const [userId, setUserId] = useState<string | null>(null)
    const [ticket, setTicket] = useState<TicketDetail | null>(null)
    const [messages, setMessages] = useState<SupportMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [body, setBody] = useState('')
    const [sending, setSending] = useState(false)
    const [sendError, setSendError] = useState<string | null>(null)
    const [statusBusy, setStatusBusy] = useState(false)

    const endRef = useRef<HTMLDivElement>(null)

    // Initial load
    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const { data: userData } = await supabase.auth.getUser()
                if (!userData?.user) throw new Error('Not signed in.')
                if (!cancelled) setUserId(userData.user.id)
                const thread = await getTicketThread(id)
                if (!cancelled) {
                    setTicket(thread.ticket)
                    setMessages(thread.messages)
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

    // Live updates: admin replies and status changes
    useEffect(() => {
        const channel = supabase
            .channel(`support-ticket-${id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'support_ticket_messages', filter: `ticket_id=eq.${id}` },
                async (payload) => {
                    const row = payload.new as Omit<SupportMessage, 'attachments'> & { attachments: any[] | null }
                    if (row.is_internal) return
                    const [signed] = await signMessages([row])
                    setMessages((prev) => (prev.some((m) => m.id === signed.id) ? prev : [...prev, signed]))
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${id}` },
                (payload) => {
                    const next = payload.new as { status: TicketStatus; updated_at: string }
                    setTicket((prev) => (prev ? { ...prev, status: next.status, updated_at: next.updated_at } : prev))
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

    async function handleSend() {
        if (!userId || !ticket || sending || body.trim().length === 0) return
        setSending(true)
        setSendError(null)
        try {
            const { message, status } = await postReply({ ticketId: ticket.id, userId, body, files: att.files })
            setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))
            setTicket((prev) => (prev ? { ...prev, status } : prev))
            setBody('')
            att.clear()
        } catch (err) {
            setSendError(err instanceof Error ? err.message : 'Could not send your reply. Try again.')
        } finally {
            setSending(false)
        }
    }

    async function handleStatus(next: 'open' | 'closed') {
        if (!ticket) return
        setStatusBusy(true)
        try {
            await setTicketStatus(ticket.id, next)
            setTicket({ ...ticket, status: next })
        } catch (err) {
            setSendError(err instanceof Error ? err.message : 'Could not update the ticket.')
        } finally {
            setStatusBusy(false)
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
                <BackLink role={role} />
                <DashCard className="text-center text-sm text-muted-foreground">{error ?? 'Ticket not found.'}</DashCard>
            </div>
        )
    }

    const isClosed = ticket.status === 'closed'

    return (
        <div className="mx-auto max-w-3xl space-y-5">
            <BackLink role={role} />

            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
                        {ticket.subject}
                    </h1>
                    <p className="mt-1 text-xs text-muted-foreground">
                        #{ticket.ticket_number} · {TICKET_CATEGORY_LABEL[ticket.category]}
                        {ticket.campaignName ? ` · ${ticket.campaignName}` : ''} · Opened {when(ticket.created_at)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <StatusPill status={TICKET_STATUS_UI[ticket.status]} />
                    {!isClosed && (
                        <button
                            onClick={() => handleStatus('closed')}
                            disabled={statusBusy}
                            className="rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                        >
                            Close ticket
                        </button>
                    )}
                </div>
            </div>

            <ul className="space-y-4">
                {messages.map((m) => (
                    <li key={m.id} className={`flex ${m.from_admin ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[88%] sm:max-w-[80%] ${m.from_admin ? '' : 'text-right'}`}>
                            <p className="mb-1 text-[11px] text-muted-foreground">
                                {m.from_admin ? 'Goheza Support' : 'You'} · {when(m.created_at)}
                            </p>
                            <div
                                className={`rounded-2xl px-4 py-3 text-left text-sm ${
                                    m.from_admin
                                        ? 'border border-hairline bg-surface-elevated text-ink shadow-card'
                                        : 'text-primary-foreground shadow-sm'
                                }`}
                                style={m.from_admin ? undefined : { backgroundImage: 'var(--gradient-primary)' }}
                            >
                                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                                <AttachmentGrid attachments={m.attachments} />
                            </div>
                        </div>
                    </li>
                ))}
                <div ref={endRef} />
            </ul>

            {isClosed ? (
                <DashCard className="flex flex-wrap items-center justify-between gap-3 !py-4">
                    <p className="text-sm text-muted-foreground">This ticket is closed. Reopen it to reply.</p>
                    <button
                        onClick={() => handleStatus('open')}
                        disabled={statusBusy}
                        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-50"
                    >
                        Reopen ticket
                    </button>
                </DashCard>
            ) : (
                <DashCard className="space-y-3">
                    {ticket.status === 'resolved' && (
                        <p className="text-xs text-muted-foreground">
                            Marked as resolved. Sending a reply reopens the ticket.
                        </p>
                    )}
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        onPaste={att.onPaste}
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend()
                        }}
                        rows={4}
                        placeholder="Write a reply"
                        className="w-full resize-y rounded-xl border border-hairline bg-background px-3 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <AttachmentPicker att={att} disabled={sending} />
                    {sendError && (
                        <p className="rounded-xl bg-[oklch(0.94_0.05_25)] px-3 py-2 text-xs text-[oklch(0.5_0.18_25)]">
                            {sendError}
                        </p>
                    )}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSend}
                            disabled={sending || body.trim().length === 0}
                            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Send reply
                        </button>
                    </div>
                </DashCard>
            )}
        </div>
    )
}

function BackLink({ role }: { role: SupportRole }) {
    return (
        <Link
            href={`/app/${role}/support`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
        >
            <ArrowLeft className="h-3.5 w-3.5" /> All tickets
        </Link>
    )
}