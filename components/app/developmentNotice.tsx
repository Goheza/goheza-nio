export function DevelopmentNotice() {
    return (
        <div className="mb-6 rounded-xl border border-hairline bg-background px-4 py-3">
            <p className="text-sm font-semibold text-ink">
                Under Development
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                This page is currently under development and is
                available for testing purposes only. The figures and other
                information shown here are not final and should not be relied
                upon.
            </p>
        </div>
    )
}