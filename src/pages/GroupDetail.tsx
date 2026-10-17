import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  LogOut,
  Pencil,
  Share2,
  Shuffle,
  Trash2,
  Trophy,
  UserMinus,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import {
  useCompleteCycle,
  useLeaveGroup,
  useMoveMember,
  useRemoveMember,
  useSetContributionReceived,
  useStartCircle,
} from '../hooks/useCircleActions'
import { useDeleteGroup } from '../hooks/useDeleteGroup'
import { useGroupDetail, type GroupDetailData, type MemberWithProfile } from '../hooks/useGroupDetail'
import { useAuth } from '../lib/AuthContext'
import { useConfirm } from '../lib/ConfirmContext'
import { useToast } from '../lib/ToastContext'
import { daysUntil, describeDue, formatDate, formatNaira, initialsOf, todayIso } from '../lib/format'

const sectionLabel = 'mb-2.5 section-label'
const card = 'card'

function errorMessage(err: unknown, fallback: string) {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') return err.message
  return fallback
}

function memberName(member: MemberWithProfile | undefined, myId: string | undefined) {
  if (!member) return 'Unknown'
  if (member.profile_id === myId) return 'You'
  return member.profile?.full_name || 'Member'
}

function Avatar({ name }: { name: string | null | undefined }) {
  return (
    <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
      {initialsOf(name)}
    </div>
  )
}

