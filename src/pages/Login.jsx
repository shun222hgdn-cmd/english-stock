import { useState } from 'react'
import { LogoIcon } from '../components/Icons'
import { toLoginEmail } from '../utils/loginId'
import { useBusy } from '../hooks/useBusy'

/**
 * ログイン画面。新規登録は設けず、Supabase Dashboard で作ったアカウントで、ID（例：shun）とパスワードでログインする。
 * ID は Supabase 用のアドレスに自動で変換する（utils/loginId.js）。メールアドレスのアカウントもそのまま入力すれば使える。
 *
 * @param {{ onSignIn: (email: string, password: string) => Promise<void> }} props
 */
export default function Login({ onSignIn }) {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const { busy, error, setError, run } = useBusy('ログインに失敗しました。')

  function handleSubmit(event) {
    event.preventDefault()
    const { email, error: idError } = toLoginEmail(loginId)
    if (idError) return setError(idError)
    if (!password) return setError('パスワードを入力してください。')
    run(() => onSignIn(email, password)) // 成功すると App がメイン画面に切り替える
  }

  const field = (id, label, value, setValue, props) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setError('')
        }}
        disabled={busy}
        required
        {...props}
      />
    </div>
  )

  return (
    <main className="center-screen">
      <div className="login-box">
        <p className="brand brand-large" lang="en">
          <LogoIcon size={26} />
          <span>English Stock</span>
        </p>
        <h1 className="login-lead">英単語・フレーズ・例文のストック</h1>

        <form className="card login-card" onSubmit={handleSubmit} noValidate>
          {field('login-id', 'ID', loginId, setLoginId, {
            type: 'text',
            autoComplete: 'username',
            autoCapitalize: 'none',
            autoCorrect: 'off',
            spellCheck: 'false',
          })}
          {field('login-password', 'パスワード', password, setPassword, { type: 'password', autoComplete: 'current-password' })}

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>
      </div>
    </main>
  )
}
