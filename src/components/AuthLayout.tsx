import type { ReactNode } from 'react'

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden bg-paper sm:my-6 sm:h-[calc(100dvh-3rem)] sm:rounded-[2rem] sm:border sm:border-line sm:shadow-[0_30px_80px_-30px_rgb(6_56_31/0.35)]">
      <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-green-700 to-green-900 px-6 pb-12 pt-10 text-white">
        <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-white/[0.06]" />
        <div className="pointer-events-none absolute -bottom-24 right-10 h-44 w-44 rounded-full bg-gold-500/10" />
        <div className="relative">
          <div className="mb-8 flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-500 text-lg font-extrabold text-green-900 ring-4 ring-white/10">
              ₦
            </span>
            <span className="text-sm font-extrabold tracking-[0.2em]">ADUNNI</span>
          </div>
          <h1 className="m-0 text-[1.75rem] font-extrabold leading-tight">{title}</h1>
          <p className="m-0 mt-1.5 text-sm text-white/70">{subtitle}</p>
        </div>
      </header>

      <main className="page-in -mt-6 flex flex-1 flex-col overflow-y-auto rounded-t-[1.75rem] bg-paper px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-7">
        {children}
        <div className="mt-auto pt-6 text-center text-sm text-ink-soft">{footer}</div>
      </main>
    </div>
  )
}