export function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, isLoading, error } = useGroupDetail(groupId)
  const deleteGroup = useDeleteGroup()
  const leaveGroup = useLeaveGroup()
  const { showToast } = useToast()
  const confirm = useConfirm()

  if (isLoading) {
    return <p className="text-sm text-ink-soft">Loading group…</p>
  }

  if (error || !data) {
    return <p className="text-sm text-danger">Couldn't load this group.</p>
  }

  const { group, members } = data
  const isCreator = group.created_by === user?.id
  const myMember = members.find((m) => m.profile_id === user?.id)

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete "${group.name}"?`,
      message: "This removes the circle and its history for everyone. This can't be undone.",
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteGroup.mutateAsync(group.id)
      showToast('Circle deleted', 'success')
      navigate('/')
    } catch (err) {
      showToast(errorMessage(err, "Couldn't delete the circle."))
    }
  }

  async function handleLeave() {
    const ok = await confirm({
      title: `Leave "${group.name}"?`,
      message: "You'll need the invite code to join again.",
      confirmLabel: 'Leave',
      danger: true,
    })
    if (!ok) return
    try {
      await leaveGroup.mutateAsync(group.id)
      showToast('You left the circle', 'success')
      navigate('/')
    } catch (err) {
      showToast(errorMessage(err, "Couldn't leave the circle."))
    }
  }

  const iconButton =
    'flex h-7 w-7 items-center justify-center rounded-full border border-line bg-paper-raised disabled:opacity-50'

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 text-sm">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-paper-raised">
            <ArrowLeft size={14} />
          </span>
          <span className="truncate font-bold">{group.name}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          {isCreator && group.status === 'draft' && (
            <Link to={`/groups/${group.id}/edit`} aria-label="Edit circle" className={`${iconButton} hover:border-green-500`}>
              <Pencil size={13} />
            </Link>
          )}
          {isCreator && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteGroup.isPending}
              aria-label="Delete circle"
              className={`${iconButton} text-danger hover:border-danger`}
            >
              <Trash2 size={14} />
            </button>
          )}
          {!isCreator && myMember && group.status === 'draft' && (
            <button
              type="button"
              onClick={handleLeave}
              disabled={leaveGroup.isPending}
              aria-label="Leave circle"
              className={`${iconButton} text-danger hover:border-danger`}
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>

      <div className={`${card} mb-4 flex items-center justify-between p-4`}>
        <div>
          <StatusBadge status={group.status} />
          <p className="m-0 mt-1.5 font-mono text-2xl font-bold tabular-nums">
            {formatNaira(group.contribution_amount_kobo * group.member_count)}
          </p>
          <p className="m-0 text-xs text-ink-soft">pot per cycle</p>
        </div>
        <div className="text-right text-xs text-ink-soft">
          <p className="m-0">
            <span className="font-bold text-ink">{formatNaira(group.contribution_amount_kobo)}</span> each
          </p>
          <p className="m-0 capitalize">{group.frequency}</p>
          <p className="m-0">{group.member_count} members</p>
        </div>
      </div>

      {group.status === 'draft' && <DraftView data={data} isCreator={isCreator} />}
      {group.status === 'active' && <ActiveView data={data} isCreator={isCreator} />}
      {group.status === 'completed' && (
        <div className={`${card} mb-4 flex items-center gap-3 p-4`}>
          <Trophy size={22} className="text-gold-600" />
          <div>
            <p className="m-0 text-sm font-bold">Circle completed</p>
            <p className="m-0 text-xs text-ink-soft">Every member has received the pot. Well done!</p>
          </div>
        </div>
      )}

      {myMember && group.status !== 'draft' && <Commitment data={data} />}
      {group.status !== 'draft' && <Schedule data={data} />}
    </div>
  )
}

function DraftView({ data, isCreator }: { data: GroupDetailData; isCreator: boolean }) {
  const { group, members } = data
  const { user } = useAuth()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const moveMember = useMoveMember()
  const removeMember = useRemoveMember()
  const startCircle = useStartCircle()
  const [copied, setCopied] = useState(false)
  const [startDate, setStartDate] = useState(todayIso())
  const [shuffle, setShuffle] = useState(false)

  const slotsFilled = members.length
  const slotsTotal = group.member_count
  const busy = moveMember.isPending || removeMember.isPending
  const inviteUrl = `${window.location.origin}/join/${group.invite_code}`

  async function handleCopy() {
    await navigator.clipboard.writeText(group.invite_code!)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ url: inviteUrl })
      } catch {
        return
      }
    } else {
      await navigator.clipboard.writeText(inviteUrl)
      showToast('Invite link copied', 'success')
    }
  }

  async function handleMove(memberId: string, direction: -1 | 1) {
    try {
      await moveMember.mutateAsync({ groupId: group.id, memberId, direction })
    } catch (err) {
      showToast(errorMessage(err, "Couldn't change the order."))
    }
  }

  async function handleRemove(member: MemberWithProfile) {
    const ok = await confirm({
      title: `Remove ${member.profile?.full_name || 'this member'}?`,
      message: 'Their spot will open up again for someone else to join.',
      confirmLabel: 'Remove',
      danger: true,
    })
    if (!ok) return
    try {
      await removeMember.mutateAsync({ groupId: group.id, memberId: member.id })
      showToast('Member removed', 'success')
    } catch (err) {
      showToast(errorMessage(err, "Couldn't remove the member."))
    }
  }

  async function handleStart() {
    const short = slotsFilled < slotsTotal
    const ok = await confirm({
      title: 'Start the circle?',
      message: short
        ? `Only ${slotsFilled} of ${slotsTotal} spots are filled, so the circle will run with ${slotsFilled} members. The payout order will be locked.`
        : 'The payout order will be locked and the schedule created.',
      confirmLabel: 'Start circle',
    })
    if (!ok) return
    try {
      await startCircle.mutateAsync({ groupId: group.id, startDate, shuffle })
      showToast('Circle started!', 'success')
    } catch (err) {
      showToast(errorMessage(err, "Couldn't start the circle."))
    }
  }

  return (
    <>
      {group.invite_code && (
        <div className={`${card} mb-2.5 flex items-center justify-between border-dashed p-3.5`}>
          <span>
            <span className="block section-label">Invite code</span>
            <span className="font-mono text-lg font-bold tracking-[0.3em]">{group.invite_code}</span>
          </span>
          <span className="flex gap-3">
            <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
              <Copy size={14} /> {copied ? 'Copied!' : 'Copy'}
            </button>
            <button type="button" onClick={handleShare} className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
              <Share2 size={14} /> Share
            </button>
          </span>
        </div>
      )}

      <p className="mb-2 text-xs font-semibold text-ink-soft">
        {slotsFilled} / {slotsTotal} members joined
        {slotsFilled < slotsTotal
          ? ` — ${slotsTotal - slotsFilled} spot${slotsTotal - slotsFilled === 1 ? '' : 's'} open`
          : ' — circle full'}
      </p>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-green-600"
          style={{ width: `${Math.min(100, (slotsFilled / slotsTotal) * 100)}%` }}
        />
      </div>

      <p className={sectionLabel}>Payout order</p>
      <div className={`${card} mb-4`}>
        {members.map((member, i) => {
          const isOrganizer = member.profile_id === group.created_by
          return (
            <div key={member.id} className="flex items-center gap-2.5 border-b border-line p-3 last:border-b-0">
              <span className="w-5 text-center font-mono text-xs font-bold text-ink-soft">{i + 1}</span>
              <Avatar name={member.profile?.full_name} />
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm font-semibold">{memberName(member, user?.id)}</p>
                <p className="m-0 text-xs text-ink-soft">
                  {isOrganizer ? 'Organizer' : `Joined ${formatDate(member.joined_at)}`}
                </p>
              </div>
              {isCreator && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={busy || i === 0}
                    onClick={() => handleMove(member.id, -1)}
                    aria-label="Move up"
                    className="rounded-md p-1.5 text-ink-soft hover:bg-green-50 disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={busy || i === members.length - 1}
                    onClick={() => handleMove(member.id, 1)}
                    aria-label="Move down"
                    className="rounded-md p-1.5 text-ink-soft hover:bg-green-50 disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                  {!isOrganizer && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleRemove(member)}
                      aria-label="Remove member"
                      className="rounded-md p-1.5 text-danger hover:bg-red-50 disabled:opacity-30"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isCreator ? (
        <div className={`${card} mb-4 p-4`}>
          <p className="m-0 mb-3 text-sm font-bold">Start the circle</p>
          <label className="mb-3 block">
            <span className="mb-1.5 block section-label">
              First contribution due
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field text-sm outline-none focus:border-green-500"
            />
          </label>
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
            <Shuffle size={14} className="text-ink-soft" /> Randomize the payout order
          </label>
          <button
            type="button"
            onClick={handleStart}
            disabled={slotsFilled < 2 || !startDate || startCircle.isPending}
            className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {startCircle.isPending ? 'Starting…' : 'Start circle'}
          </button>
          {slotsFilled < 2 && (
            <p className="m-0 mt-2 text-xs text-ink-soft">Invite at least one more member to start.</p>
          )}
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-[#ecd6a8] bg-gold-100 p-3.5 text-xs text-[#7a5a15]">
          Waiting for the organizer to start the circle. You'll see the schedule here once it begins.
        </div>
      )}
    </>
  )
}

function ActiveView({ data, isCreator }: { data: GroupDetailData; isCreator: boolean }) {
  const { group, members, currentCycle, contributions } = data
  const { user } = useAuth()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const setReceived = useSetContributionReceived()
  const completeCycle = useCompleteCycle()

  if (!currentCycle) {
    return <p className="text-sm text-danger">This circle's schedule is missing.</p>
  }

  const recipient = members.find((m) => m.id === currentCycle.recipient_member_id)
  const paidCount = contributions.filter((c) => c.status === 'paid').length
  const total = contributions.length
  const collected = contributions.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount_kobo, 0)
  const myMember = members.find((m) => m.profile_id === user?.id)
  const myContribution = contributions.find((c) => c.member_id === myMember?.id)
  const overdue = daysUntil(currentCycle.due_date) < 0
  const isLast = group.current_cycle >= group.member_count

  async function handleToggle(contributionId: string, received: boolean) {
    try {
      await setReceived.mutateAsync({ groupId: group.id, contributionId, received })
    } catch (err) {
      showToast(errorMessage(err, "Couldn't update the contribution."))
    }
  }

  async function handleComplete() {
    const outstanding = total - paidCount
    const ok = await confirm({
      title: `Close cycle ${group.current_cycle}?`,
      message:
        outstanding > 0
          ? `${outstanding} contribution${outstanding === 1 ? ' is' : 's are'} still outstanding. Close the cycle anyway?`
          : `Confirm ${memberName(recipient, user?.id)} has received the pot.`,
      confirmLabel: isLast ? 'Finish circle' : 'Close cycle',
      danger: outstanding > 0,
    })
    if (!ok) return
    try {
      const updated = await completeCycle.mutateAsync(group.id)
      showToast(updated?.status === 'completed' ? 'Circle completed!' : `Moved to cycle ${group.current_cycle + 1}`, 'success')
    } catch (err) {
      showToast(errorMessage(err, "Couldn't close the cycle."))
    }
  }

  return (
    <>
      <div className={`${card} mb-4 p-4`}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="m-0 section-label">
              Cycle {group.current_cycle} of {group.member_count}
            </p>
            <p className="m-0 mt-1 text-sm">
              Pot goes to <span className="font-bold">{memberName(recipient, user?.id)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className={`m-0 text-xs font-bold ${overdue ? 'text-danger' : 'text-gold-600'}`}>
              {describeDue(currentCycle.due_date)}
            </p>
            <p className="m-0 text-xs text-ink-soft">{formatDate(currentCycle.due_date)}</p>
          </div>
        </div>
        <div className="mb-1.5 h-2 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-green-600"
            style={{ width: `${total ? (paidCount / total) * 100 : 0}%` }}
          />
        </div>
        <p className="m-0 text-xs text-ink-soft">
          {formatNaira(collected)} collected · {paidCount} of {total} paid
        </p>
      </div>

      <p className={sectionLabel}>Members this cycle</p>
      <div className={`${card} mb-4`}>
        {members.map((member) => {
          const contribution = contributions.find((c) => c.member_id === member.id)
          const isRecipient = member.id === currentCycle.recipient_member_id
          const paid = contribution?.status === 'paid'

          return (
            <div key={member.id} className="flex items-center gap-2.5 border-b border-line p-3 last:border-b-0">
              <Avatar name={member.profile?.full_name} />
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm font-semibold">
                  {memberName(member, user?.id)}
                  {isRecipient && (
                    <span className="ml-1.5 rounded-full bg-gold-100 px-1.5 py-0.5 text-[0.62rem] font-bold text-gold-600">
                      receiving
                    </span>
                  )}
                </p>
                <p className={`m-0 text-xs ${paid ? 'text-green-600' : overdue ? 'text-danger' : 'text-ink-soft'}`}>
                  {paid
                    ? `Paid${contribution?.paid_at ? ` · ${formatDate(contribution.paid_at)}` : ''}`
                    : overdue
                      ? 'Overdue'
                      : 'Awaiting'}
                </p>
              </div>
              {isCreator && contribution ? (
                <button
                  type="button"
                  disabled={setReceived.isPending}
                  onClick={() => handleToggle(contribution.id, !paid)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                    paid
                      ? 'border-line text-ink-soft hover:border-danger hover:text-danger'
                      : 'border-green-600 text-green-700 hover:bg-green-50'
                  }`}
                >
                  {paid ? 'Undo' : 'Mark received'}
                </button>
              ) : paid ? (
                <Check size={16} className="text-green-600" strokeWidth={3} />
              ) : (
                <span className="text-ink-soft">…</span>
              )}
            </div>
          )
        })}
      </div>

      {myContribution && myContribution.status !== 'paid' && (
        <Link
          to={`/groups/${group.id}/pay`}
          className="mb-3 block w-full rounded-xl bg-green-600 py-3.5 text-center text-sm font-bold text-white hover:bg-green-700"
        >
          Pay my {formatNaira(group.contribution_amount_kobo)}
        </Link>
      )}

      {isCreator && (
        <button
          type="button"
          onClick={handleComplete}
          disabled={completeCycle.isPending}
          className="mb-4 w-full rounded-xl border border-green-600 bg-paper-raised py-3 text-sm font-bold text-green-700 hover:bg-green-50 disabled:opacity-50"
        >
          {completeCycle.isPending
            ? 'Closing…'
            : isLast
              ? 'Pot paid out — finish circle'
              : `Pot paid out — move to cycle ${group.current_cycle + 1}`}
        </button>
      )}
    </>
  )
}

