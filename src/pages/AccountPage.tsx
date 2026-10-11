import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, authApi } from '../api/client'

type Mode = 'login' | 'signup'

export function AccountPage() {
  const cache = useQueryClient()
  const navigate = useNavigate()
  const account = useQuery({ queryKey: ['account'], queryFn: authApi.me, retry: false })
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const authenticate = useMutation({
    mutationFn: () => mode === 'login' ? authApi.login(email, password) : authApi.signup(email, password),
    onSuccess: async ({ user }) => {
      cache.setQueryData(['account'], user)
      await cache.invalidateQueries({ queryKey: ['challenge-archive'] })
      navigate('/archive')
    },
  })

  if (account.isPending) return <section className="utility-page account-page"><p role="status">Checking your account…</p></section>
  if (account.data) return <section className="utility-page account-page">
    <p className="eyebrow">Your account</p>
    <h1>Your games</h1>
    <div className="account-card">
      <p>Signed in as <strong>{account.data.email}</strong></p>
      <p>Your completed and in-progress challenges are saved to this account.</p>
      <Link className="text-action" to="/archive">View your challenge history</Link>
    </div>
  </section>

  const submit = (event: FormEvent) => {
    event.preventDefault()
    authenticate.mutate()
  }
  const error = authenticate.error instanceof ApiError ? authenticate.error.message : authenticate.error ? 'Something went wrong. Please try again.' : null

  return <section className="utility-page account-page">
    <p className="eyebrow">Save your progress</p>
    <h1>{mode === 'login' ? 'Log in' : 'Create account'}</h1>
    <p className="lede">Keep your challenge history when you switch devices. Games played in this browser will be added to your account.</p>
    <div className="account-card">
      <div className="auth-switch" role="group" aria-label="Account action">
        <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => setMode('login')}>Log in</button>
        <button className={mode === 'signup' ? 'active' : ''} type="button" onClick={() => setMode('signup')}>Sign up</button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="account-email">Email</label>
        <input id="account-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="account-password">Password</label>
        <input id="account-password" name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
        {error && <p className="inline-error" role="alert">{error}</p>}
        <button className="primary-action" disabled={authenticate.isPending} type="submit">{authenticate.isPending ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
      </form>
    </div>
  </section>
}
