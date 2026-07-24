import { type ReactNode } from 'react'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-3xl lg:text-4xl">
                    {title}
                </h1>
                {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    )
}

export function DashCard({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-hairline bg-surface-elevated p-5 shadow-card sm:p-6 ${className}`}>
            {children}
        </div>
    )
}

export function StatCard({
    label,
    value,
    delta,
    icon,
    tone = 'neutral',
}: {
    label: string
    value: string
    delta?: string
    icon?: ReactNode
    tone?: 'neutral' | 'orange' | 'green' | 'indigo'
}) {
    const toneBg: Record<string, string> = {
        neutral: 'bg-[oklch(0.95_0.02_75)] text-ink',
        orange: 'bg-[oklch(0.94_0.07_55)] text-[oklch(0.55_0.18_45)]',
        green: 'bg-[oklch(0.93_0.07_152)] text-[oklch(0.45_0.12_152)]',
        indigo: 'bg-[oklch(0.93_0.04_268)] text-[oklch(0.45_0.12_268)]',
    }
    return (
        <DashCard>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                    <p className="font-display mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">
                        {value}
                    </p>
                    {delta && <p className="mt-1 text-xs text-[oklch(0.5_0.14_152)]">{delta}</p>}
                </div>
                {icon && (
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneBg[tone]}`}>
                        {icon}
                    </span>
                )}
            </div>
        </DashCard>
    )
}

export function StatusPill({ status }: { status: string }) {
    const map: Record<string, string> = {
        Approved: 'bg-[oklch(0.93_0.08_152)] text-[oklch(0.4_0.14_152)]',
        Selected: 'bg-[oklch(0.93_0.08_152)] text-[oklch(0.4_0.14_152)]',
        Live: 'bg-[oklch(0.93_0.08_152)] text-[oklch(0.4_0.14_152)]',
        'Pending Review': 'bg-[oklch(0.94_0.05_75)] text-[oklch(0.45_0.12_70)]',
        'Needs Revision': 'bg-[oklch(0.94_0.07_55)] text-[oklch(0.5_0.18_45)]',
        Rejected: 'bg-[oklch(0.94_0.05_25)] text-[oklch(0.5_0.18_25)]',
        Open: 'bg-[oklch(0.93_0.04_268)] text-[oklch(0.4_0.14_268)]',
        'Closing Soon': 'bg-[oklch(0.94_0.07_55)] text-[oklch(0.5_0.18_45)]',
        New: 'bg-[oklch(0.93_0.08_152)] text-[oklch(0.4_0.14_152)]',
        Draft: 'bg-[oklch(0.95_0.02_75)] text-ink-soft',
        'Submission & Review': 'bg-[oklch(0.94_0.05_75)] text-[oklch(0.45_0.12_70)]',
        Completed: 'bg-[oklch(0.93_0.04_268)] text-[oklch(0.4_0.14_268)]',
        Paused: 'bg-[oklch(0.94_0.07_55)] text-[oklch(0.5_0.18_45)]',
    }
    const cls = map[status] ?? 'bg-[oklch(0.95_0.02_75)] text-ink'
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
            {status}
        </span>
    )
}

export function BrandAvatar({ initial, color, size = 40 }: { initial: string; color: string; size?: number }) {
    return (
        <span
            className="inline-flex items-center justify-center rounded-xl font-display font-semibold text-white shadow-sm"
            style={{ background: color, width: size, height: size, fontSize: size * 0.42 }}
        >
            {initial}
        </span>
    )
}
