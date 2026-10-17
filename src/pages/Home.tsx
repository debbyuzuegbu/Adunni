import { CalendarClock, KeyRound, Trophy, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { GroupCard } from '../components/GroupCard'
import { useGroups } from '../hooks/useGroups'
import { daysUntil, describeDue, formatDate, formatNaira } from '../lib/format'
import { GroupCardsSkeleton } from '../components/Loading'

export function Home() {
  const { data, isLoading, error } = useGroups()
  const groups = data?.groups
  const totalSaved = data?.totalPaidKobo ?? 0
  const totalObligation = data?.totalObligationKobo ?? 0
  const progress = totalObligation > 0 ? Math.min(100, Math.round((totalSaved / totalObligation) * 100)) : 0
  const activeCount = groups?.filter((g) => g.status === 'active').length ?? 0
  const formingCount = groups?.filter((g) => g.status === 'draft').length ?? 0

  const dueSoon = (groups ?? [])
    .filter((g) => g.myCurrentPending && g.currentDueDate)
    .sort((a, b) => a.currentDueDate!.localeCompare(b.currentDueDate!))

  const nextPayout = (groups ?? [])
    .filter((g) => g.status === 'active' && g.myPayoutDate && g.myPayoutCycle && g.myPayoutCycle >= g.current_cycle)
    .sort((a, b) => a.myPayoutDate!.localeCompare(b.myPayoutDate!))[0]

  return (
    <div>
      <div className="mb-4 rounded-[1.375rem] bg-gradient-to-br from-brand-600 to-brand-900 shadow-[0_18px_40px_-18px_rgb(6_56_31/0.6)] p-5 text-white">
        <p className="m-0 mb-1.5 text-xs opacity-75">Total saved across groups</p>
        <p className="m-0 mb-3.5 font-mono text-3xl font-bold tabular-nums">{formatNaira(totalSaved)}</p>
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-gold-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="m-0 text-xs opacity-80">
          {groups && groups.length > 0
            ? [
                totalObligation > 0 ? `${progress}% of ${formatNaira(totalObligation)} committed` : null,
                activeCount > 0 ? `${activeCount} active` : null,
                formingCount > 0 ? `${formingCount} forming` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : 'No circles yet'}
        </p>
      </div>

      {nextPayout && (
        <Link
          to={`/groups/${nextPayout.id}`}
          className="mb-4 flex items-center gap-3 rounded-2xl border border-gold-line bg-gold-100 p-3.5"
        >
          <Trophy size={20} className="shrink-0 text-gold-600" />
          <span className="flex-1 text-sm">
            <span className="block font-bold">
              Your payout: {formatNaira(nextPayout.contribution_amount_kobo * nextPayout.member_count)}
            </span>
            <span className="block text-xs text-ink-soft">
              {nextPayout.name} · {formatDate(nextPayout.myPayoutDate!)}
              {daysUntil(nextPayout.myPayoutDate!) >= 0 ? ` (in ${daysUntil(nextPayout.myPayoutDate!)} days)` : ''}
            </span>
          </span>
        </Link>
      )}

      {dueSoon.length > 0 && (
        <>
          <p className="mb-2.5 section-label">Due this cycle</p>
          <div className="mb-4 card">
            {dueSoon.map((g) => {
              const overdue = daysUntil(g.currentDueDate!) < 0
              return (
                <Link
                  key={g.id}
                  to={`/groups/${g.id}`}
                  className="flex items-center gap-3 border-b border-line p-3 last:border-b-0"
                >
                  <CalendarClock size={18} className={overdue ? 'text-danger' : 'text-gold-600'} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{g.name}</span>
                    <span className={`block text-xs ${overdue ? 'text-danger' : 'text-ink-soft'}`}>
                      {describeDue(g.currentDueDate!)} · {formatDate(g.currentDueDate!)}
                    </span>
                  </span>
                  <span className="font-mono text-sm font-bold">{formatNaira(g.contribution_amount_kobo)}</span>
                </Link>
              )
            })}
          </div>
        </>
      )}

      <p className="mb-2.5 section-label">Your groups</p>

      {isLoading && <GroupCardsSkeleton />}
      {error && <p className="text-sm text-danger">Couldn't load your groups. Try again shortly.</p>}
      {!isLoading && !error && groups?.length === 0 && (
        <p className="text-sm text-ink-soft">You haven't joined any circles yet.</p>
      )}

      {groups?.map((group, i) => <GroupCard key={group.id} group={group} index={i} />)}

      <div className="mt-4 flex gap-2.5">
        <Link
          to="/groups/new"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-4 text-sm font-semibold text-ink-soft hover:border-green-500 hover:text-green-600"
        >
          <Users size={16} /> Start a circle
        </Link>
        <Link
          to="/groups/join"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-4 text-sm font-semibold text-ink-soft hover:border-green-500 hover:text-green-600"
        >
          <KeyRound size={16} /> Join a circle
        </Link>
      </div>
    </div>
  )
}
