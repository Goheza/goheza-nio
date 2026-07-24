import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types/notification'

export async function listNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Notification[]
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) throw error
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) throw error
}

export async function createNotification(input: Omit<Notification, 'id' | 'read' | 'created_at'>): Promise<void> {
  const { error } = await supabase.from('notifications').insert({ ...input, read: false })
  if (error) throw error
}
