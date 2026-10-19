import {
    AlertTriangle,
    Award,
    Bell,
    Calendar,
    CheckCircle2,
    Clock,
    DollarSign,
    FileText,
    Inbox,
    MessageCircle,
    Sparkles,
    Users,
    Zap,
} from 'lucide-react'

// Shared by the bell popover and the notifications page.
// Add a line here when a new feature introduces a new `kind`. Unknown kinds fall back to a bell.
export const KIND_ICONS: Record<string, React.ReactNode> = {
    support: <MessageCircle className="h-4 w-4 text-[oklch(0.5_0.14_268)]" />,
    application: <Users className="h-4 w-4 text-[oklch(0.5_0.14_268)]" />,
    submission: <Sparkles className="h-4 w-4 text-[oklch(0.55_0.18_45)]" />,
    submission_limit: <Inbox className="h-4 w-4 text-[oklch(0.5_0.14_268)]" />,
    revision: <AlertTriangle className="h-4 w-4 text-[oklch(0.5_0.18_45)]" />,
    approval: <CheckCircle2 className="h-4 w-4 text-[oklch(0.5_0.14_152)]" />,
    phase_change: <Zap className="h-4 w-4 text-[oklch(0.55_0.18_45)]" />,
    campaign_end: <Clock className="h-4 w-4 text-ink-soft" />,
    deadline: <Clock className="h-4 w-4 text-[oklch(0.5_0.14_268)]" />,
    milestone_payment: <DollarSign className="h-4 w-4 text-[oklch(0.5_0.14_152)]" />,
    payment_processed: <DollarSign className="h-4 w-4 text-[oklch(0.5_0.14_152)]" />,
    payment: <DollarSign className="h-4 w-4 text-[oklch(0.5_0.14_152)]" />,
    milestone_views: <Award className="h-4 w-4 text-[oklch(0.55_0.18_45)]" />,
    wallet_low: <AlertTriangle className="h-4 w-4 text-[oklch(0.5_0.18_25)]" />,
    invoice: <FileText className="h-4 w-4 text-ink-soft" />,
    platform: <Sparkles className="h-4 w-4 text-[oklch(0.55_0.18_45)]" />,
    meeting: <Calendar className="h-4 w-4 text-[oklch(0.5_0.14_268)]" />,
}

export const FALLBACK_ICON = <Bell className="h-4 w-4 text-ink-soft" />

export function daysAgo(iso: string): number {
    const d = new Date(iso)
    const today = new Date()
    const diffMs =
        new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    return Math.round(diffMs / 86_400_000)
}

export function timeLabel(iso: string): string {
    const d = new Date(iso)
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    const ago = daysAgo(iso)
    if (ago === 0) return `Today at ${time}`
    if (ago === 1) return `Yesterday at ${time}`
    return d.toLocaleDateString()
}