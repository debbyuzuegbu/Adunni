import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

export function useWalletTransactions() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['wallet-transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('profile_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })
}

export function useTopUpWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (amountKobo: number) => {
      const { data, error } = await supabase.rpc('mock_top_up_wallet', { amount_kobo: amountKobo })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] })
    },
  })
}
