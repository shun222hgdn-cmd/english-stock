import { useEffect, useId, useRef, useState } from 'react'
import Modal from './Modal'
import { CheckIcon, CloseIcon } from './Icons'
import { toErrorMessage } from '../utils/errors'
import {
  CHATGPT_ENDPOINT,
  CHATGPT_SCHEMA_URL,
  getChatgptTokenStatus,
  issueChatgptToken,
  revokeChatgptToken,
} from '../services/chatgptService'

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

/**
 * ChatGPT 連携の設定画面（⚙ → ChatGPT連携）。
 * 専用の GPT が使う「連携キー」の発行・確認・無効化を行う。
 * ChatGPT からできるのは「フォルダ一覧を見る」「単語・フレーズを追加する」だけ。
 * アプリから AI を呼び出すことは無い。
 *
 * @param {{ onClose: () => void }} props
 */
export default function ChatgptDialog({ onClose }) {
  const id = useId()
  const [status, setStatus] = useState(undefined) // undefined: 確認中 / null: 未発行 / object: 発行済み
  const [newToken, setNewToken] = useState('') // 発行した直後だけ表示するキー
  const [copied, setCopied] = useState(false)
  const [confirm, setConfirm] = useState(null) // 'reissue' | 'revoke' | null
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getChatgptTokenStatus()
      .then((data) => active && setStatus(data))
      .catch((err) => {
        if (!active) return
        setStatus(null)
        setError(toErrorMessage(err, '連携の状態を確認できませんでした。'))
      })
    return () => {
      active = false
    }
  }, [])

  async function run(action) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(toErrorMessage(err, 'うまくいきませんでした。'))
    } finally {
      busyRef.current = false
      setBusy(false)
      setConfirm(null)
    }
  }

  const issue = () =>
    run(async () => {
      const token = await issueChatgptToken()
      setNewToken(token)
      setCopied(false)
      setStatus(await getChatgptTokenStatus())
    })

  const revoke = () =>
    run(async () => {
      await revokeChatgptToken()
      setNewToken('')
      setStatus(null)
    })

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(newToken)
      setCopied(true)
    } catch {
      setError('コピーできませんでした。キーを長押し（またはドラッグ）して選び、コピーしてください。')
    }
  }

  function requestClose() {
    if (!busyRef.current) onClose()
  }

  return (
    <Modal titleId={`${id}-title`} onRequestClose={requestClose} closeOnBackdrop={!newToken} className="modal-form">
      <div className="modal-header">
        <h2 id={`${id}-title`} className="modal-title">
          ChatGPT連携
        </h2>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="閉じる" disabled={busy}>
          <CloseIcon size={20} />
        </button>
      </div>

      <p className="muted folder-lead">
        ChatGPT から、このアカウントのフォルダに単語・フレーズを<strong>追加</strong>できるようにします。
        削除・編集・鍵付きフォルダへの追加はできません。アプリから AI に接続することはありません。
      </p>

      {/* 発行した直後だけ、キーを表示する */}
      {newToken && (
        <div className="token-box">
          <p className="token-box-title">連携キー（この画面を閉じると二度と表示されません）</p>
          <code className="token-value">{newToken}</code>
          <button type="button" className="btn btn-primary btn-small" onClick={copyToken}>
            {copied ? (
              <>
                <CheckIcon size={16} /> コピーしました
              </>
            ) : (
              'コピー'
            )}
          </button>
          <p className="token-box-note">
            ChatGPT の GPT の設定（Actions → 認証）に貼り付けてください。人に見せたり、チャットに書き込んだりしないでください。
          </p>
        </div>
      )}

      <ul className="ruled-list chatgpt-status">
        <li>
          <span className="chatgpt-status-label">状態</span>
          <span>
            {status === undefined
              ? '確認中…'
              : status
                ? `連携中（キー発行：${formatDate(status.created_at)}）`
                : '連携していません'}
          </span>
        </li>
        {status && (
          <li>
            <span className="chatgpt-status-label">最後に使われた日時</span>
            <span>{status.last_used_at ? formatDate(status.last_used_at) : 'まだ使われていません'}</span>
          </li>
        )}
      </ul>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {/* 操作ボタン（再発行・無効化はひと呼吸おいて確認する） */}
      {confirm ? (
        <div className="form-delete">
          <span className="form-delete-text">
            {confirm === 'revoke'
              ? '連携をやめますか？ChatGPT から追加できなくなります。'
              : '新しいキーを発行しますか？今のキーは使えなくなります。'}
          </span>
          <span className="folder-row-actions">
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setConfirm(null)} disabled={busy}>
              やめる
            </button>
            <button
              type="button"
              className={`btn btn-small ${confirm === 'revoke' ? 'btn-danger' : 'btn-primary'}`}
              onClick={confirm === 'revoke' ? revoke : issue}
              disabled={busy}
            >
              {confirm === 'revoke' ? '無効にする' : '発行する'}
            </button>
          </span>
        </div>
      ) : (
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={status ? () => setConfirm('reissue') : issue}
            disabled={busy || status === undefined}
          >
            {busy ? '処理中…' : status ? '連携キーを発行し直す' : '連携キーを発行する'}
          </button>
          {status && (
            <button
              type="button"
              className="btn btn-text btn-text-danger"
              onClick={() => setConfirm('revoke')}
              disabled={busy}
            >
              連携をやめる（キーを無効にする）
            </button>
          )}
        </div>
      )}

      {/* GPT の設定に使う情報 */}
      <details className="chatgpt-setup">
        <summary>ChatGPT 側の設定に使う情報</summary>
        <dl>
          <dt>スキーマの読み込み（Import from URL）</dt>
          <dd>
            <code>{CHATGPT_SCHEMA_URL}</code>
          </dd>
          <dt>受け口の URL</dt>
          <dd>
            <code>{CHATGPT_ENDPOINT}</code>
          </dd>
          <dt>認証</dt>
          <dd>API Key ／ Bearer（連携キーを貼り付け）</dd>
        </dl>
      </details>
    </Modal>
  )
}
