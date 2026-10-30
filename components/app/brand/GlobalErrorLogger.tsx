'use client'
// components/app/GlobalErrorLogger.tsx
import { useEffect } from 'react'
import { logError } from '@/lib/logger'

export default function GlobalErrorLogger() {
    useEffect(() => {
        const onError = (e: ErrorEvent) =>
            logError('window.onerror', e.error ?? e.message, { file: e.filename, line: e.lineno, col: e.colno })
        const onRejection = (e: PromiseRejectionEvent) => logError('unhandledrejection', e.reason)
        window.addEventListener('error', onError)
        window.addEventListener('unhandledrejection', onRejection)
        return () => {
            window.removeEventListener('error', onError)
            window.removeEventListener('unhandledrejection', onRejection)
        }
    }, [])
    return null
}
