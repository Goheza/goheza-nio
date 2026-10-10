'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { createTicket, listCampaignOptions } from '@/lib/api/support'
import { TICKET_CATEGORIES_BY_ROLE, TICKET_CATEGORY_LABEL } from '@/types/support'
import type { CampaignOption, SupportRole, TicketCategory } from '@/types/support'
import { AttachmentPicker, useAttachments } from '@/components/app/support/attachments'

const fieldCls =
    'w-full rounded-xl border border-hairline bg-background px-3 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40'

export default function NewTicketDialog({
    role,
    open,
    onClose,
    defaultCampaignId = null,
}: {
    role: SupportRole
    open: boolean
    onClose: () => void
    defaultCampaignId?: string | null
}) {
    const router = useRouter()
    const att = useAttachments()
    const [userId, setUserId] = useState<string | null>(null)
    const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
    const [category, setCategory] = useState<TicketCategory>('campaign')
    const [campaignId, setCampaignId] = useState<string>(defaultCampaignId ?? '')
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!open) return
        let cancelled = false
        ;(async () => {
            const { data } = await supabase.auth.getUser()
            if (!data?.user || cancelled) return
            setUserId(data.user.id)
            try {
                const options = await listCampaignOptions(data.user.id, role)
                if (!cancelled) setCampaigns(options)
            } catch {
                // Campaign link is optional; the form still works without it.
            }
        })()
        return () => {
            cancelled = true
        }
    }, [open, role])

    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !submitting) onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, submitting, onClose])

    if (!open) return null

    const canSubmit = !!userId && subject.trim().length >= 3 && body.trim().length > 0 && !submitting

    async function handleSubmit() {
        if (!userId || !canSubmit) return
        setSubmitting(true)
        setError(null)
        try {
            const id = await createTicket({
                userId,
                role,
                category,
                subject,
                body,
                campaignId: campaignId || null,
                files: att.files,
            })
            router.push(`/app/${role}/support/${id}`)
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Could not create the ticket. Check your connection and try again.'
            )
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
            <button
                aria-label="Close"
                className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
                onClick={() => !submitting && onClose()}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-ticket-title"
                className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-surface-elevated shadow-elevated sm:rounded-3xl"
            >
                <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4 sm:px-6">
                    <div>
                        <h2 id="new-ticket-title" className="font-display text-lg font-semibold text-ink">
                            New support ticket
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Describe the problem. Screenshots help us fix it faster.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-full bg-ink/5 p-2 text-ink hover:bg-ink/10 disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1.5 block text-xs font-semibold text-ink">
                                What do you need help with?
                            </span>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                                className={fieldCls}
                            >
                                {TICKET_CATEGORIES_BY_ROLE[role].map((c) => (
                                    <option key={c} value={c}>
                                        {TICKET_CATEGORY_LABEL[c]}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-1.5 block text-xs font-semibold text-ink">
                                Related campaign (optional)
                            </span>
                            <select
                                value={campaignId}
                                onChange={(e) => setCampaignId(e.target.value)}
                                className={fieldCls}
                            >
                                <option value="">None</option>
                                {campaigns.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-ink">Subject</span>
                        <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            maxLength={140}
                            placeholder="Short summary of the issue"
                            className={fieldCls}
                        />
                    </label>

                    <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-ink">What happened?</span>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            onPaste={att.onPaste}
                            rows={6}
                            placeholder="What you were doing, what you expected, and what you saw instead."
                            className={`${fieldCls} resize-y`}
                        />
                    </label>

                    <AttachmentPicker att={att} disabled={submitting} />

                    {error && (
                        <p className="rounded-xl bg-[oklch(0.94_0.05_25)] px-3 py-2 text-xs text-[oklch(0.5_0.18_25)]">
                            {error}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-hairline px-5 py-4 sm:px-6">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-full border border-hairline bg-background px-4 py-2.5 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
                        style={{ backgroundImage: 'var(--gradient-primary)' }}
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Submit ticket
                    </button>
                </div>
            </div>
        </div>
    )
}