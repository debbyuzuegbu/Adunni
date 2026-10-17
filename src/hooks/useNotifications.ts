import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/ToastContext'
import type { AppNotification } from '../types/database'

export function useNotifications() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })
}

export function useUnreadCount() {
  const { data } = useNotifications()
  return (data ?? []).filter((n) => !n.read_at).length
}

export function useNotificationSync() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  useEffect(() => {
    if (!user) return
    supabase.rpc('refresh_my_reminders').then(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as AppNotification
          showToast(n.title, 'success')
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          if (n.group_id) queryClient.invalidateQueries({ queryKey: ['group-detail', n.group_id] })
          queryClient.invalidateQueries({ queryKey: ['groups'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, queryClient, showToast])
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (ids: string[] | 'all') => {
      let query = supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
      query = ids === 'all' ? query.eq('profile_id', user!.id) : query.in('id', ids)
      const { error } = await query
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useSetEmailReminders() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.from('profiles').update({ email_reminders: enabled }).eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  })
}
