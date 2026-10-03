// Compact display for view counts: 850, 25K, 1.2M — not 25,436.
// Uses the same Intl compact notation pattern already used elsewhere
// (see formatNumber in the campaign details page), centralized here so
// every earnings/progress view formats views identically.
export function formatViews(n: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: n >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(n)
}