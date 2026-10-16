import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCreateGroup } from '../hooks/useCreateGroup'
import { useToast } from '../lib/ToastContext'
import type { ContributionFrequency } from '../types/database'

export function CreateGroup() {
  const navigate = useNavigate()
  const createGroup = useCreateGroup()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<ContributionFrequency>('weekly')
  const [memberCount, setMemberCount] = useState('')

  const canSubmit = name.trim() !== '' && Number(amount) > 0 && Number(memberCount) > 1

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    try {
      const group = await createGroup.mutateAsync({
        name: name.trim(),
        contributionAmountKobo: Math.round(Number(amount) * 100),
        frequency,
        memberCount: Number(memberCount),
      })
      showToast('Circle created! Share the invite code to add members.', 'success')
      navigate(`/groups/${group.id}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't create the circle. Please try again.")
    }
  }

  return (
    <div>
      <Link to="/" className="mb-4 flex items-center gap-2.5 text-sm">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-paper-raised">
          <ArrowLeft size={14} />
        </span>
        <span className="font-bold">Cancel</span>
      </Link>

      <h1 className="m-0 mb-5 text-lg font-bold">Start a new circle</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">Group name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="December Trip Fund"
            className="w-full rounded-2xl border border-line bg-paper-raised p-3.5 text-sm outline-none focus:border-green-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">
            Contribution amount (₦)
          </span>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="20000"
            className="w-full rounded-2xl border border-line bg-paper-raised p-3.5 font-mono text-sm outline-none focus:border-green-500"
          />
        </label>

        <div className="flex gap-2">
          {(['weekly', 'monthly'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrequency(f)}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold capitalize ${
                frequency === f
                  ? 'border-green-600 bg-green-100 text-green-700'
                  : 'border-line bg-paper-raised text-ink-soft'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">Members</span>
          <input
            type="number"
            min={2}
            value={memberCount}
            onChange={(e) => setMemberCount(e.target.value)}
            placeholder="10"
            className="w-full rounded-2xl border border-line bg-paper-raised p-3.5 text-sm outline-none focus:border-green-500"
          />
        </label>

        <div className="rounded-2xl border border-line bg-paper-raised p-3.5 text-sm text-ink-soft">
          Payout order follows join order. You can rearrange or randomize it before starting, then it's locked.
        </div>

        <button
          type="submit"
          disabled={!canSubmit || createGroup.isPending}
          className="mt-1 w-full rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createGroup.isPending ? 'Creating…' : 'Create circle'}
        </button>
      </form>
    </div>
  )
}
