'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Building2, DollarSign, Heart, Lock, Megaphone, ShieldCheck, Unlock, Users } from 'lucide-react'

const STORAGE_KEY = 'goheza_admin_gate_passed'
const PASS_TTL_MS = 1000 * 60 * 60 * 8 // gate stays open for 8 hours per browser session
const MAX_LIVES = 3
const LOCKOUT_SECONDS = 10

type StageProps = { onPass: () => void; onFail: (msg?: string) => void }

const FAIL_LINES = [
    'Wrong. The guard wrote your name on a clipboard.',
    'Denied. A creator would have gotten that right.',
    'Incorrect. The guard is pretending not to laugh.',
    'No. Try to look more like an admin.',
    'Failed. Somewhere, a moderator sighed.',
]
const PASS_LINES = [
    'Trial passed. The guard is suspicious but tired.',
    'Correct. Nobody is more surprised than the guard.',
    'Cleared. The clipboard has been lowered.',
    'Passed. Your paperwork is somehow in order.',
]
const LOCKOUT_LINES = [
    'Out of lives. The guard has gone to lunch and locked the door.',
    'Out of lives. Please reflect on your choices.',
]

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const shuffle = <T,>(arr: T[]) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

/* -------------------------------------------------------------------------- */
/*  Public wrapper                                                            */
/* -------------------------------------------------------------------------- */

export function AdminGate({ children, adminName }: { children: React.ReactNode; adminName?: string }) {
    const [state, setState] = useState<'checking' | 'locked' | 'open'>('checking')

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY)
            if (raw && Date.now() - Number(raw) < PASS_TTL_MS) {
                setState('open')
                return
            }
        } catch {}
        setState('locked')
    }, [])

    if (state === 'checking') return null
    if (state === 'open') return <>{children}</>

    return (
        <GateWall
            adminName={adminName}
            onPassed={() => {
                try {
                    sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
                } catch {}
                setState('open')
            }}
        />
    )
}

/* -------------------------------------------------------------------------- */
/*  Wall: progress, lives, stage switching, lockout                           */
/* -------------------------------------------------------------------------- */

const STAGES = [
    { title: 'Trial 1: Prove you are not a bot', hint: 'Click the button that says you are an admin. It has opinions.' },
    { title: 'Trial 2: Memory of a goldfish, upgraded', hint: 'Watch the pads light up, then repeat the sequence. It gets longer.' },
    { title: 'Trial 3: Judgement exam', hint: 'Answer like someone who has actually done this job.' },
    { title: 'Trial 4: Wallet sync', hint: 'Stop the needle inside the green window. The window shrinks and the needle speeds up.' },
    { title: 'Trial 5: The oath', hint: 'Type the oath exactly as written. Pasting is disabled.' },
]
const LAST_STAGE = STAGES.length - 1

