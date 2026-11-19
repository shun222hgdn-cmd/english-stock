import { useState } from 'react'
import { LogoIcon } from '../components/Icons'
import { toErrorMessage } from '../utils/errors'

/**
 * ログイン画面。新規会員登録は設けず、Supabase Dashboard で作成したアカウントでログインする。
 * @param {{ onSignIn: (email: string, password: string) => Promise<void> }} props
 */
export default function Login({ onSignIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return

    if (!email.trim() || !password) {
      setError('メールアドレスとパスワードを入力してください。')
      return
    }

    setLoading(true)
    setError('')
    try {
      await onSignIn(email.trim(), password)
      // 成功すると認証状態の変化を App が受け取り、ホーム画面に切り替わる
    } catch (err) {
      setError(toErrorMessage(err, 'ログインに失敗しました。'))
      setLoading(false)
    }
  }

  return (
    <main className="center-screen">
      <div className="login-box">
        <p className="brand brand-large">
          <LogoIcon size={26} />
          <span>English Stock</span>
        </p>
        <h1 className="hero-title">Make English yours.</h1>

        <form className="card login-card" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-email">メールアドレス</label>
            <input
              id="login-email"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">パスワード</label>
            <input
              id="login-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          {/* ログイン処理中はボタンを無効化して二重送信を防ぐ */}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>
      </div>
    </main>
  )
}
