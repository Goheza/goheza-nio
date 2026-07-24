'use client'

import { BookOpen, Play } from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'
import { tips } from '@/components/app/creator/dash-data'


const articles = [
    { title: 'Creator best practices for 2026', time: '8 min read', tag: 'Best practices' },
    { title: 'Goheza platform updates — June', time: '4 min read', tag: 'Updates' },
    { title: 'How to write a winning application', time: '6 min read', tag: 'Goheza tips' },
]

export default function TipsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Creator Tips"
                subtitle="A learning hub of tutorials, articles, and best practices to help you grow."
            />

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {tips.map((t) => (
                    <DashCard key={t.id} className="p-0">
                        <div className="relative aspect-video overflow-hidden rounded-t-2xl bg-ink">
                            <iframe
                                src={`https://www.youtube.com/embed/${t.yt}`}
                                title={t.title}
                                className="h-full w-full"
                                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                loading="lazy"
                            />
                        </div>
                        <div className="p-5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-medium text-ink-soft">
                                <Play className="h-3 w-3" /> {t.tag}
                            </span>
                            <p className="mt-3 font-display text-base font-semibold tracking-[-0.01em] text-ink">
                                {t.title}
                            </p>
                        </div>
                    </DashCard>
                ))}
            </div>

            <DashCard>
                <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[oklch(0.55_0.18_45)]" />
                    <p className="text-sm font-semibold text-ink">Articles & Guides</p>
                </div>
                <ul className="mt-4 divide-y divide-hairline">
                    {articles.map((a) => (
                        <li key={a.title} className="flex items-center justify-between py-3">
                            <div>
                                <p className="font-semibold text-ink">{a.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {a.tag} · {a.time}
                                </p>
                            </div>
                            <button className="rounded-full border border-hairline bg-background px-4 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5">
                                Read
                            </button>
                        </li>
                    ))}
                </ul>
            </DashCard>
        </div>
    )
}