import { Home as HomeIcon, Receipt, Settings as SettingsIcon, Users, Wallet } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'

const tabs = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/groups', label: 'Groups', Icon: Users, end: false },
  { to: '/wallet', label: 'Wallet', Icon: Wallet, end: false },
  { to: '/history', label: 'History', Icon: Receipt, end: false },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon, end: false },
]

export function AppShell() {
  const { data: profile } = useProfile()
  const fullName = profile?.full_name || 'there'
  const initials = fullName
    .split(' ')
    .map((part) => part[0])
    .join('') || '?'

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col overflow-hidden bg-paper-raised shadow-sm">
      <header className="shrink-0 bg-green-700 px-5 pb-4 pt-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="m-0 text-xs opacity-80">Welcome back</p>
            <p className="m-0 text-base font-bold">{fullName}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 text-xs font-extrabold text-green-900">
            {initials}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-paper px-4 pb-24 pt-4">
        <Outlet />
      </main>

      <nav className="flex shrink-0 border-t border-line bg-paper-raised">
        {tabs.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 py-2.5 pb-3.5 text-center text-[0.66rem] font-semibold outline-none focus-visible:bg-green-50 ${
                isActive ? 'text-green-600' : 'text-ink-soft'
              }`
            }
          >
            <Icon size={18} className="mx-auto mb-0.5" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
