import { BookOpen, Home as HomeIcon, PartyPopper } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { GroupSummary } from '../hooks/useGroups'
import { describeDue, formatNaira } from '../lib/format'
import { StatusBadge } from './StatusBadge'

const groupIconPalette = [
  { Icon: PartyPopper, bg: 'bg-gold-100', fg: 'text-gold-600' },
  { Icon: HomeIcon, bg: 'bg-green-100', fg: 'text-green-700' },
  { Icon: BookOpen, bg: 'bg-[#eee7fb]', fg: 'text-[#6c4bd6]' },
]

export function GroupCard({ group, index }: { group: GroupSummary; index: number }) {
  const { Icon, bg, fg } = groupIconPalette[index % groupIconPalette.length]

  let subtitle: string
  if (group.status === 'draft') subtitle = 'Waiting to start'
  else if (group.status === 'completed') subtitle = `All ${group.member_count} cycles done`
  else subtitle = `Cycle ${group.current_cycle} of ${group.member_count}`

  return (
    <Link
      to={`/groups/${group.id}`}
      className="mb-2.5 flex items-center gap-3 card p-3.5 hover:border-green-500"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} ${fg}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 mb-0.5 truncate text-sm font-bold">{group.name}</p>
        <p className="m-0 text-xs text-ink-soft">{subtitle}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={group.status} />
          {group.currentDueDate && group.myCurrentPending && (
            <span className="text-[0.68rem] font-semibold text-gold-600">{describeDue(group.currentDueDate)}</span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right font-mono text-sm font-bold tabular-nums">
        {formatNaira(group.contribution_amount_kobo * group.member_count)}
        <span className="block font-sans text-[0.65rem] font-normal text-ink-soft">total pot</span>
        <span className="mt-1 block text-xs text-ink-soft">
          {formatNaira(group.contribution_amount_kobo)} / {group.frequency === 'weekly' ? 'week' : 'month'} each
        </span>
      </div>
    </Link>
  )
}
