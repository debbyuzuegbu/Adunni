import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import type { ContributionFrequency } from '../types/database'

interface CreateGroupInput {
  name: string
  contributionAmountKobo: number
  frequency: ContributionFrequency
  memberCount: number
}

export function useCreateGroup() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateGroupInput) => {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: input.name,
          created_by: user!.id,
          contribution_amount_kobo: input.contributionAmountKobo,
          frequency: input.frequency,
          member_count: input.memberCount,
        })
        .select()
        .single()
      if (groupError) throw groupError

      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, profile_id: user!.id, payout_position: 1 })
      if (memberError) throw memberError

      return group
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}
