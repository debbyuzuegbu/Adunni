import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { SplashScreen } from '../components/Loading'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/ToastContext'

// Reached from the reset email. Supabase reads the token in the URL and signs
// the user in with a recovery session, which is what lets updateUser set the password.
export function ResetPassword() {
  const { session, loading: authLoading } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (authLoading) {
    return <SplashScreen />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    showToast('Password updated', 'success')
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="You'll use it the next time you log in"
      footer={
        <Link to="/login" className="font-semibold text-green-600">
          Back to log in
        </Link>
      }
    >
      {!session ? (
        <div className="rounded-2xl border border-line bg-paper-raised p-4 text-sm">
          <p className="m-0 font-semibold">This link has expired</p>
          <p className="m-0 mt-1 text-ink-soft">
            Reset links can only be used once and expire after an hour.{' '}
            <Link to="/forgot-password" className="font-semibold text-green-600">
              Request a new one
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block section-label">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block section-label">Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="field"
            />
          </label>

          {error && <p className="m-0 text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-2xl bg-green-600 py-3.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
