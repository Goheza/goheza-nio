'use client'

import { X } from 'lucide-react'
import type { AdminWithdrawal, WithdrawalStatus } from '@/lib/api/admin-payouts'

export function formatWhen(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** "in 5h", "2h overdue", "3d ago" */
export function relative(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now
  const abs = Math.abs(diff)
  const unit = abs >= 86_400_000 ? [86_400_000, 'd'] : abs >= 3_600_000 ? [3_600_000, 'h'] : [60_000, 'm']
  const n = Math.max(1, Math.round(abs / (unit[0] as number)))
  return diff >= 0 ? `in ${n}${unit[1]}` : `${n}${unit[1]} ago`
}

const STATUS: Record<WithdrawalStatus, { label: string; className: string }> = {
  requested: { label: 'To pay', className: 'bg-[oklch(0.95_0.04_268)] text-[oklch(0.4_0.14_268)]' },
  processing: { label: 'Sending', className: 'bg-[oklch(0.96_0.06_85)] text-[oklch(0.45_0.12_70)]' },
  paid: { label: 'Paid', className: 'bg-[oklch(0.95_0.05_150)] text-[oklch(0.4_0.12_150)]' },
  failed: { label: "Couldn't pay", className: 'bg-[oklch(0.95_0.04_25)] text-[oklch(0.5_0.16_25)]' },
  cancelled: { label: 'Cancelled', className: 'bg-ink/5 text-ink-soft' },
}

export function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${className}`}>
      {children}
    </span>
  )
}

export function StatusPill({ w }: { w: AdminWithdrawal }) {
  if (w.overdue) return <Pill className="bg-[oklch(0.95_0.04_25)] text-[oklch(0.5_0.16_25)]">Overdue</Pill>
  const s = STATUS[w.status]
  return <Pill className={s.className}>{s.label}</Pill>
}

export function RouteLabel({ w }: { w: AdminWithdrawal }) {
  if (w.route === 'kacyber_auto') return <>Automatic</>
  return <>{w.source === 'admin_manual' ? 'Admin payout' : 'Manual'}</>
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4" onClick={onClose}>
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-surface-elevated shadow-card ${wide ? 'max-w-xl' : 'max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline p-5">
          <div>
            <p className="font-display text-lg font-semibold text-ink">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 border-t border-hairline p-5">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-hairline bg-background px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40'

export const buttonPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-50'

export const buttonSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-full border border-hairline bg-background px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5 disabled:opacity-50'

export const buttonDanger =
  'inline-flex items-center justify-center gap-1.5 rounded-full border border-[oklch(0.85_0.08_25)] bg-background px-4 py-2 text-sm font-medium text-[oklch(0.5_0.16_25)] hover:bg-[oklch(0.97_0.02_25)] disabled:opacity-50'

export function MoneyRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-semibold text-ink' : 'text-ink'}>{value}</span>
    </div>
  )
}

export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null
  return <p className="rounded-xl bg-[oklch(0.97_0.02_25)] p-3 text-sm font-medium text-[oklch(0.5_0.16_25)]">{error}</p>
}
