import { AlertCircle, Check, Clock, Receipt } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useContributionHistory } from '../hooks/useContributionHistory'
import { daysUntil, formatDate, formatNaira } from '../lib/format'
import { ListSkeleton } from '../components/Loading'
import { EmptyState } from '../components/EmptyState'

export function History() {
  const { data: entries, isLoading, error } = useContributionHistory()
  const [groupFilter, setGroupFilter] = useState('all')

  const groupOptions = [...new Map((entries ?? []).map((e) => [e.groupId, e.groupName])).entries()]
  const visible = (entries ?? []).filter((e) => groupFilter === 'all' || e.groupId === groupFilter)
  const paid = visible.filter((e) => e.status === 'paid')
  const outstanding = visible.filter((e) => e.status !== 'paid')
  const paidTotal = paid.reduce((s, e) => s + e.amount_kobo, 0)
  const outstandingTotal = outstanding.reduce((s, e) => s + e.amount_kobo, 0)

  return (
    <div>
      {(entries?.length ?? 0) > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <div className="card p-3.5">
            <p className="m-0 text-xs text-ink-soft">Paid</p>
            <p className="m-0 font-mono text-lg font-bold text-green-600">{formatNaira(paidTotal)}</p>
          </div>
          <div className="card p-3.5">
            <p className="m-0 text-xs text-ink-soft">Outstanding</p>
            <p className="m-0 font-mono text-lg font-bold">{formatNaira(outstandingTotal)}</p>
          </div>
        </div>
      )}

      {groupOptions.length > 1 && (
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="mb-4 w-full rounded-xl border border-line bg-paper-raised p-2.5 text-sm outline-none focus:border-green-500"
        >
          <option value="all">All circles</option>
          {groupOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      )}

      {isLoading && <ListSkeleton />}
      {error && <p className="text-sm text-danger">Couldn't load your history.</p>}
      {!isLoading && !error && visible.length === 0 && (
        <EmptyState
          Icon={Receipt}
          title="No contributions yet"
          message="Your payments will appear here once one of your circles starts."
          action={{ to: '/groups', label: 'View my circles' }}
        />
      )}

      {outstanding.length > 0 && (
        <>
          <p className="mb-2.5 section-label">Outstanding</p>
          <div className="mb-4 card">
            {outstanding.map((e) => {
              const overdue = daysUntil(e.dueDate) < 0
              return (
                <Link
                  key={e.id}
                  to={`/groups/${e.groupId}`}
                  className="flex items-center justify-between border-b border-line p-3.5 last:border-b-0"
                >
                  <div>
                    <p className="m-0 text-sm font-semibold">{e.groupName}</p>
                    <p className="m-0 text-xs text-ink-soft">
                      Cycle {e.cycleNumber} · due {formatDate(e.dueDate)}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1 text-sm font-bold ${overdue ? 'text-danger' : 'text-gold-600'}`}>
                    {overdue ? <AlertCircle size={14} /> : <Clock size={14} />}
                    {formatNaira(e.amount_kobo)}
                  </span>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {paid.length > 0 && (
        <>
          <p className="mb-2.5 section-label">Paid</p>
          <div className="card">
            {paid.map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b border-line p-3.5 last:border-b-0">
                <div>
                  <p className="m-0 text-sm font-semibold">{e.groupName}</p>
                  <p className="m-0 text-xs text-ink-soft">
                    Cycle {e.cycleNumber}
                    {e.paid_at ? ` · ${formatDate(e.paid_at)}` : ''}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-sm font-bold text-green-600">
                  <Check size={14} strokeWidth={3} /> {formatNaira(e.amount_kobo)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
