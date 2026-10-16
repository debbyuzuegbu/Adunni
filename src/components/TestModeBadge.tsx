import { FlaskConical } from 'lucide-react'

export function TestModeBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#ecd6a8] bg-gold-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[#7a5a15]">
      <FlaskConical size={11} /> Test mode
    </span>
  )
}
