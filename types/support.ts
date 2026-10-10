export type TicketStatus = 'open' | 'in_progress' | 'awaiting_user' | 'resolved' | 'closed'
export type TicketCategory = 'campaign' | 'creators' | 'billing' | 'payout' | 'account' | 'bug' | 'other'
export type TicketPriority = 'low' | 'normal' | 'high'

/** Labels shown to brands. Keep in sync with StatusPill's map in dash-ui. */
export type TicketUiStatus = 'Open' | 'In Progress' | 'Awaiting You' | 'Resolved' | 'Closed'

export const TICKET_STATUS_UI: Record<TicketStatus, TicketUiStatus> = {
    open: 'Open',
    in_progress: 'In Progress',
    awaiting_user: 'Awaiting You',
    resolved: 'Resolved',
    closed: 'Closed',
}

/** Same states, worded from the admin's point of view. */
export const TICKET_STATUS_ADMIN_UI: Record<TicketStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    awaiting_user: 'Awaiting User',
    resolved: 'Resolved',
    closed: 'Closed',
}

export const TICKET_STATUSES: TicketStatus[] = ['open', 'in_progress', 'awaiting_user', 'resolved', 'closed']

export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
}

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
    campaign: 'Campaign',
    creators: 'Creators & submissions',
    billing: 'Billing & wallet',
    payout: 'Payouts & wallet',
    account: 'Account & verification',
    bug: 'Something is broken',
    other: 'Other',
}

export type SupportRole = 'brand' | 'creator'

/** Categories each role can pick when opening a ticket. */
export const TICKET_CATEGORIES_BY_ROLE: Record<SupportRole, TicketCategory[]> = {
    brand: ['campaign', 'creators', 'billing', 'account', 'bug', 'other'],
    creator: ['campaign', 'payout', 'account', 'bug', 'other'],
}

export type Attachment = {
    path: string
    name: string
    size: number
    type: string
}

export type SignedAttachment = Attachment & { url: string | null }

export type SupportTicket = {
    id: string
    ticket_number: number
    created_by: string
    user_role: SupportRole
    campaign_id: string | null
    category: TicketCategory
    subject: string
    status: TicketStatus
    priority: TicketPriority
    assigned_to: string | null
    created_at: string
    updated_at: string
    resolved_at: string | null
}

export type SupportMessage = {
    id: string
    ticket_id: string
    sender_id: string
    from_admin: boolean
    is_internal: boolean
    body: string
    attachments: SignedAttachment[]
    created_at: string
}

export type TicketListItem = Pick<
    SupportTicket,
    'id' | 'ticket_number' | 'category' | 'subject' | 'status' | 'created_at' | 'updated_at'
> & { campaignName: string | null }

export type TicketDetail = SupportTicket & { campaignName: string | null }

export type CampaignOption = { id: string; name: string }