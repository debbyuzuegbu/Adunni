export function SplashScreen() {
  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 text-white sm:my-6 sm:h-[calc(100dvh-3rem)] sm:rounded-[2rem] sm:shadow-[0_30px_80px_-30px_rgb(6_56_31/0.35)]">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="splash-ring absolute inset-0 rounded-full bg-gold-500/30" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 text-2xl font-extrabold text-brand-900 shadow-[0_12px_30px_-10px_rgb(242_169_59/0.8)]">
          ₦
        </span>
      </div>
      <p className="m-0 mt-6 text-sm font-extrabold tracking-[0.3em]">ADUNNI</p>
      <p className="m-0 mt-1.5 text-xs text-white/60">Saving together</p>
      <div className="mt-8 flex gap-1.5" aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <span key={i} className="splash-dot h-1.5 w-1.5 rounded-full bg-white/80" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-line p-3.5 last:border-b-0">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-3/5" />
          </div>
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  )
}

export function GroupCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card mb-2.5 flex items-center gap-3 p-3.5">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
            <Skeleton className="h-3.5 w-14 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="ml-auto h-3.5 w-20" />
            <Skeleton className="ml-auto h-2.5 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-4 flex items-center gap-2.5">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="card mb-4 space-y-3 p-4">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="mb-2.5 h-3 w-28" />
      <ListSkeleton rows={3} />
    </div>
  )
}
