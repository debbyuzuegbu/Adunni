import { KeyRound, Search, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GroupCard } from '../components/GroupCard'
import { useGroups } from '../hooks/useGroups'
import type { GroupStatus } from '../types/database'
import { GroupCardsSkeleton } from '../components/Loading'

const filters: { key: 'all' | GroupStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Forming' },
  { key: 'completed', label: 'Completed' },
]

export function Groups() {
  const { data, isLoading, error } = useGroups()
  const [filter, setFilter] = useState<'all' | GroupStatus>('all')
  const [query, setQuery] = useState('')

  const groups = (data?.groups ?? []).filter(
    (g) =>
      (filter === 'all' || g.status === filter) && g.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div>
      <div className="mb-3 flex gap-2.5">
        <Link
          to="/groups/new"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700"
        >
          <Users size={16} /> Start a circle
        </Link>
        <Link
          to="/groups/join"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-paper-raised py-3 text-sm font-bold hover:border-green-500"
        >
          <KeyRound size={16} /> Join with code
        </Link>
      </div>

      <label className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-paper-raised px-3 py-2.5 focus-within:border-green-500">
        <Search size={16} className="text-ink-soft" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search circles"
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </label>

      <div className="mb-4 flex gap-1.5 overflow-x-auto">
        {filters.map((f) => {
          const count = f.key === 'all' ? data?.groups.length : data?.groups.filter((g) => g.status === f.key).length
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                filter === f.key
                  ? 'border-green-600 bg-green-100 text-green-700'
                  : 'border-line bg-paper-raised text-ink-soft'
              }`}
            >
              {f.label}
              {count ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      {isLoading && <GroupCardsSkeleton />}
      {error && <p className="text-sm text-danger">Couldn't load your groups. Try again shortly.</p>}
      {!isLoading && !error && groups.length === 0 && (
        <p className="text-sm text-ink-soft">
          {data?.groups.length ? 'No circles match.' : "You haven't joined any circles yet."}
        </p>
      )}

      {groups.map((group, i) => <GroupCard key={group.id} group={group} index={i} />)}
    </div>
  )
}
