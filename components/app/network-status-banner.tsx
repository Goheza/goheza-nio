'use client'

import { useEffect, useRef, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

/**
 * useNetworkStatus
 *
 * navigator.onLine only tells you the OS thinks a network interface is up —
 * it stays `true` if you're connected to a router with a dead uplink. So we
 * treat it as a fast first signal, then confirm/refute it with a real probe:
 * a lightweight fetch against our own origin (a 204 endpoint, or any small
 * same-origin asset), raced against a timeout. That's the only way to know
 * the internet — not just the interface — is actually reachable.
 */
function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(true)
    const [justReconnected, setJustReconnected] = useState(false)
    const wasOffline = useRef(false)
    const checkInFlight = useRef(false)

    async function probe(): Promise<boolean> {
        if (checkInFlight.current) return isOnline
        checkInFlight.current = true
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 4000)

            // same-origin, no-store so nothing (SW/browser cache) can fake a hit
            await fetch('/favicon.ico', {
                method: 'HEAD',
                cache: 'no-store',
                signal: controller.signal,
            })

            clearTimeout(timeout)
            return true
        } catch {
            return false
        } finally {
            checkInFlight.current = false
        }
    }

    async function evaluate() {
        // If the OS already says the interface is down, trust that immediately —
        // no need to spend a request confirming what's already obvious.
        if (!navigator.onLine) {
            applyStatus(false)
            return
        }
        const reachable = await probe()
        applyStatus(reachable)
    }

    function applyStatus(online: boolean) {
        setIsOnline((prev) => {
            if (prev === online) return prev
            if (online && wasOffline.current) {
                setJustReconnected(true)
                setTimeout(() => setJustReconnected(false), 2500)
            }
            wasOffline.current = !online
            return online
        })
    }

    useEffect(() => {
        evaluate()

        const handleOnline = () => evaluate()
        const handleOffline = () => applyStatus(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Backstop: browsers don't always fire 'offline' reliably (e.g. wifi
        // stays associated but the router loses its upstream link), so we
        // re-probe periodically regardless of what the events told us.
        const interval = setInterval(evaluate, 15000)

        // Re-check the moment the tab regains focus — the most common
        // real-world case is "closed my laptop on the train, opened it back up".
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') evaluate()
        }
        document.addEventListener('visibilitychange', handleVisibility)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            document.removeEventListener('visibilitychange', handleVisibility)
            clearInterval(interval)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return { isOnline, justReconnected }
}

/**
 * NetworkStatusBanner
 *
 * Fixed to the top of the viewport, slides down on loss of connection —
 * same slide-in-from-top pattern Pinterest uses for its own offline strip.
 * Uses the dashboard's existing tokens (ink, hairline, primary gradient,
 * shadow-glow) so it reads as part of the same system, not a bolted-on alert.
 */
export function NetworkStatusBanner() {
    const { isOnline, justReconnected } = useNetworkStatus()
    const visible = !isOnline || justReconnected

    return (
        <div
            className={`fixed inset-x-0 top-0 z-[100] flex justify-center transition-transform duration-300 ease-out ${
                visible ? 'translate-y-0' : '-translate-y-full'
            }`}
            aria-live="polite"
        >
            <div
                className={`mt-3 flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold shadow-glow ${
                    !isOnline ? 'border-hairline bg-ink text-background' : 'border-hairline text-primary-foreground'
                }`}
                style={isOnline && justReconnected ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
            >
                {!isOnline ? (
                    <>
                        <WifiOff className="h-3.5 w-3.5" />
                        No internet connection
                    </>
                ) : (
                    <>
                        <Wifi className="h-3.5 w-3.5" />
                        Back online
                    </>
                )}
            </div>
        </div>
    )
}

export default NetworkStatusBanner
