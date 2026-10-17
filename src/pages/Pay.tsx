import { ArrowLeft, Building2, Copy, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TestModeBadge } from '../components/TestModeBadge'
import { useGroupDetail } from '../hooks/useGroupDetail'
import { usePayContribution } from '../hooks/usePayContribution'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../lib/AuthContext'
import { describeDue, formatNaira } from '../lib/format'
import { useToast } from '../lib/ToastContext'
import type { PaymentMethod } from '../types/database'
import { PageSkeleton } from '../components/Loading'

const TEST_ACCOUNT = { bank: 'Adunni Test Bank', number: '0123456789', name: 'Adunni Collections' }

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function Pay() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data } = useGroupDetail(groupId)
  const { data: profile } = useProfile()
  const payContribution = usePayContribution()
  const { showToast } = useToast()
  const [method, setMethod] = useState<PaymentMethod>('wallet')
  const [processing, setProcessing] = useState(false)

  if (!data) {
    return <PageSkeleton />
  }

  const { group, members, contributions, currentCycle } = data
  const myMember = members.find((m) => m.profile_id === user?.id)
  const myContribution = contributions.find((c) => c.member_id === myMember?.id)
  const amount = myContribution?.amount_kobo ?? group.contribution_amount_kobo
  const balance = profile?.wallet_balance_kobo ?? 0
  const shortBy = Math.max(0, amount - balance)
  const busy = processing || payContribution.isPending

  if (myContribution?.status === 'paid') {
    return (
      <div className="pt-10 text-center">
        <p className="text-sm text-ink-soft">You've already paid for this cycle.</p>
        <Link to={`/groups/${group.id}`} className="text-sm font-semibold text-green-600">
          Back to circle
        </Link>
      </div>
    )
  }

  async function handleConfirm() {
    if (!myContribution) return
    setProcessing(true)
    try {
      await wait(method === 'bank_transfer' ? 2000 : 800)
      const paid = await payContribution.mutateAsync({ contributionId: myContribution.id, method, groupId: group.id })
      navigate(`/groups/${group.id}/pay/success`, { state: { reference: paid?.reference, method } })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  function optionClass(selected: boolean) {
    return `mb-2.5 flex w-full items-center gap-3 rounded-2xl border bg-paper-raised p-3.5 text-left ${
      selected ? 'border-green-600 ring-1 ring-green-600' : 'border-line'
    }`
  }

  function radio(selected: boolean) {
    return (
      <span
        className={`h-[18px] w-[18px] shrink-0 rounded-full border-2 ${
          selected ? 'border-green-600 bg-green-600 ring-2 ring-white ring-inset' : 'border-line'
        }`}
      />
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link to={`/groups/${group.id}`} className="flex items-center gap-2.5 text-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-paper-raised">
            <ArrowLeft size={14} />
          </span>
          <span className="font-bold">Back</span>
        </Link>
        <TestModeBadge />
      </div>

      <div className="pt-3 pb-2 text-center">
        <p className="m-0 section-label">You're paying</p>
        <p className="m-0 my-1.5 font-mono text-4xl font-bold tabular-nums">{formatNaira(amount)}</p>
        <p className="m-0 text-xs text-ink-soft">
          to {group.name} · Cycle {group.current_cycle}
          {currentCycle ? ` · ${describeDue(currentCycle.due_date)}` : ''}
        </p>
      </div>

      <p className="mb-2.5 mt-5 section-label">Pay with</p>

      <button type="button" onClick={() => setMethod('wallet')} className={optionClass(method === 'wallet')}>
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
          <Wallet size={18} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Wallet balance</span>
          <span className={`block text-xs ${shortBy > 0 ? 'text-danger' : 'text-ink-soft'}`}>
            {formatNaira(balance)} available{shortBy > 0 ? ` · ${formatNaira(shortBy)} short` : ''}
          </span>
        </span>
        {radio(method === 'wallet')}
      </button>

      <button
        type="button"
        onClick={() => setMethod('bank_transfer')}
        className={optionClass(method === 'bank_transfer')}
      >
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-600">
          <Building2 size={18} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Bank transfer</span>
          <span className="block text-xs text-ink-soft">Transfer to a test account</span>
        </span>
        {radio(method === 'bank_transfer')}
      </button>

      {method === 'wallet' && shortBy > 0 && (
        <Link
          to={`/wallet?topup=${shortBy}&return=${encodeURIComponent(`/groups/${group.id}/pay`)}`}
          className="mb-2.5 block rounded-xl border border-dashed border-green-600 p-3 text-center text-sm font-semibold text-green-700 hover:bg-green-50"
        >
          Top up {formatNaira(shortBy)} to pay from your wallet
        </Link>
      )}

      {method === 'bank_transfer' && (
        <div className="mb-2.5 rounded-2xl border border-line bg-paper p-4 text-sm">
          <p className="m-0 mb-2 text-xs text-ink-soft">Send exactly {formatNaira(amount)} to:</p>
          {[
            ['Bank', TEST_ACCOUNT.bank],
            ['Account name', TEST_ACCOUNT.name],
            ['Account number', TEST_ACCOUNT.number],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-1">
              <span className="text-ink-soft">{label}</span>
              <span className="flex items-center gap-2 font-semibold">
                {value}
                {label === 'Account number' && (
                  <button
                    type="button"
                    aria-label="Copy account number"
                    onClick={() => {
                      navigator.clipboard.writeText(value)
                      showToast('Account number copied', 'success')
                    }}
                    className="text-green-600"
                  >
                    <Copy size={13} />
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!myContribution || busy || (method === 'wallet' && shortBy > 0)}
        className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {busy
          ? method === 'bank_transfer'
            ? 'Confirming transfer…'
            : 'Processing…'
          : method === 'bank_transfer'
            ? "I've sent the money"
            : `Pay ${formatNaira(amount)}`}
      </button>

      {!myContribution && (
        <p className="mt-3 text-center text-xs text-ink-soft">There's nothing to pay in this circle right now.</p>
      )}

      <p className="mt-3.5 text-center text-xs text-ink-soft">
        Test mode: no real money moves. Payments are simulated.
      </p>
    </div>
  )
}
