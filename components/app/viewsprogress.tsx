import { formatViews } from '@/lib/format-views'

export function ViewsProgress({ current, required }: { current: number; required: number | null }) {
  if (required === null) return null
  const pct = Math.min(100, (current / required) * 100)
  const capped = current >= required
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{formatViews(current)} / {formatViews(required)} views</span>
        {capped && <span className="font-semibold text-[oklch(0.5_0.14_152)]">Cap reached</span>}
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundImage: capped ? undefined : 'var(--gradient-primary)',
            backgroundColor: capped ? 'oklch(0.5 0.14 152)' : undefined,
          }}
        />
      </div>
    </div>
  )
}