import { useId, useRef, useState } from 'react'
import Modal from './Modal'
import { CheckIcon, CloseIcon, EyeIcon, EyeOffIcon } from './Icons'
import { PASSWORD_MIN_LENGTH, validateNewPassword } from '../utils/validation'
import { toErrorMessage } from '../utils/errors'

/**
 * パスワード変更ダイアログ。
 * 新しいパスワードを2回入力して保存する（入力したパスワードは Supabase に直接送られる）。
 *
 * @param {{
 *   email: string,                                  // ログイン中のメールアドレス（パスワード管理アプリの保存用）
 *   onChangePassword: (password: string) => Promise<void>,
 *   onClose: () => void,
 * }} props
 */
export default function PasswordDialog({ email, onChangePassword, onClose }) {
  const id = useId()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const savingRef = useRef(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (savingRef.current) return

    const message = validateNewPassword(password, confirmation)
    setError(message)
    if (message) return

    savingRef.current = true
    setSaving(true)
    try {
      await onChangePassword(password)
      // 成功：入力したパスワードを画面のメモリから消して、完了表示にする
      setPassword('')
      setConfirmation('')
      setDone(true)
    } catch (err) {
      setError(toErrorMessage(err, 'パスワードを変更できませんでした。'))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function requestClose() {
    if (!savingRef.current) onClose()
  }

  const isEmpty = password === '' && confirmation === ''

  return (
    <Modal titleId={`${id}-title`} onRequestClose={requestClose} closeOnBackdrop={isEmpty} className="modal-form">
      <div className="modal-header">
        <h2 id={`${id}-title`} className="modal-title">
          Password
        </h2>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="閉じる" disabled={saving}>
          <CloseIcon size={20} />
        </button>
      </div>

      {done ? (
        // 変更完了
        <div className="password-done">
          <p className="saved-message">
            <CheckIcon size={18} />
            <span>パスワードを変更しました。</span>
          </p>
          <p className="muted">
            次にログインするときから、新しいパスワードを使ってください。今ログインしている端末は、そのまま使えます。
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={onClose} data-autofocus="">
            閉じる
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <p className="muted folder-lead">{email} の新しいパスワードを設定します。</p>

          {/* パスワード管理アプリが「どのアカウントのパスワードか」を判断するための欄（画面には表示しない） */}
          <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />

          <div className="field-group">
            <div className="group-field">
              <label htmlFor={`${id}-new`} className="field-label">
                新しいパスワード（{PASSWORD_MIN_LENGTH}文字以上）
              </label>
              <input
                id={`${id}-new`}
                className="group-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                autoComplete="new-password"
                aria-invalid={Boolean(error)}
                readOnly={saving}
                data-autofocus=""
              />
              <button
                type="button"
                className="clear-btn"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
            <div className="group-field">
              <label htmlFor={`${id}-confirm`} className="field-label">
                確認のため、もう一度入力
              </label>
              <input
                id={`${id}-confirm`}
                className="group-input"
                type={showPassword ? 'text' : 'password'}
                value={confirmation}
                onChange={(e) => {
                  setConfirmation(e.target.value)
                  if (error) setError('')
                }}
                autoComplete="new-password"
                aria-invalid={Boolean(error)}
                readOnly={saving}
                enterKeyHint="done"
              />
            </div>
          </div>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? '変更中…' : 'パスワードを変更'}
          </button>
        </form>
      )}
    </Modal>
  )
}
