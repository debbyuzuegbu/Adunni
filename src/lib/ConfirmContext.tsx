import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const confirmButton = useRef<HTMLButtonElement>(null)

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  )

  const close = useCallback(
    (result: boolean) => {
      pending?.resolve(result)
      setPending(null)
    },
    [pending],
  )

  useEffect(() => {
    if (!pending) return
    confirmButton.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pending, close])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-green-900/30 p-4 backdrop-blur-[2px] sm:items-center"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
            className="sheet-in w-full max-w-sm card p-5 shadow-[0_24px_60px_-20px_rgb(6_56_31/0.45)]"
          >
            <p id="confirm-title" className="m-0 text-base font-bold">
              {pending.title}
            </p>
            {pending.message && <p className="m-0 mt-1.5 text-sm text-ink-soft">{pending.message}</p>}
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => close(false)}
                className="flex-1 rounded-xl border border-line bg-paper-raised py-3 text-sm font-semibold text-ink-soft hover:border-ink-soft"
              >
                {pending.cancelLabel ?? 'Cancel'}
              </button>
              <button
                ref={confirmButton}
                type="button"
                onClick={() => close(true)}
                className={`flex-1 rounded-xl py-3 text-sm font-bold text-white ${
                  pending.danger ? 'bg-danger hover:opacity-90' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {pending.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}
