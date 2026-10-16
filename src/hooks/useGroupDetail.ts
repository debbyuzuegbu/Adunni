import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import type { Contribution, Cycle, Group, GroupMember, Profile } from '../types/database'

export interface MemberWithProfile extends GroupMember {
  profile: Profile | null
}

export interface GroupDetailData {
  group: Group
  members: MemberWithProfile[]
  cycles: Cycle[]
  currentCycle: Cycle | null
  contributions: Contribution[]
  allContributions: Contribution[]
  myPaidContributions: number
}

export function useGroupDetail(groupId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['group-detail', groupId, user?.id],
    queryFn: async (): Promise<GroupDetailData> => {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId!)
        .single()
      if (groupError) throw groupError

      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('*, profile:profiles(*)')
        .eq('group_id', groupId!)
        .order('payout_position', { ascending: true })
      if (membersError) throw membersError

      const { data: cycles, error: cyclesError } = await supabase
        .from('cycles')
        .select('*')
        .eq('group_id', groupId!)
        .order('cycle_number', { ascending: true })
      if (cyclesError) throw cyclesError

      const cycleIds = (cycles ?? []).map((c) => c.id)
      let allContributions: Contribution[] = []
      if (cycleIds.length > 0) {
        const { data: contribData, error: contribError } = await supabase
          .from('contributions')
          .select('*')
          .in('cycle_id', cycleIds)
        if (contribError) throw contribError
        allContributions = contribData ?? []
      }

      const currentCycle = (cycles ?? []).find((c) => c.cycle_number === group.current_cycle) ?? null
      const contributions = currentCycle
        ? allContributions.filter((c) => c.cycle_id === currentCycle.id)
        : []

      const typedMembers = (members ?? []) as unknown as MemberWithProfile[]
      const myMember = typedMembers.find((m) => m.profile_id === user?.id)
      const myPaidContributions = myMember
        ? allContributions.filter((c) => c.member_id === myMember.id && c.status === 'paid').length
        : 0

      return {
        group,
        members: typedMembers,
        cycles: cycles ?? [],
        currentCycle,
        contributions,
        allContributions,
        myPaidContributions,
      }
    },
    enabled: !!groupId,
  })
}
