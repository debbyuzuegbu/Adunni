import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useUpdateGroup } from '../hooks/useCircleActions'
import { useGroupDetail } from '../hooks/useGroupDetail'
import { useToast } from '../lib/ToastContext'
import type { ContributionFrequency } from '../types/database'

export function EditGroup() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useGroupDetail(groupId)
  const updateGroup = useUpdateGroup()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<ContributionFrequency>('weekly')
  const [memberCount, setMemberCount] = useState('')

  useEffect(() => {
    if (!data) return
    setName(data.group.name)
    setAmount(String(data.group.contribution_amount_kobo / 100))
    setFrequency(data.group.frequency)
    setMemberCount(String(data.group.member_count))
  }, [data])

  if (isLoading || !data) {
    return <p className="text-sm text-ink-soft">Loading…</p>
  }

  const { group, members } = data
  const minMembers = Math.max(2, members.length)
  const canSubmit = name.trim() !== '' && Number(amount) > 0 && Number(memberCount) >= minMembers

  if (group.status !== 'draft') {
    return <p className="text-sm text-ink-soft">A circle's details can't be changed after it starts.</p>
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    try {
      await updateGroup.mutateAsync({
        groupId: group.id,
        name: name.trim(),
        contributionAmountKobo: Math.round(Number(amount) * 100),
        frequency,
        memberCount: Number(memberCount),
      })
      showToast('Circle updated', 'success')
      navigate(`/groups/${group.id}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't update the circle.")
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-line bg-paper-raised p-3.5 text-sm outline-none focus:border-green-500'
  const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft'

  return (
    <div>
      <Link to={`/groups/${group.id}`} className="mb-4 flex items-center gap-2.5 text-sm">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-paper-raised">
          <ArrowLeft size={14} />
        </span>
        <span className="font-bold">Cancel</span>
      </Link>

      <h1 className="m-0 mb-5 text-lg font-bold">Edit circle</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="block">
          <span className={labelClass}>Group name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>

        <label className="block">
          <span className={labelClass}>Contribution amount (₦)</span>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputClass} font-mono`}
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
          <span className={labelClass}>Members</span>
          <input
            type="number"
            min={minMembers}
            value={memberCount}
            onChange={(e) => setMemberCount(e.target.value)}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-ink-soft">
            {members.length} already joined, so the minimum is {minMembers}.
          </span>
        </label>

        <button
          type="submit"
          disabled={!canSubmit || updateGroup.isPending}
          className="mt-1 w-full rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updateGroup.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
