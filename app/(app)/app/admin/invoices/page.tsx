import { Download, RefreshCw, Send } from 'lucide-react'
import { adminInvoices, formatMoney } from '@/components/app/admin/admin-data'

export default function AdminInvoicesPage() {
    return (
        <div className="space-y-6">
            <header>
                <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Invoices</h1>

                <p className="text-sm text-muted-foreground">
                    Brand invoice queue. Generate PDFs, send manually and reconcile payments.
                </p>
            </header>

            <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface-elevated">
                <table className="w-full min-w-[680px] text-sm">
                    <thead className="border-b border-hairline bg-[oklch(0.97_0.012_78)] text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        <tr>
                            <th className="px-5 py-3">Invoice</th>
                            <th className="px-3 py-3">Brand</th>
                            <th className="px-3 py-3">Date</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3 text-right">Amount</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-hairline">
                        {adminInvoices.map((invoice) => (
                            <tr key={invoice.id} className="hover:bg-ink/[0.02]">
                                <td className="px-5 py-3 font-semibold text-ink">{invoice.number}</td>

                                <td className="px-3 py-3 text-ink">{invoice.brand}</td>

                                <td className="px-3 py-3 text-muted-foreground">{invoice.date}</td>

                                <td className="px-3 py-3">
                                    <span
                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                                            invoice.status === 'Paid'
                                                ? 'bg-[oklch(0.94_0.08_152)] text-[oklch(0.36_0.12_152)]'
                                                : invoice.status === 'Overdue'
                                                ? 'bg-[oklch(0.95_0.05_25)] text-[oklch(0.5_0.18_25)]'
                                                : invoice.status === 'Sent'
                                                ? 'bg-[oklch(0.95_0.04_268)] text-[oklch(0.4_0.14_268)]'
                                                : 'bg-[oklch(0.96_0.06_55)] text-[oklch(0.45_0.16_45)]'
                                        }`}
                                    >
                                        {invoice.status}
                                    </span>
                                </td>

                                <td className="px-3 py-3 text-right font-semibold text-ink">
                                    {formatMoney(invoice.amount)}
                                </td>

                                <td className="px-5 py-3 text-right">
                                    <div className="inline-flex gap-1.5">
                                        <button className="inline-flex items-center gap-1 rounded-full border border-hairline bg-background px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-ink/5">
                                            <Download className="h-3 w-3" />
                                            PDF
                                        </button>

                                        <button className="inline-flex items-center gap-1 rounded-full border border-hairline bg-background px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-ink/5">
                                            <Send className="h-3 w-3" />
                                            Send
                                        </button>

                                        <button className="inline-flex items-center gap-1 rounded-full border border-hairline bg-background px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-ink/5">
                                            <RefreshCw className="h-3 w-3" />
                                            Mark Paid
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
