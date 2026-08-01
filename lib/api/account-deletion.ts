import { supabase } from '@/lib/supabase'

export async function requestAccountDeletion(userId: string, role: 'brand' | 'creator', reason: string) {
    const { error } = await supabase
        .from('account_deletion_requests')
        .insert({ user_id: userId, role, reason: reason || null })
    if (error) throw error
}

export async function getPendingDeletionRequest(userId: string) {
    const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('id, status, requested_at')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle()
    if (error) throw error
    return data
}