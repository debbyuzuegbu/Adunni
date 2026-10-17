import { Home as HomeIcon, Receipt, Settings as SettingsIcon, Users, Wallet } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { initialsOf } from '../lib/format'

const tabs = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/groups', label: 'Groups', Icon: Users, end: false },
  { to: '/wallet', label: 'Wallet', Icon: Wallet, end: false },
  { to: '/history', label: 'History', Icon: Receipt, end: false },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon, end: false },
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function AppShell() {
  const { data: profile } = useProfile()
  const location = useLocation()
  const firstName = profile?.full_name?.trim().split(' ')[0] || 'there'

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden bg-paper sm:my-6 sm:h-[calc(100dvh-3rem)] sm:rounded-[2rem] sm:border sm:border-line sm:shadow-[0_30px_80px_-30px_rgb(6_56_31/0.35)]">
      <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-green-700 to-green-900 px-5 pb-6 pt-7 text-white">
        <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/[0.06]" />
        <div className="pointer-events-none absolute -bottom-20 right-16 h-36 w-36 rounded-full bg-gold-500/10" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="m-0 text-xs font-medium text-white/70">{greeting()},</p>
            <p className="m-0 text-lg font-bold tracking-tight">{firstName} 👋</p>
          </div>
          <Link
            to="/settings"
            aria-label="Profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-500 text-sm font-extrabold text-green-900 ring-4 ring-white/10"
          >
            {initialsOf(profile?.full_name)}
          </Link>
        </div>
      </header>

      <main className="-mt-3 flex-1 overflow-y-auto rounded-t-[1.5rem] bg-paper px-4 pb-6 pt-5">
        <div key={location.pathname} className="page-in">
          <Outlet />
        </div>
      </main>

      <nav className="shrink-0 border-t border-line/70 bg-paper-raised/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur">
        <div className="flex">
          {tabs.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[0.66rem] font-semibold outline-none ${
                  isActive ? 'text-green-700' : 'text-ink-soft/80 hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-green-100' : 'group-hover:bg-paper'
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