function GateWall({ adminName, onPassed }: { adminName?: string; onPassed: () => void }) {
    const [stage, setStage] = useState(0)
    const [attempt, setAttempt] = useState(0)
    const [lives, setLives] = useState(MAX_LIVES)
    const [note, setNote] = useState('')
    const [shake, setShake] = useState(0)
    const [lockLeft, setLockLeft] = useState(0)
    const [granted, setGranted] = useState(false)
    const livesRef = useRef(MAX_LIVES)

    const fail = useCallback((msg?: string) => {
        setShake((s) => s + 1)
        livesRef.current -= 1
        setLives(livesRef.current)
        if (livesRef.current <= 0) {
            setLockLeft(LOCKOUT_SECONDS)
            setNote(pick(LOCKOUT_LINES))
        } else {
            setNote(msg ?? pick(FAIL_LINES))
        }
    }, [])

    const pass = useCallback(() => {
        setNote(pick(PASS_LINES))
        if (stage === LAST_STAGE) {
            setGranted(true)
            setTimeout(onPassed, 1800)
        } else {
            setStage((s) => s + 1)
        }
    }, [stage, onPassed])

    useEffect(() => {
        if (lockLeft <= 0) return
        const t = setTimeout(() => {
            if (lockLeft === 1) {
                livesRef.current = MAX_LIVES
                setLives(MAX_LIVES)
                setStage(0)
                setAttempt((a) => a + 1)
                setNote('Checkpoint reset. Try to be someone else this time.')
            }
            setLockLeft((l) => l - 1)
        }, 1000)
        return () => clearTimeout(t)
    }, [lockLeft])

    const greeting = adminName ? `${adminName}, ` : ''

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[oklch(0.965_0.012_78)] p-4">
            <style>{`
                @keyframes gate-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(9px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(4px)} }
                .gate-shake { animation: gate-shake 0.45s ease-in-out }
                @media (prefers-reduced-motion: reduce) { .gate-shake { animation: none } }
            `}</style>

            <div
                key={shake}
                className={`w-full max-w-xl rounded-[24px] border border-hairline bg-surface-elevated p-6 shadow-elevated sm:p-8 ${
                    shake > 0 ? 'gate-shake' : ''
                }`}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            {granted ? <Unlock className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                        </span>
                        <div>
                            <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">
                                Admin Security Checkpoint
                            </h1>
                            <p className="text-[13px] text-muted-foreground">
                                {greeting}five trials stand between you and the dashboard.
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-1" aria-label={`${lives} lives left`}>
                        {Array.from({ length: MAX_LIVES }).map((_, i) => (
                            <Heart
                                key={i}
                                className={`h-5 w-5 ${i < lives ? 'fill-current text-[oklch(0.62_0.2_25)]' : 'text-ink/20'}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex gap-1.5" aria-hidden>
                    {STAGES.map((_, i) => (
                        <span
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                                granted || i < stage ? 'bg-ink' : i === stage ? 'bg-ink/40' : 'bg-ink/10'
                            }`}
                        />
                    ))}
                </div>

                <div className="mt-6">
                    {granted ? (
                        <div className="py-10 text-center">
                            <Unlock className="mx-auto h-10 w-10 text-ink" />
                            <h2 className="font-display mt-4 text-2xl font-semibold text-ink">Access granted</h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                The guard has stamped your hand. Opening the dashboard.
                            </p>
                        </div>
                    ) : lockLeft > 0 ? (
                        <div className="py-10 text-center">
                            <Lock className="mx-auto h-10 w-10 text-ink" />
                            <h2 className="font-display mt-4 text-2xl font-semibold text-ink">Locked out</h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Back to Trial 1 in {lockLeft} {lockLeft === 1 ? 'second' : 'seconds'}.
                            </p>
                        </div>
                    ) : (
                        <>
                            <h2 className="font-display text-lg font-semibold text-ink">{STAGES[stage].title}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{STAGES[stage].hint}</p>
                            <div className="mt-5" key={`${attempt}-${stage}`}>
                                {stage === 0 && <RunawayStage onPass={pass} onFail={fail} />}
                                {stage === 1 && <MemoryStage onPass={pass} onFail={fail} />}
                                {stage === 2 && <ExamStage onPass={pass} onFail={fail} />}
                                {stage === 3 && <TimingStage onPass={pass} onFail={fail} />}
                                {stage === 4 && <OathStage onPass={pass} onFail={fail} />}
                            </div>
                        </>
                    )}
                </div>

                <p className="mt-6 min-h-[20px] text-[13px] text-ink-soft" aria-live="polite">
                    {note}
                </p>
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*  Trial 1: the button that dodges                                           */
/* -------------------------------------------------------------------------- */

const RUNAWAY_LINES = ['I am an admin', 'I swear I am', 'Please?', 'I have a badge', 'Fine, it is too tired to run']
const MAX_DODGES = 5

function RunawayStage({ onPass, onFail }: StageProps) {
    const [dodges, setDodges] = useState(0)
    const [pos, setPos] = useState({ x: 50, y: 40 })
    const tired = dodges >= MAX_DODGES

    const dodge = () => {
        if (tired) return
        setDodges((d) => d + 1)
        setPos({ x: 24 + Math.random() * 52, y: 15 + Math.random() * 55 })
    }

    return (
        <div className="relative h-56 overflow-hidden rounded-2xl border border-hairline bg-background">
            <button
                onPointerEnter={dodge}
                onClick={() => tired && onPass()}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-[left,top] duration-200"
            >
                <span className="absolute inset-0 rounded-full" style={{ backgroundImage: 'var(--gradient-primary)' }} />
                <span className="relative">{RUNAWAY_LINES[Math.min(dodges, MAX_DODGES)]}</span>
            </button>
            <button
                onClick={() => onFail('Noted. Free products are not a valid admin qualification.')}
                className="absolute bottom-3 left-3 rounded-full border border-hairline bg-surface-elevated px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-ink/5"
            >
                I am only here for free products
            </button>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*  Trial 2: sequence memory                                                  */
/* -------------------------------------------------------------------------- */

const PADS = [
    { label: 'Brands', icon: Building2 },
    { label: 'Creators', icon: Users },
    { label: 'Campaigns', icon: Megaphone },
    { label: 'Invoices', icon: DollarSign },
]
const START_LEN = 3
const MAX_LEN = 6

function MemoryStage({ onPass, onFail }: StageProps) {
    const [seq] = useState(() => Array.from({ length: MAX_LEN }, () => Math.floor(Math.random() * PADS.length)))
    const [len, setLen] = useState(START_LEN)
    const [replay, setReplay] = useState(0)
    const [phase, setPhase] = useState<'show' | 'input'>('show')
    const [lit, setLit] = useState<number | null>(null)
    const [inputIdx, setInputIdx] = useState(0)

    useEffect(() => {
        setPhase('show')
        setInputIdx(0)
        const timers: ReturnType<typeof setTimeout>[] = []
        seq.slice(0, len).forEach((p, i) => {
            timers.push(setTimeout(() => setLit(p), 700 + i * 700))
            timers.push(setTimeout(() => setLit(null), 700 + i * 700 + 450))
        })
        timers.push(setTimeout(() => setPhase('input'), 700 + len * 700))
        return () => timers.forEach(clearTimeout)
    }, [len, seq, replay])

    const press = (p: number) => {
        if (phase !== 'input') return
        setLit(p)
        setTimeout(() => setLit(null), 150)
        if (p !== seq[inputIdx]) {
            onFail('Wrong pad. The sequence will replay, the guard will not forget.')
            setReplay((r) => r + 1)
            return
        }
        if (inputIdx + 1 === len) {
            if (len === MAX_LEN) onPass()
            else setLen((l) => l + 1)
        } else {
            setInputIdx((i) => i + 1)
        }
    }

    return (
        <div>
            <div className="grid grid-cols-2 gap-3">
                {PADS.map((pad, i) => {
                    const Icon = pad.icon
                    const on = lit === i
                    return (
                        <button
                            key={pad.label}
                            onClick={() => press(i)}
                            disabled={phase !== 'input'}
                            className={`flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-colors ${
                                on
                                    ? 'border-transparent text-primary-foreground'
                                    : 'border-hairline bg-background text-ink-soft hover:bg-ink/5'
                            }`}
                            style={on ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
                        >
                            <Icon className="h-5 w-5" />
                            {pad.label}
                        </button>
                    )
                })}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
                {phase === 'show' ? 'Watching…' : `Your turn: ${inputIdx + 1} of ${len}`} (round {len - START_LEN + 1} of{' '}
                {MAX_LEN - START_LEN + 1})
            </p>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*  Trial 3: judgement exam                                                   */
/* -------------------------------------------------------------------------- */

const QUESTIONS = [
    {
        q: 'A creator submits a TikTok at 03:00 with 0 views and the caption "first!!". Your move?',
        options: [
            'Approve it, the vibes are good',
            'Check it against the campaign brief and screening rules',
            'Ask the creator to post it again but louder',
            'Forward it to your cousin for a second opinion',
        ],
        answer: 1,
    },
    {
        q: 'An invoice totals UGX 0. The brand says the payment is "exposure". You:',
        options: [
            'Mark it paid, exposure is a currency',
            'Hold it and confirm the real amount with the brand',
            'Pay the creator in exposure as well',
            'Delete the invoice and hope',
        ],
        answer: 1,
    },
    {
        q: 'Which of these is NOT an admin responsibility?',
        options: [
            'Screening submissions',
            'Reviewing campaign applications',
            'Filming a dance trend in the office for the brand',
            'Checking wallet and earnings',
        ],
        answer: 2,
    },
    {
        q: 'A brand asks to see every creator\'s phone number "for convenience". You:',
        options: [
            'Send a spreadsheet, they said please',
            'Decline and keep contact through the platform',
            'Send only the creators you dislike',
            'Ask the brand for their phone number first, fair is fair',
        ],
        answer: 1,
    },
]

function ExamStage({ onPass, onFail }: StageProps) {
    const [idx, setIdx] = useState(0)
    const orders = useMemo(() => QUESTIONS.map((q) => shuffle(q.options.map((_, i) => i))), [])
    const q = QUESTIONS[idx]

    const choose = (optIdx: number) => {
        if (optIdx === q.answer) {
            if (idx === QUESTIONS.length - 1) onPass()
            else setIdx((i) => i + 1)
        } else {
            onFail()
        }
    }

    return (
        <div>
            <p className="text-xs text-muted-foreground">
                Question {idx + 1} of {QUESTIONS.length}
            </p>
            <p className="mt-1 text-[15px] font-medium text-ink">{q.q}</p>
            <div className="mt-4 flex flex-col gap-2">
                {orders[idx].map((optIdx) => (
                    <button
                        key={optIdx}
                        onClick={() => choose(optIdx)}
                        className="rounded-xl border border-hairline bg-background px-4 py-3 text-left text-sm text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
                    >
                        {q.options[optIdx]}
                    </button>
                ))}
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*  Trial 4: timing bar                                                       */
/* -------------------------------------------------------------------------- */

const ZONE_WIDTHS = [24, 16, 10]

function TimingStage({ onPass, onFail }: StageProps) {
    const [round, setRound] = useState(0)
    const [pos, setPos] = useState(0)
    const posRef = useRef(0)
    const dirRef = useRef(1)
    const width = ZONE_WIDTHS[round]
    const start = useMemo(() => 10 + Math.random() * (80 - width), [round, width])

    useEffect(() => {
        let raf = 0
        let last = performance.now()
        const speed = 60 + round * 40 // percent per second
        const tick = (t: number) => {
            const dt = (t - last) / 1000
            last = t
            let p = posRef.current + dirRef.current * speed * dt
            if (p >= 100) {
                p = 100
                dirRef.current = -1
            } else if (p <= 0) {
                p = 0
                dirRef.current = 1
            }
            posRef.current = p
            setPos(p)
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [round])

    const stop = () => {
        const p = posRef.current
        if (p >= start && p <= start + width) {
            if (round === ZONE_WIDTHS.length - 1) onPass()
            else setRound((r) => r + 1)
        } else {
            onFail('Missed. The wallet is now out of sync and slightly offended.')
        }
    }

    return (
        <div>
            <div className="relative h-12 overflow-hidden rounded-full border border-hairline bg-background">
                <div
                    className="absolute inset-y-0 border-x border-emerald-600/50 bg-emerald-500/30"
                    style={{ left: `${start}%`, width: `${width}%` }}
                />
                <div className="absolute inset-y-0 w-1.5 -translate-x-1/2 rounded-full bg-ink" style={{ left: `${pos}%` }} />
            </div>
            <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                    Sync {round + 1} of {ZONE_WIDTHS.length}
                </span>
                <button
                    onClick={stop}
                    className="rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm"
                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                >
                    Stop
                </button>
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*  Trial 5: the oath                                                         */
/* -------------------------------------------------------------------------- */

const OATH = 'I solemnly swear to screen every submission before approving it, and to never approve invoices at 3AM.'

function OathStage({ onPass, onFail }: StageProps) {
    const [value, setValue] = useState('')

    const submit = () => {
        if (value.trim() === OATH) onPass()
        else onFail('The oath does not match. Capitals, commas and the full stop all count.')
    }

    return (
        <div>
            <blockquote className="rounded-2xl border border-hairline bg-background p-4 text-sm leading-relaxed text-ink select-none">
                {OATH}
            </blockquote>
            <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onPaste={(e) => {
                    e.preventDefault()
                    onFail('Pasting detected. The oath must be typed by hand.')
                }}
                onDrop={(e) => e.preventDefault()}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                rows={3}
                placeholder="Type the oath here"
                className="mt-3 w-full resize-none rounded-2xl border border-hairline bg-background p-4 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
                onClick={submit}
                className="mt-3 w-full rounded-full py-2.5 text-sm font-semibold text-primary-foreground shadow-sm"
                style={{ backgroundImage: 'var(--gradient-primary)' }}
            >
                Swear and enter
            </button>
        </div>
    )
}