import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import type { Group } from '../types/database'

export interface GroupSummary extends Group {
  myPaidKobo: number
  myObligationKobo: number
  currentDueDate: string | null
  myCurrentPending: boolean
  myPayoutCycle: number | null
  myPayoutDate: string | null
}

export interface GroupsData {
  groups: GroupSummary[]
  totalPaidKobo: number
  totalObligationKobo: number
}

export function useGroups() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['groups', user?.id],
    queryFn: async (): Promise<GroupsData> => {
      const { data: memberships, error: membershipError } = await supabase
        .from('group_members')
        .select('id, group_id, payout_position')
        .eq('profile_id', user!.id)
      if (membershipError) throw membershipError

      const groupIds = memberships.map((m) => m.group_id)
      if (groupIds.length === 0) return { groups: [], totalPaidKobo: 0, totalObligationKobo: 0 }

      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false })
      if (groupsError) throw groupsError

      const { data: cycles, error: cyclesError } = await supabase
        .from('cycles')
        .select('*')
        .in('group_id', groupIds)
      if (cyclesError) throw cyclesError

      const memberIds = memberships.map((m) => m.id)
      const { data: myContributions, error: contribError } = await supabase
        .from('contributions')
        .select('cycle_id, amount_kobo, status')
        .in('member_id', memberIds)
      if (contribError) throw contribError

      const summaries: GroupSummary[] = groups.map((group) => {
        const membership = memberships.find((m) => m.group_id === group.id)!
        const groupCycles = cycles.filter((c) => c.group_id === group.id)
        const cycleIds = new Set(groupCycles.map((c) => c.id))
        const mine = myContributions.filter((c) => cycleIds.has(c.cycle_id))
        const currentCycle = groupCycles.find((c) => c.cycle_number === group.current_cycle)
        const myPayout = groupCycles.find((c) => c.recipient_member_id === membership.id)

        return {
          ...group,
          myPaidKobo: mine.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.amount_kobo, 0),
          myObligationKobo: group.contribution_amount_kobo * group.member_count,
          currentDueDate: group.status === 'active' ? (currentCycle?.due_date ?? null) : null,
          myCurrentPending:
            group.status === 'active' &&
            mine.some((c) => c.cycle_id === currentCycle?.id && c.status !== 'paid'),
          myPayoutCycle: myPayout?.cycle_number ?? membership.payout_position,
          myPayoutDate: myPayout?.due_date ?? null,
        }
      })

      const counted = summaries.filter((g) => g.status === 'active' || g.status === 'completed')
      return {
        groups: summaries,
        totalPaidKobo: summaries.reduce((sum, g) => sum + g.myPaidKobo, 0),
        totalObligationKobo: counted.reduce((sum, g) => sum + g.myObligationKobo, 0),
      }
    },
    enabled: !!user,
  })
}
