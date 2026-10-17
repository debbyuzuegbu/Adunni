import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useJoinGroup } from '../hooks/useJoinGroup'
import { useToast } from '../lib/ToastContext'

export function JoinGroup() {
  const navigate = useNavigate()
  const params = useParams<{ code: string }>()
  const joinGroup = useJoinGroup()
  const { showToast } = useToast()
  const [code, setCode] = useState((params.code ?? '').toUpperCase().slice(0, 6))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const group = await joinGroup.mutateAsync(code.trim())
      showToast('Joined the circle!', 'success')
      navigate(`/groups/${group.id}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not join this circle.')
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

      <h1 className="m-0 mb-2 text-lg font-bold">Join a circle</h1>
      <p className="m-0 mb-5 text-sm text-ink-soft">
        {params.code
          ? 'You were invited to a savings circle. Check the code and tap Join.'
          : 'Enter the invite code someone shared with you.'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1.5 block section-label">Invite code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XJ4R9K"
            maxLength={6}
            className="field text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-green-500"
          />
        </label>

        <button
          type="submit"
          disabled={code.trim().length === 0 || joinGroup.isPending}
          className="mt-1 w-full rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {joinGroup.isPending ? 'Joining…' : 'Join circle'}
        </button>
      </form>
    </div>
  )
}
