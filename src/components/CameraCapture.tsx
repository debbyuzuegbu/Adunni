import { Camera, RotateCcw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function CameraCapture({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [snapshot, setSnapshot] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream.current = s
        if (video.current) video.current.srcObject = s
      })
      .catch((err: unknown) => {
        const name = err instanceof DOMException ? err.name : ''
        setError(
          name === 'NotAllowedError'
            ? 'Camera access was blocked. Allow it in your browser settings, or choose a photo instead.'
            : name === 'NotFoundError'
              ? 'No camera was found on this device.'
              : "Couldn't open the camera.",
        )
      })
    if (!navigator.mediaDevices) setError('This browser does not support the camera.')

    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      cancelled = true
      document.removeEventListener('keydown', onKey)
      stream.current?.getTracks().forEach((t) => t.stop())
    }
  }, [onClose])

  function takeSnapshot() {
    const v = video.current
    if (!v || !v.videoWidth) return
    const side = Math.min(v.videoWidth, v.videoHeight)
    const canvas = document.createElement('canvas')
    canvas.width = side
    canvas.height = side
    const ctx = canvas.getContext('2d')!
    ctx.translate(side, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, side, side)
    setSnapshot(canvas.toDataURL('image/jpeg', 0.9))
  }

  async function confirmPhoto() {
    if (!snapshot) return
    const blob = await (await fetch(snapshot)).blob()
    onCapture(new File([blob], 'camera.jpg', { type: 'image/jpeg' }))
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/50 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Take a photo"
        onClick={(e) => e.stopPropagation()}
        className="sheet-in card w-full max-w-xs p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="m-0 text-base font-bold">Take a photo</p>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-ink-soft hover:bg-paper">
            <X size={18} />
          </button>
        </div>

        <div className="relative mx-auto aspect-square w-52 overflow-hidden rounded-full bg-brand-900 ring-4 ring-green-100">
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            onLoadedData={() => setReady(true)}
            className="h-full w-full -scale-x-100 object-cover"
          />
          {snapshot && <img src={snapshot} alt="Your photo" className="absolute inset-0 h-full w-full object-cover" />}
          {error && (
            <p className="absolute inset-0 m-0 flex items-center justify-center bg-brand-900 p-8 text-center text-sm text-white/80">
              {error}
            </p>
          )}
          {!error && !snapshot && !ready && (
            <span className="absolute inset-0 m-auto h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
        </div>

        <p className="m-0 mt-3 text-center text-xs text-ink-soft">
          {snapshot ? 'Happy with it?' : 'Centre your face in the circle'}
        </p>

        <div className="mt-4 flex gap-2.5">
          {snapshot ? (
            <>
              <button
                type="button"
                onClick={() => setSnapshot(null)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-3 text-sm font-semibold text-ink-soft hover:border-ink-soft"
              >
                <RotateCcw size={15} /> Retake
              </button>
              <button
                type="button"
                onClick={confirmPhoto}
                className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700"
              >
                Use photo
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={takeSnapshot}
              disabled={!!error || !ready}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Camera size={16} /> Capture
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
