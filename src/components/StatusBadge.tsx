import type { GroupStatus } from '../types/database'

const styles: Record<GroupStatus, { label: string; className: string }> = {
  draft: { label: 'Forming', className: 'bg-gold-100 text-gold-600' },
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', className: 'bg-purple-100 text-purple-600' },
  cancelled: { label: 'Cancelled', className: 'bg-line text-ink-soft' },
}

export function StatusBadge({ status }: { status: GroupStatus }) {
  const { label, className } = styles[status]
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[0.68rem] font-bold ${className}`}>{label}</span>
  )
}
