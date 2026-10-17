import { redirect } from 'next/navigation'

// Paying creators moved to Payouts (to-pay queue, references, history).
export default function AdminWalletPage() {
  redirect('/app/admin/payouts')
}
