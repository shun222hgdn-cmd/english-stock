import { useEffect, useId, useState } from 'react'
import Modal from './Modal'
import { CheckIcon, EyeIcon, EyeOffIcon } from './Icons'
import { PASSWORD_MIN_LENGTH, validateNewPassword } from '../utils/validation'
import { ADMIN_RESULT_MESSAGES, toErrorMessage } from '../utils/errors'
import { changePasswordWithAdmin, isAdminPasswordSet, setAdminPassword } from '../services/api'
import { toDisplayId } from '../utils/loginId'
import { useBusy } from '../hooks/useBusy'

const EMPTY = { admin: '', password: '', confirmation: '' }

/**
 * パスワード変更。ログイン用パスワードの変更には「管理者パスワード」が必要（データベース側で確認する）。
 * 管理者パスワードがまだ無いときは、先にそれを決める画面（setup）を出す。
 *
 * @param {{ email: string, onClose: () => void }} props
 */
export default function PasswordDialog({ email, onClose }) {
  const id = useId()
  // 'checking' / 'setup'（管理者パスワードの初期設定） / 'change' / 'done' / 'error'
  const [mode, setMode] = useState('checking')
  const [loadError, setLoadError] = useState('')
  const [values, setValues] = useState(EMPTY)
  const [show, setShow] = useState(false)
  const setup = mode === 'setup'
  const { busy, error, setError, run } = useBusy(setup ? '設定できませんでした。' : 'パスワードを変更できませんでした。')

  useEffect(() => {
    let active = true
    isAdminPasswordSet()
      .then((isSet) => active && setMode(isSet ? 'change' : 'setup'))
      .catch((err) => {
        if (!active) return
        setLoadError(toErrorMessage(err, '確認できませんでした。'))
        setMode('error')
      })
    return () => {
      active = false
    }
  }, [])

  function handleSubmit(event) {
    event.preventDefault()
    const { admin, password, confirmation } = values
    if (!setup && !admin) return setError('管理者パスワードを入力してください。')
    const message = setup ? validateNewPassword(admin, confirmation) : validateNewPassword(password, confirmation)
    if (message) return setError(message)

    run(async () => {
      const result = setup ? await setAdminPassword(admin) : await changePasswordWithAdmin(admin, password)
      if (result === 'ok') {
        setValues(EMPTY) // 入力したパスワードを画面のメモリから消す
        setShow(false)
        setMode(setup ? 'change' : 'done')
      } else {
        setError(ADMIN_RESULT_MESSAGES[result] ?? (setup ? '設定できませんでした。' : 'パスワードを変更できませんでした。'))
        if (result === 'wrong_admin') setValues((v) => ({ ...v, admin: '' }))
      }
    })
  }

  const field = (name, label, extra) => (
    <PasswordField
      id={`${id}-${name}`}
      label={label}
      value={values[name]}
      onChange={(value) => {
        setValues((v) => ({ ...v, [name]: value }))
        setError('')
      }}
      show={show}
      readOnly={busy}
      {...extra}
    />
  )
  const dirty = Object.values(values).some(Boolean)
  // エラー時に赤くする欄：初期設定は両方。変更は、管理者パスワードが空ならそこ、入っていれば新しい方
  const adminInvalid = Boolean(error) && (setup || !values.admin)
  const newInvalid = Boolean(error) && (setup || Boolean(values.admin))
  const toggleShow = () => setShow((s) => !s)

  let body
  if (mode === 'done') {
    body = (
      <div className="password-done">
        <p className="saved-message">
          <CheckIcon size={18} />
          <span>パスワードを変更しました。次にログインするときから、新しいパスワードを使ってください。</span>
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
  } else {
    body = (
      <form key={mode} onSubmit={handleSubmit} noValidate>
        {setup ? (
          <p className="muted folder-lead">
            最初に、あなただけが知っている<strong>管理者パスワード</strong>を決めてください。
            以後、ログイン用パスワードの変更にはこの管理者パスワードが必要になります。
          </p>
        ) : (
          <>
            <p className="muted folder-lead">ID「{toDisplayId(email)}」のログイン用パスワードを変更します。</p>
            {/* パスワード管理アプリが「どのアカウントのパスワードか」を判断するための欄（画面には表示しない） */}
            <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
          </>
        )}

        <div className="field-group">
          {field('admin', setup ? `管理者パスワード（${PASSWORD_MIN_LENGTH}文字以上）` : '管理者パスワード', {
            onToggleShow: toggleShow,
            autoComplete: setup ? 'new-password' : 'off',
            autoFocus: true,
            invalid: adminInvalid,
          })}
          {setup && field('confirmation', '確認のため、もう一度入力', { invalid: adminInvalid })}
        </div>
        {!setup && (
          <div className="field-group">
            {field('password', `新しいログイン用パスワード（${PASSWORD_MIN_LENGTH}文字以上）`, { invalid: newInvalid })}
            {field('confirmation', '確認のため、もう一度入力', { invalid: newInvalid })}
          </div>
        )}

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {setup ? (busy ? '設定中…' : '管理者パスワードを設定') : busy ? '変更中…' : 'パスワードを変更'}
        </button>
      </form>
    )
  }

  return (
    <Modal title="パスワード変更" onClose={onClose} busy={busy} closeOnBackdrop={!dirty} className="modal-form modal-top">
      {body}
    </Modal>
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
        autoFocus={autoFocus} // 確認が終わってから表示される欄なので、表示されたときに自分でカーソルを置く
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
