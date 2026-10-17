import { FlaskConical } from 'lucide-react'

export function TestModeBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gold-line bg-gold-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-gold-ink">
      <FlaskConical size={11} /> Test mode
    </span>
  )
}
