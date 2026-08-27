'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
    AdminEarningsBreadcrumb,
    AdminBrandGrid,
    AdminCampaignGrid,
    AdminCreatorGrid,
    AdminCreatorEntryList,
} from '@/components/app/admin/earnings-nav'
import { getAdminEarningsTree, manualSettleCreator } from '@/lib/api/admin-earnings'
import type { AdminBrandSummary, AdminCampaignSummary, AdminCreatorSummary } from '@/types/admin-earnings'
import { ManualSettleModal } from '@/components/app/admin/manual-settle-modal'
import { DevelopmentNotice } from '@/components/app/developmentNotice'

export default function AdminEarningsPage() {
    const [brands, setBrands] = useState<AdminBrandSummary[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    const [selectedBrand, setSelectedBrand] = useState<AdminBrandSummary | null>(null)
    const [selectedCampaign, setSelectedCampaign] = useState<AdminCampaignSummary | null>(null)
    const [selectedCreator, setSelectedCreator] = useState<AdminCreatorSummary | null>(null)
    const [settlingCreator, setSettlingCreator] = useState<AdminCreatorSummary | null>(null)

    async function load() {
        setBrands(await getAdminEarningsTree())
    }

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                await load()
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load earnings.')
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    const liveBrand = selectedBrand ? brands?.find((b) => b.brandUserId === selectedBrand.brandUserId) ?? null : null
    const liveCampaign =
        liveBrand && selectedCampaign
            ? liveBrand.campaigns.find((c) => c.campaignId === selectedCampaign.campaignId) ?? null
            : null
    const liveCreator =
        liveCampaign && selectedCreator
            ? liveCampaign.creators.find((c) => c.creatorId === selectedCreator.creatorId) ?? null
            : null

    if (error) return <p className="py-8 text-center text-sm text-muted-foreground">{error}</p>
    if (!brands) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <DevelopmentNotice/>
            <header>
                <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Earnings</h1>
                <p className="text-sm text-muted-foreground">
                    Brand → campaign → creator earnings ledger, and manual payout reconciliation.
                </p>
            </header>

            <AdminEarningsBreadcrumb
                brand={liveBrand}
                campaign={liveCampaign}
                creator={liveCreator}
                onReset={() => {
                    setSelectedBrand(null)
                    setSelectedCampaign(null)
                    setSelectedCreator(null)
                }}
                onSelectBrand={() => {
                    setSelectedCampaign(null)
                    setSelectedCreator(null)
                }}
                onSelectCampaign={() => setSelectedCreator(null)}
            />

            {!liveBrand && <AdminBrandGrid brands={brands} onSelect={setSelectedBrand} />}
            {liveBrand && !liveCampaign && <AdminCampaignGrid brand={liveBrand} onSelect={setSelectedCampaign} />}
            {liveCampaign && !liveCreator && (
                <AdminCreatorGrid campaign={liveCampaign} onSelect={setSelectedCreator} onSettle={setSettlingCreator} />
            )}
            {liveCreator && <AdminCreatorEntryList creator={liveCreator} />}

            {settlingCreator && (
                <ManualSettleModal
                    creatorName={settlingCreator.creatorName}
                    onClose={() => setSettlingCreator(null)}
                    onConfirm={async (amount, notes) => {
                        const {
                            data: { user },
                        } = await supabase.auth.getUser()
                        if (!user) throw new Error('Not signed in.')
                        const result = await manualSettleCreator(settlingCreator.creatorId, amount, user.id, notes)
                        await load()
                        setSettlingCreator(null)
                        return result
                    }}
                />
            )}
        </div>
    )
}
