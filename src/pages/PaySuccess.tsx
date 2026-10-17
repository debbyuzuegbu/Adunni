import { Check } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useGroupDetail } from '../hooks/useGroupDetail'
import { formatNaira } from '../lib/format'
import type { PaymentMethod } from '../types/database'
import { PageSkeleton } from '../components/Loading'

export function PaySuccess() {
  const { groupId } = useParams<{ groupId: string }>()
  const { state } = useLocation() as { state: { reference?: string; method?: PaymentMethod } | null }
  const { data } = useGroupDetail(groupId)

  if (!data) {
    return <PageSkeleton />
  }

  const { group } = data

  return (
    <div className="flex flex-col items-center pt-14 text-center">
      <div className="mb-5 flex h-[76px] w-[76px] items-center justify-center rounded-full bg-green-100 text-green-600">
        <Check size={32} strokeWidth={3} />
      </div>
      <h3 className="m-0 mb-1.5 text-xl font-bold">Payment confirmed</h3>
      <p className="m-0 mb-4 max-w-[28ch] text-sm text-ink-soft">
        Your {formatNaira(group.contribution_amount_kobo)} contribution to {group.name} for cycle {group.current_cycle} is
        recorded.
      </p>

      {state?.reference && (
        <div className="mb-6 w-full card p-4 text-left text-sm">
          <div className="flex justify-between py-1">
            <span className="text-ink-soft">Reference</span>
            <span className="font-mono font-semibold">{state.reference}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-ink-soft">Paid with</span>
            <span className="font-semibold">{state.method === 'bank_transfer' ? 'Bank transfer' : 'Wallet'}</span>
          </div>
        </div>
      )}

      <div className="flex w-full gap-2.5">
        <Link
          to={`/groups/${group.id}`}
          className="flex-1 rounded-xl border border-line bg-paper-raised py-3 text-sm font-bold hover:border-green-500"
        >
          View circle
        </Link>
        <Link to="/" className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700">
          Back to home
        </Link>
      </div>
    </div>
  )
}
