import { Suspense } from 'react'
import AdminSubmissionsPage from './adminSubmissionsPage'
import { Loader2 } from 'lucide-react'

function SubmissionsLoading() {
    return (
        <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
        </div>
    )
}

export default function Page() {
    return (
        <Suspense fallback={<SubmissionsLoading />}>
            <AdminSubmissionsPage />
        </Suspense>
    )
}
