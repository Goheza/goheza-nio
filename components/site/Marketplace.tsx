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
        // Slightly wider cards on mobile so they read clearly at arm's length,
        // tighter gap so more of them are visible on a narrow screen at once.
        const cardW = isMobile ? 64 : 68
        const cardH = Math.round(cardW * (16 / 10))
        const gap = isMobile ? 8 : 8

        const step = cardW + gap
        const N = items.length
        const period = Math.max(N * step, width + step * 2)
        // Slower on mobile — fast horizontal motion in a small viewport reads as jittery.
        const speed = isMobile ? 16 : 32
        // Shallower curve on mobile so cards don't swing outside the shorter stage height.
        const amp = isMobile ? 46 : 130
        const overshoot = isMobile ? 40 : 80

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
                let x = (i * step - offset) % period
                if (x < 0) x += period
                const vx = x - cardW
                const t = vx / width
                const centered = 2 * t - 1
                const yPos = amp * (1 - centered * centered)
                const scale = 0.88 + 0.12 * Math.max(0, 1 - Math.abs(centered))
                const edgeFade = Math.max(0, Math.min(1, Math.min(t + 0.05, 1 - t + 0.05) * 3.5))
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
    // Shorter stage on mobile now pairs with the shallower amp above, so cards
    // never get clipped at the top/bottom of the container.
    const stageH = isMobile ? 170 : 240

    return (
        <div
            ref={containerRef}
            className="relative mx-auto mt-10 w-full overflow-hidden px-3 sm:mt-14 sm:px-0"
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