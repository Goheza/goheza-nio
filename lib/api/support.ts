import { supabase } from '@/lib/supabase'
import { listApplicationsForCreator } from '@/lib/api/campaign-applications'
import { getCampaignsByIds } from '@/lib/api/creator-campaigns'
import type {
    Attachment,
    CampaignOption,
    SupportMessage,
    SupportRole,
    SupportTicket,
    TicketCategory,
    TicketDetail,
    TicketListItem,
    TicketStatus,
} from '@/types/support'

const BUCKET = 'support-attachments'

export const MAX_FILES = 5
export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

type RawMessage = Omit<SupportMessage, 'attachments'> & { attachments: Attachment[] | null }

/** PostgrestError / StorageError are not `Error` instances; normalise so UI can show .message. */
export function asError(e: unknown): Error {
    if (e instanceof Error) return e
    const msg = (e as { message?: string } | null)?.message
    return new Error(msg || 'Something went wrong.')
}

export function validateFiles(files: File[]): string | null {
    if (files.length > MAX_FILES) return `You can attach up to ${MAX_FILES} screenshots.`
    for (const f of files) {
        if (!ALLOWED_TYPES.includes(f.type)) return `${f.name} is not supported. Use PNG, JPG, WebP or GIF.`
        if (f.size > MAX_FILE_BYTES) return `${f.name} is larger than 5 MB.`
    }
    return null
}

export async function uploadFiles(ownerId: string, ticketId: string, files: File[]): Promise<Attachment[]> {
    const uploaded: Attachment[] = []
    for (const f of files) {
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${ownerId}/${ticketId}/${crypto.randomUUID()}-${safeName}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type, upsert: false })
        if (error) {
            await removeFiles(uploaded.map((a) => a.path))
            throw asError(error)
        }
        uploaded.push({ path, name: f.name, size: f.size, type: f.type })
    }
    return uploaded
}

export async function removeFiles(paths: string[]) {
    if (paths.length === 0) return
    await supabase.storage.from(BUCKET).remove(paths)
}

/** Attach short-lived signed URLs to every attachment in the given messages. */
export async function signMessages(rows: RawMessage[]): Promise<SupportMessage[]> {
    const paths = rows.flatMap((r) => (r.attachments ?? []).map((a) => a.path))
    const urlByPath = new Map<string, string>()

    if (paths.length > 0) {
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
        if (error) throw asError(error)
        data?.forEach((d) => {
            if (d.path && d.signedUrl) urlByPath.set(d.path, d.signedUrl)
        })
    }

    return rows.map((r) => ({
        ...r,
        attachments: (r.attachments ?? []).map((a) => ({ ...a, url: urlByPath.get(a.path) ?? null })),
    }))
}

export async function listMyTickets(userId: string): Promise<TicketListItem[]> {
    const { data, error } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, category, subject, status, created_at, updated_at, campaigns(name)')
        .eq('created_by', userId)
        .order('updated_at', { ascending: false })

    if (error) throw asError(error)

    return (data ?? []).map((row) => {
        const { campaigns, ...rest } = row as unknown as Omit<TicketListItem, 'campaignName'> & {
            campaigns: { name: string } | null
        }
        return { ...rest, campaignName: campaigns?.name ?? null }
    })
}

export async function getTicketThread(
    ticketId: string
): Promise<{ ticket: TicketDetail; messages: SupportMessage[] }> {
    const [ticketRes, messagesRes] = await Promise.all([
        supabase.from('support_tickets').select('*, campaigns(name)').eq('id', ticketId).maybeSingle(),
        supabase.from('support_ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
    ])

    if (ticketRes.error) throw asError(ticketRes.error)
    if (messagesRes.error) throw asError(messagesRes.error)
    if (!ticketRes.data) throw new Error('Ticket not found.')

    const { campaigns, ...ticket } = ticketRes.data as unknown as SupportTicket & {
        campaigns: { name: string } | null
    }
    const messages = await signMessages((messagesRes.data ?? []) as RawMessage[])

    return { ticket: { ...ticket, campaignName: campaigns?.name ?? null }, messages }
}

export async function createTicket(input: {
    userId: string
    role: SupportRole
    category: TicketCategory
    subject: string
    body: string
    campaignId: string | null
    files: File[]
}): Promise<string> {
    const invalid = validateFiles(input.files)
    if (invalid) throw new Error(invalid)

    const ticketId = crypto.randomUUID()

    const { error: ticketError } = await supabase.from('support_tickets').insert({
        id: ticketId,
        created_by: input.userId,
        user_role: input.role,
        category: input.category,
        subject: input.subject.trim(),
        campaign_id: input.campaignId,
    })
    if (ticketError) throw asError(ticketError)

    let attachments: Attachment[] = []
    try {
        attachments = await uploadFiles(input.userId, ticketId, input.files)
        const { error } = await supabase.from('support_ticket_messages').insert({
            ticket_id: ticketId,
            sender_id: input.userId,
            from_admin: false,
            body: input.body.trim(),
            attachments,
        })
        if (error) throw asError(error)
    } catch (err) {
        // Roll back so the brand doesn't end up with an empty ticket.
        await removeFiles(attachments.map((a) => a.path))
        await supabase.from('support_tickets').delete().eq('id', ticketId)
        throw asError(err)
    }

    return ticketId
}

export async function postReply(input: {
    ticketId: string
    userId: string
    body: string
    files: File[]
}): Promise<{ message: SupportMessage; status: TicketStatus }> {
    const invalid = validateFiles(input.files)
    if (invalid) throw new Error(invalid)

    const attachments = await uploadFiles(input.userId, input.ticketId, input.files)

    const { data, error } = await supabase
        .from('support_ticket_messages')
        .insert({
            ticket_id: input.ticketId,
            sender_id: input.userId,
            from_admin: false,
            body: input.body.trim(),
            attachments,
        })
        .select('*')
        .single()

    if (error) {
        await removeFiles(attachments.map((a) => a.path))
        throw asError(error)
    }

    const [message] = await signMessages([data as RawMessage])

    // The message trigger may have moved the ticket (e.g. awaiting_user -> open).
    const { data: t } = await supabase.from('support_tickets').select('status').eq('id', input.ticketId).maybeSingle()

    return { message, status: (t?.status as TicketStatus) ?? 'open' }
}

/** Brands can only close a ticket, or reopen one that is resolved/closed. */
export async function setTicketStatus(ticketId: string, status: 'open' | 'closed') {
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId)
    if (error) throw asError(error)
}

/**
 * Campaigns a user can link a ticket to.
 * Brands: campaigns they created. Creators: campaigns they applied to.
 */
export async function listCampaignOptions(userId: string, role: SupportRole): Promise<CampaignOption[]> {
    if (role === 'brand') {
        const { data, error } = await supabase
            .from('campaigns')
            .select('id, name')
            .eq('created_by', userId)
            .order('created_at', { ascending: false })

        if (error) throw asError(error)
        return (data ?? []) as CampaignOption[]
    }

    const applications = await listApplicationsForCreator(userId)
    const ids = Array.from(new Set(applications.map((a) => a.campaign_id)))
    if (ids.length === 0) return []

    const byId = await getCampaignsByIds(ids)
    return ids.filter((id) => byId[id]?.name).map((id) => ({ id, name: byId[id].name as string }))
}