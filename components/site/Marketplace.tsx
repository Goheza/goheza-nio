import { useEffect, useMemo, useRef, useState } from 'react'

const contentSeeds = [
    'creator-01',
    'food-02',
    'travel-03',
    'fashion-04',
    'beauty-05',
    'tech-06',
    'fitness-07',
    'lifestyle-08',
    'product-09',
    'studio-10',
    'portrait-11',
    'street-12',
    'unbox-13',
    'kitchen-14',
    'trail-15',
    'editorial-16',
    'coffee-17',
    'desk-18',
    'wardrobe-19',
    'reels-20',
    'dance-21',
    'makeup-22',
    'gear-23',
    'vlog-24',
    'cafe-25',
    'urban-26',
    'sneaker-27',
]

const platforms = ['TikTok', 'Reels', 'Shorts'] as const

type CardData = { img: string }

export function MarketplaceStream() {
    const containerRef = useRef<HTMLDivElement>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<Array<HTMLDivElement | null>>([])
    const [width, setWidth] = useState(0)

    const items = useMemo<CardData[]>(
        () =>
            contentSeeds.map((seed) => ({
                img: `https://picsum.photos/seed/goheza-${seed}/240/360`,
            })),
        []
    )

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const update = () => setWidth(el.clientWidth)
        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    useEffect(() => {
        if (!width) return
        const prefersReduced =
            typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const isMobile = width < 640
        const cardW = isMobile ? 52 : 68
        const cardH = Math.round(cardW * (16 / 10))
        const gap = isMobile ? 6 : 8

        const step = cardW + gap
        const N = items.length
        // Ensure the pattern is wider than the viewport + one card so cards always
        // fill the visible area with no gaps.
        const period = Math.max(N * step, width + step * 2)
        const speed = isMobile ? 22 : 32 // px / s
        const amp = isMobile ? 80 : 130 // curve depth
        const overshoot = 80 // how far outside viewport the curve continues

        // apply size to cards once
        cardRefs.current.forEach((c) => {
            if (!c) return
            c.style.width = `${cardW}px`
            c.style.height = `${cardH}px`
        })

        let raf = 0
        let last = performance.now()
        let offset = 0
        let paused = false

        const el = containerRef.current
        const onEnter = () => (paused = true)
        const onLeave = () => (paused = false)
        el?.addEventListener('mouseenter', onEnter)
        el?.addEventListener('mouseleave', onLeave)

        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            if (!paused && !prefersReduced) {
                offset = (offset + speed * dt) % period
            }

            for (let i = 0; i < N; i++) {
                const c = cardRefs.current[i]
                if (!c) continue
                // raw position of card along the horizontal axis, wrapped into [0, period)
                let x = (i * step - offset) % period
                if (x < 0) x += period
                // map to viewport-space: allow overshoot on both sides
                // shift so a portion of the pattern reads as "outside left"
                const vx = x - cardW // -cardW .. period-cardW
                // t = position across viewport (0 = left edge, 1 = right edge)
                const t = vx / width
                // Smile curve: lowest in center (yPos big), higher at ends (yPos small)
                const centered = 2 * t - 1 // -1 at left, 0 at center, +1 at right
                const yPos = amp * (1 - centered * centered)
                // gentle scale: center slightly larger
                const scale = 0.88 + 0.12 * Math.max(0, 1 - Math.abs(centered))
                // fade near the edges & fully hide when way out of view
                const edgeFade = Math.max(0, Math.min(1, Math.min(t + 0.05, 1 - t + 0.05) * 3.5))
                // hide cards that are far outside the viewport
                const visible = vx > -cardW - overshoot && vx < width + overshoot
                c.style.opacity = visible ? String(edgeFade) : '0'
                c.style.transform = `translate3d(${vx}px, ${yPos}px, 0) scale(${scale})`
            }
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => {
            cancelAnimationFrame(raf)
            el?.removeEventListener('mouseenter', onEnter)
            el?.removeEventListener('mouseleave', onLeave)
        }
    }, [width, items.length])

    const isMobile = width > 0 && width < 640
    const stageH = isMobile ? 260 : 340

    return (
        <div
            ref={containerRef}
            className="relative mx-auto mt-10 w-full overflow-hidden sm:mt-14"
            style={{ height: stageH }}
            aria-hidden
        >
            <div ref={trackRef} className="absolute inset-0">
                {items.map((it, i) => (
                    <div
                        key={i}
                        ref={(el) => {
                            cardRefs.current[i] = el
                        }}
                        className="absolute left-0 top-0 overflow-hidden rounded-[10px] border border-black/5 bg-surface-elevated shadow-[0_10px_24px_-12px_rgba(15,15,20,0.25),0_2px_6px_-2px_rgba(15,15,20,0.12)] will-change-transform"
                    >
                        <img
                            src={it.img}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                            draggable={false}
                        />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
                    </div>
                ))}
            </div>
        </div>
    )
}
