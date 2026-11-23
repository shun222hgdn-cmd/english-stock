import { useState } from 'react'
import { LockIcon } from '../components/Icons'
import { toErrorMessage } from '../utils/errors'

// 管理者パスワードで鍵を外したときの結果 → 画面に出すメッセージ
const ADMIN_RESULT_MESSAGES = {
  wrong_admin: '管理者パスワードが違います。5回間違えると15分間ロックされます。',
  locked: '管理者パスワードを5回間違えたため、15分間ロックされています。時間をおいてやり直してください。',
  not_set: '管理者パスワードが設定されていません。',
  not_found: 'フォルダが見つかりませんでした。',
  not_authenticated: 'ログインの有効期限が切れました。ログインし直してください。',
}

/**
 * 鍵のかかったフォルダを開くための画面。
 * フォルダのパスワードを入れると開く。忘れたときは管理者パスワードで鍵を外せる。
 *
 * @param {{
 *   folderName: string,
 *   onUnlock: (password: string) => Promise<boolean>,          // 正しければ true
 *   onClearWithAdmin: (adminPassword: string) => Promise<string>, // 'ok' など
 * }} props
 */
export default function LockedFolder({ folderName, onUnlock, onClearWithAdmin }) {
  const [password, setPassword] = useState('')
  const [adminMode, setAdminMode] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    if (!password) {
      setError(adminMode ? '管理者パスワードを入力してください。' : 'パスワードを入力してください。')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (adminMode) {
        const result = await onClearWithAdmin(password)
        if (result !== 'ok') setError(ADMIN_RESULT_MESSAGES[result] ?? '鍵を外せませんでした。')
      } else {
        const ok = await onUnlock(password)
        if (!ok) setError('パスワードが違います。')
      }
      // 成功するとフォルダの中身が表示される（この画面は閉じる）
    } catch (err) {
      setError(toErrorMessage(err, '鍵を外せませんでした。'))
    } finally {
      setBusy(false)
      setPassword('')
    }
  }

  function switchMode() {
    setAdminMode((value) => !value)
    setPassword('')
    setError('')
  }

  return (
    <section className="page">
      <form className="locked-folder" onSubmit={handleSubmit} noValidate>
        <p className="locked-folder-icon" aria-hidden="true">
          <LockIcon size={30} />
        </p>
        <h1 className="locked-folder-title">「{folderName}」には鍵がかかっています</h1>
        <p className="muted locked-folder-lead">
          {adminMode
            ? '管理者パスワードを入れると、このフォルダの鍵を外します。'
            : 'パスワードを入れると開きます。'}
        </p>

        <label htmlFor="folder-unlock" className="visually-hidden">
          {adminMode ? '管理者パスワード' : 'フォルダのパスワード'}
        </label>
        <input
          id="folder-unlock"
          className="input"
          type="password"
          autoComplete="off"
          placeholder={adminMode ? '管理者パスワード' : 'パスワード'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (error) setError('')
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
        <button type="button" className="btn btn-text locked-folder-switch" onClick={switchMode} disabled={busy}>
          {adminMode ? 'フォルダのパスワードで開く' : 'パスワードを忘れたとき'}
        </button>
      </form>
    </section>
  )
}
