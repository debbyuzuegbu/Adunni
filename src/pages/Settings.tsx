import { Check, ChevronRight, LogOut, Mail, Monitor, Moon, Pencil, Phone, Sun, User, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGroups } from '../hooks/useGroups'
import { useProfile } from '../hooks/useProfile'
import { useUpdateProfile } from '../hooks/useUpdateProfile'
import { useAuth } from '../lib/AuthContext'
import { useConfirm } from '../lib/ConfirmContext'
import { formatDate, formatNaira, initialsOf } from '../lib/format'
import { supabase } from '../lib/supabase'
import { useTheme, type ThemePreference } from '../lib/ThemeContext'
import { useToast } from '../lib/ToastContext'
import { PageSkeleton } from '../components/Loading'

const themeOptions: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

const sectionLabel = 'mb-2.5 mt-5 section-label'
const inputClass =
  'field text-sm outline-none focus:border-green-500 focus:bg-paper-raised'

export function Settings() {
  const { data: profile, isLoading } = useProfile()
  const { data: groupsData } = useGroups()
  const { user } = useAuth()
  const updateProfile = useUpdateProfile()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const { preference, setPreference } = useTheme()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  function startEditing() {
    if (!profile) return
    setFullName(profile.full_name)
    setPhone(profile.phone ?? '')
    setEditing(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) {
      showToast('Please enter your name')
      return
    }
    try {
      await updateProfile.mutateAsync({ fullName: fullName.trim(), phone: phone.trim() })
      setEditing(false)
      showToast('Profile saved', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      showToast(
        message.includes('profiles_phone_key')
          ? 'That phone number is already linked to another account'
          : message || "Couldn't save your profile.",
      )
    }
  }

  async function handleLogout() {
    const ok = await confirm({ title: 'Log out?', confirmLabel: 'Log out', danger: true })
    if (!ok) return
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (isLoading || !profile) {
    return <PageSkeleton />
  }

  const groups = groupsData?.groups ?? []
  const activeCount = groups.filter((g) => g.status === 'active').length
  const completedCount = groups.filter((g) => g.status === 'completed').length

  return (
    <div>
      <div className="flex flex-col items-center card px-4 pb-5 pt-6 text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 text-xl font-extrabold text-brand-900">
          {initialsOf(profile.full_name)}
        </div>
        <p className="m-0 text-lg font-bold">{profile.full_name || 'Add your name'}</p>
        <p className="m-0 mt-0.5 text-xs text-ink-soft">Member since {formatDate(profile.created_at)}</p>

        <div className="mt-4 grid w-full grid-cols-3 divide-x divide-line rounded-xl bg-paper py-2.5">
          <div>
            <p className="m-0 font-mono text-base font-bold">{groups.length}</p>
            <p className="m-0 text-[0.68rem] text-ink-soft">Circles</p>
          </div>
          <div>
            <p className="m-0 font-mono text-base font-bold">{activeCount}</p>
            <p className="m-0 text-[0.68rem] text-ink-soft">Active</p>
          </div>
          <div>
            <p className="m-0 font-mono text-base font-bold">{completedCount}</p>
            <p className="m-0 text-[0.68rem] text-ink-soft">Completed</p>
          </div>
        </div>
      </div>

      <Link
        to="/wallet"
        className="mt-3 flex items-center gap-3 rounded-[1.375rem] bg-gradient-to-br from-brand-600 to-brand-900 shadow-[0_18px_40px_-18px_rgb(6_56_31/0.6)] p-4 text-white hover:opacity-95"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <Wallet size={18} />
        </span>
        <span className="flex-1">
          <span className="block text-xs opacity-75">Wallet balance</span>
          <span className="block font-mono text-xl font-bold tabular-nums">
            {formatNaira(profile.wallet_balance_kobo)}
          </span>
        </span>
        <span className="text-right text-xs opacity-75">
          Total saved
          <span className="block font-mono text-sm font-bold opacity-100">
            {formatNaira(groupsData?.totalPaidKobo ?? 0)}
          </span>
        </span>
        <ChevronRight size={16} className="shrink-0 opacity-70" />
      </Link>

      <div className="flex items-center justify-between">
        <p className={sectionLabel}>Profile settings</p>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-green-600"
          >
            <Pencil size={13} /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="rounded-2xl border border-green-500 bg-paper-raised p-4">
          <label className="mb-3 block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Full name</span>
            <input autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </label>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 801 234 5678"
              className={inputClass}
            />
          </label>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-xl border border-line py-3 text-sm font-semibold text-ink-soft hover:border-ink-soft"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Check size={15} strokeWidth={3} />
              {updateProfile.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      ) : (
        <div className="card">
          <DetailRow Icon={User} label="Full name" value={profile.full_name || 'Not set'} />
          <DetailRow Icon={Phone} label="Phone" value={profile.phone || 'Not set'} />
          <DetailRow Icon={Mail} label="Email" value={user?.email ?? ''} />
        </div>
      )}

      <p className={sectionLabel}>Appearance</p>
      <div className="card p-1.5">
        <div className="grid grid-cols-3 gap-1">
          {themeOptions.map(({ value, label, Icon }) => {
            const selected = preference === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setPreference(value)}
                aria-pressed={selected}
                className={`flex flex-col items-center gap-1.5 rounded-[0.8rem] py-3 text-xs font-semibold ${
                  selected ? 'bg-green-100 text-green-700' : 'text-ink-soft hover:bg-paper'
                }`}
              >
                <Icon size={18} strokeWidth={selected ? 2.4 : 2} />
                {label}
              </button>
            )
          })}
        </div>
      </div>
      <p className="m-0 mt-2 px-1 text-xs text-ink-soft">
        {preference === 'system' ? "Matches your device's light or dark setting." : 'Saved on this device.'}
      </p>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-paper-raised py-3 text-sm font-semibold text-danger hover:border-danger"
      >
        <LogOut size={15} /> Log out
      </button>
    </div>
  )
}

function DetailRow({ Icon, label, value }: { Icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-line p-3.5 last:border-b-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.68rem] font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
        <span className="block truncate text-sm font-semibold">{value}</span>
      </span>
    </div>
  )
}
