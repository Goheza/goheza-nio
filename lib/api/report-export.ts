import * as XLSX from 'xlsx'
import type { CampaignReportData } from '@/lib/api/campaign-report'

export function exportReportAsCSV(report: CampaignReportData) {
    const rows = [
        ['Creator', 'Views', 'Likes', 'Comments', 'Shares', 'Earnings (UGX)'],
        ...report.creators.map((c) => [c.name, c.views, c.likes, c.comments, c.shares, c.earnings.toFixed(0)]),
    ]
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadBlob(csv, `${report.name}-report.csv`, 'text/csv')
}

export function exportReportAsExcel(report: CampaignReportData) {
    const summarySheet = XLSX.utils.json_to_sheet([
        { Metric: 'Total Views', Value: report.totalViews },
        { Metric: 'Total Likes', Value: report.totalLikes },
        { Metric: 'Total Comments', Value: report.totalComments },
        { Metric: 'Total Shares', Value: report.totalShares },
        { Metric: 'Budget Total', Value: report.budgetTotal },
        { Metric: 'Budget Used', Value: report.budgetUsed },
        { Metric: 'Cost per 1K Views', Value: report.costPer1kViews },
    ])
    const creatorSheet = XLSX.utils.json_to_sheet(
        report.creators.map((c) => ({
            Creator: c.name,
            Views: c.views,
            Likes: c.likes,
            Comments: c.comments,
            Shares: c.shares,
            'Earnings (UGX)': c.earnings,
        }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')
    XLSX.utils.book_append_sheet(wb, creatorSheet, 'Creators')
    XLSX.writeFile(wb, `${report.name}-report.xlsx`)
}

/**
 * PDF export uses the browser's native print-to-PDF rather than a
 * client-side PDF-rendering library (jsPDF/html2canvas, etc). Those
 * libraries add real bundle weight and tend to mangle complex CSS layouts
 * (gradients, flex/grid) — printing the already-styled report DOM directly
 * gives a more faithful result for near-zero added cost. Requires a
 * print stylesheet (see globals.css addition below) to hide UI chrome and
 * paginate cleanly.
 */
export function exportReportAsPDF(reportEl: HTMLElement | null) {
    if (!reportEl) return
    window.print()
}

function downloadBlob(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}