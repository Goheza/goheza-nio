export type QuickFilter =
    | 'Today'
    | 'This Week'
    | 'This Month'
    | 'Last Month'
    | 'Last 3 Months'
    | 'This Year'
    | 'Lifetime'

export function getDateRangeForFilter(filter: QuickFilter): { from: Date | null; to: Date } {
    const now = new Date()
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

    switch (filter) {
        case 'Today':
            return { from: startOfDay(now), to: now }
        case 'This Week': {
            const day = now.getDay()
            const diffToMonday = day === 0 ? 6 : day - 1
            const monday = new Date(now)
            monday.setDate(now.getDate() - diffToMonday)
            return { from: startOfDay(monday), to: now }
        }
        case 'This Month':
            return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
        case 'Last Month':
            return {
                from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
            }
        case 'Last 3 Months':
            return { from: new Date(now.getFullYear(), now.getMonth() - 3, 1), to: now }
        case 'This Year':
            return { from: new Date(now.getFullYear(), 0, 1), to: now }
        case 'Lifetime':
            return { from: null, to: now }
    }
}
