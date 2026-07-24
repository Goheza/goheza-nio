'use client'

import { useEffect, useState } from 'react'
import { Copy, Gift, Share2, Loader2 } from 'lucide-react'
import { DashCard, PageHeader, StatCard } from '@/components/creator/dash-ui'
import { supabase } from '@/lib/supabase'

export default function Referrals() {
    const [username, setUsername] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData?.user) return
            const { data: profile } = await supabase
                .from('creator_profiles')
                .select('username')
                .eq('user_id', userData.user.id)
                .maybeSingle()
            if (!cancelled) {
                setUsername(profile?.username ?? null)
                setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    const link = username ? `https://goheza.com/r/${username}` : 'Set a username in your profile to get a referral link'

    return (
        <div className="space-y-6">
            <PageHeader
                title="Referral Program"
                subtitle="Invite friends to Goheza. Earn rewards when they complete their first campaign."
            />

            <DashCard className="border-dashed">
                <p className="text-xs text-muted-foreground">
                    Referral tracking isn't built yet — the stats below are placeholders. Your link is real once you have a username set.
                </p>
            </DashCard>

            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Your Referrals" value="—" tone="orange" icon={<Gift className="h-4 w-4" />} />
                <StatCard label="Total Earned" value="—" tone="green" />
                <StatCard label="Pending" value="—" tone="indigo" />
            </div>

            <DashCard>
                <p className="text-sm font-semibold text-ink">Your Referral Link</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                        readOnly
                        value={link}
                        className="flex-1 rounded-full border border-hairline bg-background px-4 py-3 text-sm text-ink"
                    />
                    <button
                        disabled={!username}
                        onClick={() => {
                            navigator.clipboard?.writeText(link)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 1500)
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-hairline bg-background px-5 py-3 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                    >
                        <Copy className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                        disabled={!username}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.02] disabled:opacity-50"
                        style={{ backgroundImage: 'var(--gradient-primary)' }}
                    >
                        <Share2 className="h-4 w-4" /> Invite Friends
                    </button>
                </div>
            </DashCard>
        </div>
    )
}