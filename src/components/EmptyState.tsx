import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export function EmptyState({
  Icon,
  title,
  message,
  action,
}: {
  Icon: LucideIcon
  title: string
  message: string
  action?: { to: string; label: string }
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-green-100" />
        <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-gold-100 ring-4 ring-paper-raised" />
        <Icon size={26} strokeWidth={1.8} className="relative text-green-700" />
      </div>
      <p className="m-0 text-base font-bold">{title}</p>
      <p className="m-0 mt-1.5 max-w-[30ch] text-sm leading-relaxed text-ink-soft">{message}</p>
      {action && (
        <Link
          to={action.to}
          className="mt-5 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
