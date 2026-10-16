import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PaymentMethod } from '../types/database'

interface PayContributionInput {
  contributionId: string
  method: PaymentMethod
  groupId: string
}

export function usePayContribution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ contributionId, method }: PayContributionInput) => {
      const { data, error } = await supabase.rpc('mock_pay_contribution', {
        target_contribution: contributionId,
        pay_method: method,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', variables.groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['contribution-history'] })
    },
  })
}
