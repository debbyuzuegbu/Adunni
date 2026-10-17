import { AlertCircle, ArrowLeft, Bell, CalendarClock, CheckCircle2, PartyPopper, Trophy, UserPlus, Wallet } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { ListSkeleton } from '../components/Loading'
import { useMarkRead, useNotifications } from '../hooks/useNotifications'
import type { AppNotification, NotificationKind } from '../types/database'

const kindStyle: Record<NotificationKind, { Icon: typeof Bell; className: string }> = {
  due_soon: { Icon: CalendarClock, className: 'bg-gold-100 text-gold-600' },
  overdue: { Icon: AlertCircle, className: 'bg-danger/10 text-danger' },
  member_paid: { Icon: CheckCircle2, className: 'bg-green-100 text-green-700' },
  payout_upcoming: { Icon: Trophy, className: 'bg-purple-100 text-purple-600' },
  payout_received: { Icon: Wallet, className: 'bg-green-100 text-green-700' },
  circle_started: { Icon: PartyPopper, className: 'bg-gold-100 text-gold-600' },
  member_joined: { Icon: UserPlus, className: 'bg-green-100 text-green-700' },
}

function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

export function Notifications() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useNotifications()
  const markRead = useMarkRead()
  const unread = (data ?? []).filter((n) => !n.read_at).length

  function open(n: AppNotification) {
    if (!n.read_at) markRead.mutate([n.id])
    if (n.kind === 'payout_received') navigate('/wallet')
    else if (n.group_id) navigate(`/groups/${n.group_id}`)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-paper-raised">
            <ArrowLeft size={14} />
          </span>
          <span className="font-bold">Notifications</span>
        </Link>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markRead.mutate('all')}
            disabled={markRead.isPending}
            className="text-xs font-semibold text-green-600 disabled:opacity-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isLoading && <ListSkeleton rows={5} />}
      {error && <p className="text-sm text-danger">Couldn't load your notifications.</p>}
      {!isLoading && !error && data?.length === 0 && (
        <EmptyState
          Icon={Bell}
          title="You're all caught up"
          message="Reminders, payments and payouts from your circles will show up here."
        />
      )}

      {data && data.length > 0 && (
        <div className="card overflow-hidden">
          {data.map((n) => {
            const { Icon, className } = kindStyle[n.kind]
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => open(n)}
                className={`flex w-full items-start gap-3 border-b border-line p-3.5 text-left last:border-b-0 hover:bg-paper ${
                  n.read_at ? '' : 'bg-green-50/60'
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${className}`}>
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${n.read_at ? 'font-medium' : 'font-bold'}`}>{n.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{n.body}</span>
                  <span className="mt-1 block text-[0.68rem] text-ink-soft/80">{timeAgo(n.created_at)}</span>
                </span>
                {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-600" aria-label="Unread" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
