import { useState } from 'react'
import { initialsOf } from '../lib/format'

export function Avatar({
  name,
  url,
  className = 'h-[34px] w-[34px] text-xs',
  tone = 'green',
}: {
  name: string | null | undefined
  url?: string | null
  className?: string
  tone?: 'green' | 'gold'
}) {
  const [failed, setFailed] = useState(false)
  const toneClass = tone === 'gold' ? 'bg-gold-500 text-brand-900' : 'bg-green-100 text-green-700'

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold ${toneClass} ${className}`}
    >
      {url && !failed ? (
        <img src={url} alt={name ?? ''} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        initialsOf(name)
      )}
    </span>
  )
}
