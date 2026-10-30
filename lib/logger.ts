// lib/logger.ts
export function serializeError(err: unknown) {
    if (err instanceof Error) {
        return { name: err.name, message: err.message, stack: err.stack, ...(err as any) }
    }
    // Supabase errors are plain objects: { message, code, details, hint }
    if (err && typeof err === 'object') return { ...(err as object) }
    return { message: String(err) }
}

export function logError(scope: string, err: unknown, context?: Record<string, unknown>) {
    console.groupCollapsed(`%c[ERROR] ${scope}`, 'color:#e11d48;font-weight:bold')
    console.error('error:', serializeError(err))
    if (context) console.error('context:', context)
    console.error('url:', typeof window !== 'undefined' ? window.location.href : 'server')
    console.error('time:', new Date().toISOString())
    console.groupEnd()
    // TODO: send to Sentry / your own endpoint here, e.g. Sentry.captureException(err)
}

export function logInfo(scope: string, ...args: unknown[]) {
    console.log(`%c[${scope}]`, 'color:#0ea5e9', ...args)
}

/** Wrap any async fn so it can never fail silently. */
export function safe<T extends any[], R>(scope: string, fn: (...a: T) => Promise<R>) {
    return async (...args: T): Promise<R | undefined> => {
        try {
            return await fn(...args)
        } catch (e) {
            logError(scope, e, { args })
            return undefined
        }
    }
}

/** Always returns a readable string, even for Supabase's plain-object errors. */
export function toMessage(err: unknown): string {
    if (err instanceof Error) return err.message
    if (err && typeof err === 'object') {
        const e = err as any
        const parts = [e.message, e.code && `code=${e.code}`, e.details && `details=${e.details}`, e.hint && `hint=${e.hint}`]
        const text = parts.filter(Boolean).join(' | ')
        return text || JSON.stringify(err)
    }
    return String(err)
}