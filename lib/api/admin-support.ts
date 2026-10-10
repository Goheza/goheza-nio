import { supabase } from '@/lib/supabase'
import { asError, removeFiles, signMessages, uploadFiles, validateFiles } from '@/lib/api/support'
import type {
    Attachment,
    SupportMessage,
    SupportRole,
    TicketCategory,
    TicketPriority,
    TicketStatus,
} from '@/types/support'

const LIST_LIMIT = 300

export type AdminTicketRow = {
    id: string
    ticket_number: number
    created_by: string
    user_role: SupportRole
    category: TicketCategory
    subject: string
    status: TicketStatus
    priority: TicketPriority
    created_at: string
    updated_at: string
    campaignName: string | null
    requesterName: string
}

export type Requester = { name: string; email: string | null }

type Ids = { brand: string[]; creator: string[]; admin: string[] }

const uniq = (xs: (string | null | undefined)[]) => Array.from(new Set(xs.filter(Boolean) as string[]))

/**
 * Batch-resolve display names. Brands: brand_profiles.brand_name. Creators: creator_profiles.full_name.
 * Admins: admins.full_name. A failed lookup (e.g. RLS) falls back to a generic label instead of throwing.
 */
async function loadNames(ids: Ids) {
    const [brands, creators, admins] = await Promise.all([
        ids.brand.length
            ? supabase.from('brand_profiles').select('user_id, brand_name, brand_email').in('user_id', ids.brand)
            : Promise.resolve({ data: [] as any[] }),
        ids.creator.length
            ? supabase.from('creator_profiles').select('user_id, full_name').in('user_id', ids.creator)
            : Promise.resolve({ data: [] as any[] }),
        ids.admin.length
            ? supabase.from('admins').select('user_id, full_name').in('user_id', ids.admin)
            : Promise.resolve({ data: [] as any[] }),
    ])

    const brandMap = new Map<string, Requester>(
        (brands.data ?? []).map((b: any) => [b.user_id, { name: b.brand_name || 'Unnamed brand', email: b.brand_email ?? null }])
    )
    const creatorMap = new Map<string, Requester>(
        (creators.data ?? []).map((c: any) => [c.user_id, { name: c.full_name || 'Unnamed creator', email: null }])
    )
    const adminMap = new Map<string, string>((admins.data ?? []).map((a: any) => [a.user_id, a.full_name || 'Admin']))

    return { brandMap, creatorMap, adminMap }
}

export async function listAdminTickets(): Promise<AdminTicketRow[]> {
    const { data, error } = await supabase
        .from('support_tickets')
        .select(
            'id, ticket_number, created_by, user_role, category, subject, status, priority, created_at, updated_at, campaigns(name)'
        )
        .order('updated_at', { ascending: false })
        .limit(LIST_LIMIT)

    if (error) throw asError(error)

    const rows = (data ?? []) as unknown as (Omit<AdminTicketRow, 'campaignName' | 'requesterName'> & {
        campaigns: { name: string } | null
    })[]

    const { brandMap, creatorMap } = await loadNames({
        brand: uniq(rows.filter((r) => r.user_role === 'brand').map((r) => r.created_by)),
        creator: uniq(rows.filter((r) => r.user_role === 'creator').map((r) => r.created_by)),
        admin: [],
    })

    return rows.map(({ campaigns, ...r }) => ({
        ...r,
        campaignName: campaigns?.name ?? null,
        requesterName:
            (r.user_role === 'brand' ? brandMap : creatorMap).get(r.created_by)?.name ??
            (r.user_role === 'brand' ? 'Unknown brand' : 'Unknown creator'),
    }))
}

export async function getRequester(userId: string, role: SupportRole): Promise<Requester> {
    const { brandMap, creatorMap } = await loadNames({
        brand: role === 'brand' ? [userId] : [],
        creator: role === 'creator' ? [userId] : [],
        admin: [],
    })
    return (
        (role === 'brand' ? brandMap : creatorMap).get(userId) ?? {
            name: role === 'brand' ? 'Unknown brand' : 'Unknown creator',
            email: null,
        }
    )
}

export async function getAdminNames(ids: (string | null | undefined)[]): Promise<Record<string, string>> {
    const { adminMap } = await loadNames({ brand: [], creator: [], admin: uniq(ids) })
    return Object.fromEntries(adminMap)
}

export async function updateTicket(
    ticketId: string,
    patch: { status?: TicketStatus; priority?: TicketPriority }
) {
    const { error } = await supabase.from('support_tickets').update(patch).eq('id', ticketId)
    if (error) throw asError(error)
}

/**
 * Send a public reply or an internal note.
 * - Files are stored under the ticket OWNER's folder so the owner can read them.
 * - nextStatus (optional) is applied after the message so it wins over the automatic open -> in_progress move.
 */
export async function adminReply(input: {
    ticket: { id: string; created_by: string }
    adminId: string
    body: string
    files: File[]
    internal: boolean
    nextStatus: TicketStatus | null
}): Promise<{ message: SupportMessage; status: TicketStatus; warning?: string }> {
    const invalid = validateFiles(input.files)
    if (invalid) throw new Error(invalid)

    const attachments: Attachment[] = await uploadFiles(input.ticket.created_by, input.ticket.id, input.files)

    const { data, error } = await supabase
        .from('support_ticket_messages')
        .insert({
            ticket_id: input.ticket.id,
            sender_id: input.adminId,
            from_admin: true,
            is_internal: input.internal,
            body: input.body.trim(),
            attachments,
        })
        .select('*')
        .single()

    if (error) {
        await removeFiles(attachments.map((a) => a.path))
        throw asError(error)
    }

    const [message] = await signMessages([data as any])

    let warning: string | undefined
    if (!input.internal && input.nextStatus) {
        try {
            await updateTicket(input.ticket.id, { status: input.nextStatus })
        } catch (err) {
            warning = `Message sent, but the status could not be updated: ${asError(err).message}`
        }
    }

    const { data: t } = await supabase.from('support_tickets').select('status').eq('id', input.ticket.id).maybeSingle()

    return { message, status: (t?.status as TicketStatus) ?? 'open', warning }
}