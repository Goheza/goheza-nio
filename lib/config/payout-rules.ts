export const PAYOUT_RULES = {
  ratePer1kViews: 10000, // UGX
  platformFeePct: 0.15,
} as const

export function computeEarnings(views: number) {
  const gross = (views / 1000) * PAYOUT_RULES.ratePer1kViews
  const platformFee = gross * PAYOUT_RULES.platformFeePct
  const net = gross - platformFee
  return { gross, platformFee, net }
}

// max_pay is GROSS (before the 15% fee), so this converts a campaign's
// payout ceiling directly into the view count that earns it.
export function computeRequiredViews(maxPayGross: number): number {
  return (maxPayGross / PAYOUT_RULES.ratePer1kViews) * 1000
}