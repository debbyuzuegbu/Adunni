import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function Signup() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-700 font-mono text-lg font-bold text-white">
          ₦
        </div>
        <h1 className="m-0 text-xl font-bold">Create your account</h1>
        <p className="m-0 mt-1 text-sm text-ink-soft">Start or join a savings circle</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">Full name</span>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-2xl border border-line bg-paper-raised p-3.5 text-sm outline-none focus:border-green-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-line bg-paper-raised p-3.5 text-sm outline-none focus:border-green-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-line bg-paper-raised p-3.5 text-sm outline-none focus:border-green-500"
          />
        </label>

        {error && <p className="m-0 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 w-full rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{' '}
        <Link to="/login" state={{ from }} className="font-semibold text-green-600">
          Log in
        </Link>
      </p>
    </div>
  )
}