function Commitment({ data }: { data: GroupDetailData }) {
  const { group, members, myPaidContributions, cycles } = data
  const { user } = useAuth()
  const myMember = members.find((m) => m.profile_id === user?.id)!
  const myCycle = cycles.find((c) => c.recipient_member_id === myMember.id)
  const total = group.contribution_amount_kobo * group.member_count
  const paid = group.contribution_amount_kobo * myPaidContributions

  const rows: [string, string, string?][] = [
    ["Total you'll contribute", formatNaira(total)],
    [`Each ${group.frequency === 'weekly' ? 'week' : 'month'}`, formatNaira(group.contribution_amount_kobo)],
    ['Paid so far', formatNaira(paid), 'text-green-600'],
    ['Remaining', formatNaira(Math.max(0, total - paid))],
  ]

  return (
    <div className={`${card} mb-4 p-4`}>
      <p className="m-0 mb-3 section-label">Your commitment</p>
      {rows.map(([label, value, cls]) => (
        <div key={label} className="mt-2 flex items-center justify-between first-of-type:mt-0">
          <span className="text-sm text-ink-soft">{label}</span>
          <span className={`text-sm font-bold ${cls ?? ''}`}>{value}</span>
        </div>
      ))}
      {myCycle && (
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
          <span className="text-sm text-ink-soft">You receive the pot</span>
          <span className="text-right text-sm font-bold">
            Cycle {myCycle.cycle_number} · {formatDate(myCycle.due_date)}
            {myCycle.paid_out && <span className="block text-xs text-green-600">Received</span>}
          </span>
        </div>
      )}
    </div>
  )
}

