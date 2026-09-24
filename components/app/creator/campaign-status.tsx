export type StatusUi = {
    label: string
    pill: string
    dot: string
    banner: string | null
    tone: 'warn' | 'danger' | 'muted'
}

const CAMPAIGN_STATUS_UI: Record<string, StatusUi> = {
    submission_review: {
        label: 'Open for Applications',
        pill: 'bg-[#FFEBD6] text-[#C25E00]',
        dot: 'bg-[#F57C00]',
        banner: null,
        tone: 'warn',
    },
    live: {
        label: 'Active Campaign',
        pill: 'bg-[#DDF5E6] text-[#1E7F4B]',
        dot: 'bg-[#1E9E56]',
        banner: null,
        tone: 'muted',
    },
    paused: {
        label: 'Paused',
        pill: 'bg-[#FFF1CC] text-[#8A6100]',
        dot: 'bg-[#E0A100]',
        banner: 'This campaign is paused. Applications and submissions are on hold until the brand resumes it.',
        tone: 'warn',
    },
    completed: {
        label: 'Completed',
        pill: 'bg-[#E6EEF8] text-[#2F5D9E]',
        dot: 'bg-[#2F5D9E]',
        banner: 'This campaign has ended. It is no longer accepting applications or submissions.',
        tone: 'muted',
    },
    cancelled: {
        label: 'Cancelled',
        pill: 'bg-[#FFDCDC] text-[#B03030]',
        dot: 'bg-[#D64545]',
        banner: 'This campaign was cancelled by the brand.',
        tone: 'danger',
    },
    expired: {
        label: 'Expired',
        pill: 'bg-[#EEE9E3] text-[#6B5F52]',
        dot: 'bg-[#9A8E80]',
        banner: 'This campaign has expired and is no longer accepting applications or submissions.',
        tone: 'muted',
    },
}


/** Statuses in which a creator can still apply. */
export const OPEN_STATUSES = ['live', 'submission_review']

export function CampaignStatusPill({ status, compact = false }: { status: string; compact?: boolean }) {
    const ui = CAMPAIGN_STATUS_UI[status]
    if (!ui) return null
    const label = compact && status === 'live' ? 'Active' : ui.label
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${ui.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} />
            {label}
        </span>
    )
}