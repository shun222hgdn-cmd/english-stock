import { useState } from 'react'
import { LockIcon } from '../components/Icons'
import { ADMIN_RESULT_MESSAGES } from '../utils/errors'
import { useBusy } from '../hooks/useBusy'

/**
 * 鍵のかかったフォルダを開く画面。フォルダのパスワードで開く。忘れたときは管理者パスワードで鍵を外せる。
 *
 * @param {{
 *   folderName: string,
 *   onUnlock: (password: string) => Promise<boolean>,             // 正しければ true
 *   onClearWithAdmin: (adminPassword: string) => Promise<string>, // 'ok' など
 * }} props
 */
export default function LockedFolder({ folderName, onUnlock, onClearWithAdmin }) {
  const [password, setPassword] = useState('')
  const [adminMode, setAdminMode] = useState(false)
  const { busy, error, setError, run } = useBusy('鍵を外せませんでした。')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!password) return setError(adminMode ? '管理者パスワードを入力してください。' : 'パスワードを入力してください。')
    // 成功するとフォルダの中身が表示される（この画面は閉じる）
    await run(async () => {
      if (adminMode) {
        const result = await onClearWithAdmin(password)
        if (result !== 'ok') setError(ADMIN_RESULT_MESSAGES[result] ?? '鍵を外せませんでした。')
      } else if (!(await onUnlock(password))) {
        setError('パスワードが違います。')
      }
    })
    setPassword('')
  }

  return (
    <section className="page">
      <form className="locked-folder" onSubmit={handleSubmit} noValidate>
        <p className="locked-folder-icon" aria-hidden="true">
          <LockIcon size={30} />
        </p>
        <h1 className="locked-folder-title">「{folderName}」には鍵がかかっています</h1>
        <p className="muted locked-folder-lead">
          {adminMode ? '管理者パスワードを入れると、このフォルダの鍵を外します。' : 'パスワードを入れると開きます。'}
        </p>

        <input
          className="input"
          type="password"
          autoComplete="off"
          aria-label={adminMode ? '管理者パスワード' : 'フォルダのパスワード'}
          placeholder={adminMode ? '管理者パスワード' : 'パスワード'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError('')
          }}
          disabled={busy}
          aria-invalid={Boolean(error)}
          autoFocus
        />

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? '確認中…' : adminMode ? '鍵を外す' : '開く'}
        </button>
        <button
          type="button"
          className="btn btn-text locked-folder-switch"
          onClick={() => {
            setAdminMode((value) => !value)
            setPassword('')
            setError('')
          }}
          disabled={busy}
        >
          {adminMode ? 'フォルダのパスワードで開く' : 'パスワードを忘れたとき'}
        </button>
      </form>
    </section>
  )
}