function Schedule({ data }: { data: GroupDetailData }) {
  const { group, members, cycles, allContributions } = data
  const { user } = useAuth()

  return (
    <>
      <p className={sectionLabel}>Payout schedule</p>
      <div className={`${card} mb-4`}>
        {cycles.map((cycle) => {
          const recipient = members.find((m) => m.id === cycle.recipient_member_id)
          const cycleContribs = allContributions.filter((c) => c.cycle_id === cycle.id)
          const paid = cycleContribs.filter((c) => c.status === 'paid').length
          const isCurrent = group.status === 'active' && cycle.cycle_number === group.current_cycle

          return (
            <div
              key={cycle.id}
              className={`flex items-center gap-3 border-b border-line p-3 last:border-b-0 ${isCurrent ? 'bg-gold-100/50' : ''}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-mono text-xs font-bold ${
                  cycle.paid_out
                    ? 'border-green-600 bg-green-600 text-white'
                    : isCurrent
                      ? 'border-gold-500 bg-gold-100 text-gold-600'
                      : 'border-line text-ink-soft'
                }`}
              >
                {cycle.paid_out ? <Check size={14} strokeWidth={3} /> : cycle.cycle_number}
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm font-semibold">{memberName(recipient, user?.id)}</p>
                <p className="m-0 text-xs text-ink-soft">{formatDate(cycle.due_date)}</p>
              </div>
              <span className="text-right text-xs text-ink-soft">
                {cycle.paid_out ? 'Paid out' : isCurrent ? `${paid}/${cycleContribs.length} paid` : 'Upcoming'}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}
