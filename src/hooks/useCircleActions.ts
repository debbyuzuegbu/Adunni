import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ContributionFrequency } from '../types/database'

function useInvalidateGroup() {
  const queryClient = useQueryClient()
  return (groupId: string) => {
    queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] })
    queryClient.invalidateQueries({ queryKey: ['groups'] })
    queryClient.invalidateQueries({ queryKey: ['contribution-history'] })
  }
}

export function useStartCircle() {
  const invalidate = useInvalidateGroup()
  return useMutation({
    mutationFn: async (input: { groupId: string; startDate: string; shuffle: boolean }) => {
      const { error } = await supabase.rpc('start_circle', {
        target_group: input.groupId,
        start_date: input.startDate,
        shuffle: input.shuffle,
      })
      if (error) throw error
    },
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  })
}

export function useSetContributionReceived() {
  const invalidate = useInvalidateGroup()
  return useMutation({
    mutationFn: async (input: { groupId: string; contributionId: string; received: boolean }) => {
      const { error } = await supabase.rpc('set_contribution_received', {
        target_contribution: input.contributionId,
        received: input.received,
      })
      if (error) throw error
    },
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  })
}

export function useCompleteCycle() {
  const invalidate = useInvalidateGroup()
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { data, error } = await supabase.rpc('complete_current_cycle', { target_group: groupId })
      if (error) throw error
      return data
    },
    onSuccess: (_data, groupId) => invalidate(groupId),
  })
}

export function useLeaveGroup() {
  const invalidate = useInvalidateGroup()
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.rpc('leave_group', { target_group: groupId })
      if (error) throw error
    },
    onSuccess: (_data, groupId) => invalidate(groupId),
  })
}

export function useRemoveMember() {
  const invalidate = useInvalidateGroup()
  return useMutation({
    mutationFn: async (input: { groupId: string; memberId: string }) => {
      const { error } = await supabase.rpc('remove_member', { target_member: input.memberId })
      if (error) throw error
    },
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  })
}

export function useMoveMember() {
  const invalidate = useInvalidateGroup()
  return useMutation({
    mutationFn: async (input: { groupId: string; memberId: string; direction: -1 | 1 }) => {
      const { error } = await supabase.rpc('move_member', {
        target_member: input.memberId,
        direction: input.direction,
      })
      if (error) throw error
    },
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  })
}

export function useUpdateGroup() {
  const invalidate = useInvalidateGroup()
  return useMutation({
    mutationFn: async (input: {
      groupId: string
      name: string
      contributionAmountKobo: number
      frequency: ContributionFrequency
      memberCount: number
    }) => {
      const { error } = await supabase
        .from('groups')
        .update({
          name: input.name,
          contribution_amount_kobo: input.contributionAmountKobo,
          frequency: input.frequency,
          member_count: input.memberCount,
        })
        .eq('id', input.groupId)
      if (error) throw error
    },
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  })
}
