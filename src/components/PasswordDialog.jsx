import { useEffect, useId, useRef, useState } from 'react'
import Modal from './Modal'
import { CheckIcon, CloseIcon, EyeIcon, EyeOffIcon } from './Icons'
import { PASSWORD_MIN_LENGTH, validateNewPassword } from '../utils/validation'
import { toErrorMessage } from '../utils/errors'
import { changePasswordWithAdmin, isAdminPasswordSet, setAdminPassword } from '../services/adminService'
import { toDisplayId } from '../utils/loginId'

// データベースの関数が返す結果 → 画面に出すメッセージ
const RESULT_MESSAGES = {
  wrong_admin: '管理者パスワードが違います。5回間違えると15分間ロックされます。',
  locked: '管理者パスワードを5回間違えたため、15分間ロックされています。時間をおいてやり直してください。',
  not_set: '管理者パスワードがまだ設定されていません。',
  already_set: '管理者パスワードはすでに設定されています。画面を開き直してください。',
  too_short: `パスワードは${PASSWORD_MIN_LENGTH}文字以上にしてください。`,
  not_authenticated: 'ログインの有効期限が切れました。ログインし直してください。',
}

/**
 * パスワード変更ダイアログ。
 * ログイン用パスワードの変更には「管理者パスワード」が必要（データベース側で確認する）。
 * 管理者パスワードがまだ無いときは、最初に設定する画面を表示する。
 *
 * @param {{
 *   email: string,          // ログイン中のメールアドレス（パスワード管理アプリの保存用）
 *   onClose: () => void,
 * }} props
 */
export default function PasswordDialog({ email, onClose }) {
  const id = useId()
  // 'checking'（確認中） / 'setup'（管理者パスワードの初期設定） / 'change'（パスワード変更） / 'error'
  const [mode, setMode] = useState('checking')
  const [doneMessage, setDoneMessage] = useState('')
  const [loadError, setLoadError] = useState('')

  // 開いたときに、管理者パスワードが設定済みかを確認する
  useEffect(() => {
    let active = true
    isAdminPasswordSet()
      .then((isSet) => {
        if (active) setMode(isSet ? 'change' : 'setup')
      })
      .catch((err) => {
        if (!active) return
        setLoadError(toErrorMessage(err, '確認できませんでした。'))
        setMode('error')
      })
    return () => {
      active = false
    }
  }, [])

  const busyRef = useRef(false)
  const [formDirty, setFormDirty] = useState(false)

  function requestClose() {
    if (!busyRef.current) onClose()
  }

  let body
  if (doneMessage) {
    body = (
      <div className="password-done">
        <p className="saved-message">
          <CheckIcon size={18} />
          <span>{doneMessage}</span>
        </p>
        <button type="button" className="btn btn-primary btn-block" onClick={onClose} data-autofocus="">
          閉じる
        </button>
      </div>
    )
  } else if (mode === 'checking') {
    body = (
      <p className="muted" aria-busy="true">
        確認中…
      </p>
    )
  } else if (mode === 'error') {
    body = (
      <p className="alert" role="alert">
        {loadError}
      </p>
    )
  } else if (mode === 'setup') {
    body = (
      <AdminSetupForm
        id={id}
        busyRef={busyRef}
        onDirty={setFormDirty}
        onDone={() => {
          setMode('change')
          setFormDirty(false)
        }}
      />
    )
  } else {
    body = (
      <ChangePasswordForm
        id={id}
        email={email}
        busyRef={busyRef}
        onDirty={setFormDirty}
        onDone={() => setDoneMessage('パスワードを変更しました。次にログインするときから、新しいパスワードを使ってください。')}
      />
    )
  }

  return (
    <Modal titleId={`${id}-title`} onRequestClose={requestClose} closeOnBackdrop={!formDirty} className="modal-form">
      <div className="modal-header">
        <h2 id={`${id}-title`} className="modal-title">
          パスワード変更
        </h2>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="閉じる">
          <CloseIcon size={20} />
        </button>
      </div>
      {body}
    </Modal>
  )
}

/**
 * 管理者パスワードの初期設定（まだ設定されていないときだけ表示）。
 */
