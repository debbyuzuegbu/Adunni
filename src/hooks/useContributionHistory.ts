import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import type { Contribution } from '../types/database'

export interface HistoryEntry extends Contribution {
  groupId: string
  groupName: string
  cycleNumber: number
  dueDate: string
  cycleClosed: boolean
}

export function useContributionHistory() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['contribution-history', user?.id],
    queryFn: async (): Promise<HistoryEntry[]> => {
      const { data: myMembers, error: memberError } = await supabase
        .from('group_members')
        .select('id, group_id')
        .eq('profile_id', user!.id)
      if (memberError) throw memberError

      const memberIds = (myMembers ?? []).map((m) => m.id)
      if (memberIds.length === 0) return []
      const groupIds = (myMembers ?? []).map((m) => m.group_id)

      const [contribResult, cyclesResult, groupsResult] = await Promise.all([
        supabase.from('contributions').select('*').in('member_id', memberIds),
        supabase.from('cycles').select('*').in('group_id', groupIds),
        supabase.from('groups').select('id, name, current_cycle, status').in('id', groupIds),
      ])
      if (contribResult.error) throw contribResult.error
      if (cyclesResult.error) throw cyclesResult.error
      if (groupsResult.error) throw groupsResult.error

      const cycles = new Map(cyclesResult.data.map((c) => [c.id, c]))
      const groups = new Map(groupsResult.data.map((g) => [g.id, g]))

      return contribResult.data
        .map((c) => {
          const cycle = cycles.get(c.cycle_id)!
          const group = groups.get(cycle.group_id)!
          return {
            ...c,
            groupId: group.id,
            groupName: group.name,
            cycleNumber: cycle.cycle_number,
            dueDate: cycle.due_date,
            cycleClosed: cycle.paid_out,
          }
        })
        .filter((e) => {
          const group = groups.get(e.groupId)!
          return e.status === 'paid' || (group.status === 'active' && e.cycleNumber <= group.current_cycle)
        })
        .sort((a, b) => (b.paid_at ?? b.dueDate).localeCompare(a.paid_at ?? a.dueDate))
    },
    enabled: !!user,
  })
}
