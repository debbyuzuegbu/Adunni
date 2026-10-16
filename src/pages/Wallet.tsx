import { ArrowDownLeft, ArrowUpRight, Plus, Trophy } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { TestModeBadge } from '../components/TestModeBadge'
import { useProfile } from '../hooks/useProfile'
import { useTopUpWallet, useWalletTransactions } from '../hooks/useWallet'
import { formatDate, formatNaira } from '../lib/format'
import { useToast } from '../lib/ToastContext'
import type { WalletTransactionKind } from '../types/database'

const presets = [5_000, 20_000, 50_000, 100_000]

const kindStyle: Record<WalletTransactionKind, { Icon: typeof Plus; className: string; label: string }> = {
  top_up: { Icon: ArrowDownLeft, className: 'bg-green-100 text-green-700', label: 'Top-up' },
  contribution: { Icon: ArrowUpRight, className: 'bg-gold-100 text-gold-600', label: 'Contribution' },
  payout: { Icon: Trophy, className: 'bg-[#eee7fb] text-[#6c4bd6]', label: 'Payout' },
}

export function Wallet() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const { data: transactions, isLoading, error } = useWalletTransactions()
  const topUp = useTopUpWallet()
  const { showToast } = useToast()
  const suggested = Number(params.get('topup') ?? 0)
  const returnTo = params.get('return')
  const [showTopUp, setShowTopUp] = useState(suggested > 0)
  const [amount, setAmount] = useState(suggested > 0 ? String(Math.ceil(suggested / 100)) : '')

  const inflow = (transactions ?? []).filter((t) => t.amount_kobo > 0).reduce((s, t) => s + t.amount_kobo, 0)
  const outflow = (transactions ?? []).filter((t) => t.amount_kobo < 0).reduce((s, t) => s - t.amount_kobo, 0)

  async function handleTopUp(e: React.FormEvent) {
    e.preventDefault()
    const naira = Number(amount)
    if (!(naira > 0)) return
    try {
      await topUp.mutateAsync(Math.round(naira * 100))
      showToast(`${formatNaira(naira * 100)} added to your wallet`, 'success')
      setAmount('')
      setShowTopUp(false)
      if (returnTo?.startsWith('/')) navigate(returnTo)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't top up your wallet.")
    }
  }

  return (
    <div>
      <div className="mb-4 rounded-2xl bg-gradient-to-br from-green-600 to-green-900 p-5 text-white">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="m-0 text-xs opacity-75">Wallet balance</p>
          <TestModeBadge />
        </div>
        <p className="m-0 mb-4 font-mono text-3xl font-bold tabular-nums">
          {formatNaira(profile?.wallet_balance_kobo ?? 0)}
        </p>
        <div className="flex gap-4 text-xs">
          <span>
            <span className="block opacity-70">Money in</span>
            <span className="font-mono font-bold">{formatNaira(inflow)}</span>
          </span>
          <span>
            <span className="block opacity-70">Money out</span>
            <span className="font-mono font-bold">{formatNaira(outflow)}</span>
          </span>
        </div>
        {!showTopUp && (
          <button
            type="button"
            onClick={() => setShowTopUp(true)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-bold text-green-700 hover:bg-green-50"
          >
            <Plus size={16} strokeWidth={3} /> Add money
          </button>
        )}
      </div>

      {showTopUp && (
        <form onSubmit={handleTopUp} className="mb-4 rounded-2xl border border-green-500 bg-paper-raised p-4">
          <p className="m-0 mb-3 text-sm font-bold">Add money</p>
          <div className="mb-3 grid grid-cols-4 gap-2">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                className={`rounded-lg border py-2 text-xs font-semibold ${
                  Number(amount) === p ? 'border-green-600 bg-green-100 text-green-700' : 'border-line text-ink-soft'
                }`}
              >
                {formatNaira(p * 100)}
              </button>
            ))}
          </div>
          <label className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-paper px-3 focus-within:border-green-500">
            <span className="font-mono text-sm text-ink-soft">₦</span>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="flex-1 bg-transparent py-3 font-mono text-sm outline-none"
            />
          </label>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setShowTopUp(false)}
              className="flex-1 rounded-xl border border-line py-3 text-sm font-semibold text-ink-soft hover:border-ink-soft"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!(Number(amount) > 0) || topUp.isPending}
              className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {topUp.isPending ? 'Adding…' : Number(amount) > 0 ? `Add ${formatNaira(Number(amount) * 100)}` : 'Add'}
            </button>
          </div>
          <p className="m-0 mt-2.5 text-center text-xs text-ink-soft">Test mode: no card is charged.</p>
        </form>
      )}

      <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-soft">Activity</p>
      {isLoading && <p className="text-sm text-ink-soft">Loading…</p>}
      {error && <p className="text-sm text-danger">Couldn't load your wallet activity.</p>}
      {!isLoading && !error && transactions?.length === 0 && (
        <p className="text-sm text-ink-soft">No activity yet. Add money to get started.</p>
      )}
      {transactions && transactions.length > 0 && (
        <div className="rounded-2xl border border-line bg-paper-raised">
          {transactions.map((t) => {
            const { Icon, className, label } = kindStyle[t.kind]
            const incoming = t.amount_kobo > 0
            return (
              <div key={t.id} className="flex items-center gap-3 border-b border-line p-3.5 last:border-b-0">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${className}`}>
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{t.description}</span>
                  <span className="block text-xs text-ink-soft">
                    {label} · {formatDate(t.created_at)} · <span className="font-mono">{t.reference}</span>
                  </span>
                </span>
                <span className={`shrink-0 font-mono text-sm font-bold ${incoming ? 'text-green-600' : ''}`}>
                  {incoming ? '+' : '−'}
                  {formatNaira(Math.abs(t.amount_kobo))}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