function AdminSetupForm({ id, busyRef, onDirty, onDone }) {
  const [adminPassword, setAdmin] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (busyRef.current) return
    const message = validateNewPassword(adminPassword, confirmation)
    setError(message)
    if (message) return

    busyRef.current = true
    setSaving(true)
    try {
      const result = await setAdminPassword(adminPassword)
      if (result === 'ok') {
        setAdmin('')
        setConfirmation('')
        onDone()
      } else {
        setError(RESULT_MESSAGES[result] ?? '設定できませんでした。')
      }
    } catch (err) {
      setError(toErrorMessage(err, '設定できませんでした。'))
    } finally {
      busyRef.current = false
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="muted folder-lead">
        最初に、あなただけが知っている<strong>管理者パスワード</strong>を決めてください。
        以後、ログイン用パスワードの変更にはこの管理者パスワードが必要になります。
      </p>
      <div className="field-group">
        <PasswordField
          id={`${id}-admin-new`}
          label={`管理者パスワード（${PASSWORD_MIN_LENGTH}文字以上）`}
          value={adminPassword}
          onChange={(v) => {
            setAdmin(v)
            onDirty(true)
            if (error) setError('')
          }}
          show={show}
          onToggleShow={() => setShow((s) => !s)}
          autoFocus
          readOnly={saving}
          invalid={Boolean(error)}
        />
        <PasswordField
          id={`${id}-admin-confirm`}
          label="確認のため、もう一度入力"
          value={confirmation}
          onChange={(v) => {
            setConfirmation(v)
            onDirty(true)
            if (error) setError('')
          }}
          show={show}
          readOnly={saving}
          invalid={Boolean(error)}
        />
      </div>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
        {saving ? '設定中…' : '管理者パスワードを設定'}
      </button>
    </form>
  )
}

/**
 * 管理者パスワードを入力して、ログイン用パスワードを変更するフォーム。
 */
function ChangePasswordForm({ id, email, busyRef, onDirty, onDone }) {
  const [adminPassword, setAdmin] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function change(setter) {
    return (value) => {
      setter(value)
      onDirty(true)
      if (error) setError('')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busyRef.current) return
    if (!adminPassword) {
      setError('管理者パスワードを入力してください。')
      return
    }
    const message = validateNewPassword(password, confirmation)
    setError(message)
    if (message) return

    busyRef.current = true
    setSaving(true)
    try {
      const result = await changePasswordWithAdmin(adminPassword, password)
      if (result === 'ok') {
        // 入力したパスワードを画面のメモリから消して、完了表示にする
        setAdmin('')
        setPassword('')
        setConfirmation('')
        onDone()
      } else {
        setError(RESULT_MESSAGES[result] ?? 'パスワードを変更できませんでした。')
        if (result === 'wrong_admin') setAdmin('')
      }
    } catch (err) {
      setError(toErrorMessage(err, 'パスワードを変更できませんでした。'))
    } finally {
      busyRef.current = false
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="muted folder-lead">ID「{toDisplayId(email)}」のログイン用パスワードを変更します。</p>

      {/* パスワード管理アプリが「どのアカウントのパスワードか」を判断するための欄（画面には表示しない） */}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />

      <div className="field-group">
        <PasswordField
          id={`${id}-admin`}
          label="管理者パスワード"
          value={adminPassword}
          onChange={change(setAdmin)}
          show={show}
          onToggleShow={() => setShow((s) => !s)}
          autoComplete="off"
          autoFocus
          readOnly={saving}
          invalid={Boolean(error) && !adminPassword}
        />
      </div>

      <div className="field-group">
        <PasswordField
          id={`${id}-new`}
          label={`新しいログイン用パスワード（${PASSWORD_MIN_LENGTH}文字以上）`}
          value={password}
          onChange={change(setPassword)}
          show={show}
          autoComplete="new-password"
          readOnly={saving}
          invalid={Boolean(error) && Boolean(adminPassword)}
        />
        <PasswordField
          id={`${id}-confirm`}
          label="確認のため、もう一度入力"
          value={confirmation}
          onChange={change(setConfirmation)}
          show={show}
          autoComplete="new-password"
          readOnly={saving}
          invalid={Boolean(error) && Boolean(adminPassword)}
        />
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
  )
}

/** パスワード入力欄（カードの中の1行）。onToggleShow があれば表示/非表示ボタンを付ける */
function PasswordField({ id, label, value, onChange, show, onToggleShow, autoComplete = 'new-password', autoFocus, readOnly, invalid }) {
  return (
    <div className={`group-field${invalid ? ' has-error' : ''}`}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        className="group-input"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        readOnly={readOnly}
        // 確認が終わってから表示される欄なので、表示されたときに自分でカーソルを置く
        autoFocus={autoFocus}
      />
      {onToggleShow && (
        <button
          type="button"
          className="clear-btn"
          onClick={onToggleShow}
          aria-label={show ? 'パスワードを隠す' : 'パスワードを表示'}
          aria-pressed={show}
        >
          {show ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      )}
    </div>
  )
}
