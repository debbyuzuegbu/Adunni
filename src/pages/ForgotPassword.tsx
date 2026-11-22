import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { supabase } from '../lib/supabase'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We'll email you a link to choose a new one"
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-green-600">
            Log in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-line bg-paper-raised p-4 text-sm">
          <p className="m-0 font-semibold">Check your email</p>
          <p className="m-0 mt-1 text-ink-soft">
            If an account exists for {email}, a reset link is on its way. It may take a minute to arrive.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block section-label">Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </label>

          {error && <p className="m-0 text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-2xl bg-green-600 py-3.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
