import { useId, useRef, useState } from 'react'
import Modal from './Modal'
import { CheckIcon, CloseIcon, FolderIcon, LockIcon, PencilIcon, PlusIcon, TrashIcon, UnlockIcon } from './Icons'
import { cleanFolderName } from '../utils/folders'
import { FOLDER_LOCK_MIN_LENGTH, validateFolderLock } from '../utils/folderLock'
import { toErrorMessage } from '../utils/errors'

/**
 * フォルダの切り替え・追加・名前変更・削除を行うダイアログ。
 * 1つのアカウントを複数人で使うとき、ここで「誰のフォルダを見るか」を選ぶ。
 *
 * @param {{
 *   folders: Array<{ id: string, name: string }>,
 *   currentId: string,
 *   counts: Record<string, number>,          // フォルダごとの登録件数
 *   onSelect: (id: string) => void,
 *   onAdd: (name: string) => Promise<{ id: string }>,
 *   onRename: (id: string, name: string) => Promise<void>,
 *   onDelete: (id: string) => Promise<void>,
 *   isFolderOpen: (folder: object) => boolean,                 // 鍵がない、または開いているフォルダか
 *   onLock: (id: string, password: string) => Promise<void>,   // 鍵をかける
 *   onRemoveLock: (id: string, password: string) => Promise<boolean>, // 鍵を外す（パスワードが違えば false）
 *   onClose: () => void,
 * }} props
 */
export default function FolderDialog({
  folders,
  currentId,
  counts,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  isFolderOpen,
  onLock,
  onRemoveLock,
  onClose,
}) {
  const id = useId()
  // 行ごとの操作モード（null: 通常 / { type: 'rename' | 'delete' | 'lock', id }）
  const [rowMode, setRowMode] = useState(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState('')

  const [newName, setNewName] = useState('')
  const [newNameError, setNewNameError] = useState('')

  /** 通信を伴う操作をまとめて実行（二重送信防止とエラー表示） */
  async function run(action) {
    if (busyRef.current) return false
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      await action()
      return true
    } catch (err) {
      setError(toErrorMessage(err, '保存に失敗しました。'))
      return false
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // フォルダを選ぶ → 切り替えて閉じる
  function handleSelect(folderId) {
    if (rowMode) return
    onSelect(folderId)
    onClose()
  }

  // 新しいフォルダを作る → そのフォルダに切り替えて閉じる
  async function handleAdd(event) {
    event.preventDefault()
    const { value, error: nameError } = cleanFolderName(newName, folders)
    setNewNameError(nameError)
    if (nameError) return
    let created
    const ok = await run(async () => {
      created = await onAdd(value)
    })
    if (ok && created) {
      onSelect(created.id)
      onClose()
    }
  }

  async function handleDelete(folderId) {
    const ok = await run(() => onDelete(folderId))
    if (ok) setRowMode(null)
  }

  function requestClose() {
    if (!busyRef.current) onClose()
  }

  return (
    <Modal titleId={`${id}-title`} onRequestClose={requestClose} closeOnBackdrop={!rowMode && !newName.trim()}>
      <div className="modal-header">
        <h2 id={`${id}-title`} className="modal-title">
          フォルダ
        </h2>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="閉じる" disabled={busy}>
          <CloseIcon size={20} />
        </button>
      </div>
      <p className="muted folder-lead">使う人ごとにフォルダを分けられます。</p>

      <ul className="folder-list">
        {folders.map((folder) => {
          const isCurrent = folder.id === currentId
          const count = counts[folder.id] ?? 0
          const isLocked = Boolean(folder.lock_hash)
          // 鍵がかかって閉じているフォルダは、件数・名前変更・削除を出さない
          const isOpen = isFolderOpen(folder)

          if (rowMode?.id === folder.id && rowMode.type === 'lock') {
            return (
              <li key={folder.id} className="folder-row">
                <LockForm
                  folder={folder}
                  busy={busy}
                  onSetLock={(password) => run(() => onLock(folder.id, password)).then((ok) => ok && setRowMode(null))}
                  onRemoveLock={async (password) => {
                    let removed = false
                    const ok = await run(async () => {
                      removed = await onRemoveLock(folder.id, password)
                    })
                    if (ok && removed) setRowMode(null)
                    // 通信エラーのときは上にエラーを出すので、ここでは「違う」とは言わない
                    return ok ? removed : true
                  }}
                  onCancel={() => setRowMode(null)}
                />
              </li>
            )
          }

          if (rowMode?.id === folder.id && rowMode.type === 'rename') {
            return (
              <li key={folder.id} className="folder-row">
                <RenameForm
                  folder={folder}
                  folders={folders}
                  busy={busy}
                  onSave={(name) => run(() => onRename(folder.id, name)).then((ok) => ok && setRowMode(null))}
                  onCancel={() => setRowMode(null)}
                />
              </li>
            )
          }

          if (rowMode?.id === folder.id && rowMode.type === 'delete') {
            return (
              <li key={folder.id} className="folder-row folder-row-danger">
                <p className="folder-delete-text">
                  「{folder.name}」と中の {count} 件を削除します。元に戻せません。
                </p>
                <div className="folder-row-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => setRowMode(null)}
                    disabled={busy}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-small"
                    onClick={() => handleDelete(folder.id)}
                    disabled={busy}
                  >
                    {busy ? '削除中…' : '削除'}
                  </button>
                </div>
              </li>
            )
          }

          return (
            <li key={folder.id} className={`folder-row${isCurrent ? ' is-current' : ''}`}>
              <button
                type="button"
                className="folder-select"
                onClick={() => handleSelect(folder.id)}
                aria-current={isCurrent ? 'true' : undefined}
                disabled={Boolean(rowMode) || busy}
              >
                <FolderIcon size={20} />
                <span className="folder-select-name">{folder.name}</span>
                {isOpen ? (
                  <span className="folder-select-count">{count}件</span>
                ) : (
                  <span className="folder-select-count" aria-label="鍵がかかっています">
                    <LockIcon size={15} />
                  </span>
                )}
                {isCurrent && <CheckIcon size={18} />}
              </button>
              <button
                type="button"
                className={`icon-btn${isLocked ? ' is-locked' : ''}`}
                onClick={() => setRowMode({ type: 'lock', id: folder.id })}
                aria-label={isLocked ? `「${folder.name}」の鍵を外す` : `「${folder.name}」に鍵をかける`}
                title={isLocked ? '鍵を外す' : '鍵をかける'}
                disabled={Boolean(rowMode) || busy}
              >
                {isLocked ? <LockIcon size={18} /> : <UnlockIcon size={18} />}
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setRowMode({ type: 'rename', id: folder.id })}
                aria-label={`「${folder.name}」の名前を変更`}
                title={isOpen ? '名前を変更' : '鍵を開けると変更できます'}
                disabled={Boolean(rowMode) || busy || !isOpen}
              >
                <PencilIcon size={18} />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn-danger"
                onClick={() => setRowMode({ type: 'delete', id: folder.id })}
                aria-label={`「${folder.name}」を削除`}
                title={
                  folders.length <= 1 ? '最後のフォルダは削除できません' : isOpen ? '削除' : '鍵を開けると削除できます'
                }
                disabled={Boolean(rowMode) || busy || folders.length <= 1 || !isOpen}
              >
                <TrashIcon size={18} />
              </button>
            </li>
          )
        })}
      </ul>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {/* 新しいフォルダの追加 */}
      <form className="folder-add" onSubmit={handleAdd} noValidate>
        <label htmlFor={`${id}-new`} className="visually-hidden">
          新しいフォルダ名
        </label>
        <input
          id={`${id}-new`}
          className="input"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value)
            if (newNameError) setNewNameError('')
          }}
          placeholder="新しいフォルダ名（例：ソヒ）"
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={Boolean(newNameError)}
          disabled={busy || Boolean(rowMode)}
        />
        <button type="submit" className="btn btn-primary" disabled={busy || Boolean(rowMode)}>
          <PlusIcon size={18} />
          <span>追加</span>
        </button>
      </form>
      {newNameError && <p className="field-error">{newNameError}</p>}
    </Modal>
  )
}

/** フォルダ名の変更フォーム（一覧の行の中に表示する） */
function RenameForm({ folder, folders, busy, onSave, onCancel }) {
  const [name, setName] = useState(folder.name)
  const [nameError, setNameError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const { value, error } = cleanFolderName(name, folders, folder.id)
    setNameError(error)
    if (error) return
    if (value === folder.name) {
      onCancel() // 変更なし
      return
    }
    onSave(value)
  }

  return (
    <form className="folder-rename" onSubmit={handleSubmit} noValidate>
      <input
        className="input"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          if (nameError) setNameError('')
        }}
        onKeyDown={(e) => {
          // Esc は名前変更だけを取り消す（ダイアログ全体は閉じない）
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            onCancel()
          }
        }}
        aria-label="フォルダ名"
        aria-invalid={Boolean(nameError)}
        autoComplete="off"
        enterKeyHint="done"
        autoFocus
        disabled={busy}
      />
      <div className="folder-row-actions">
        <button type="button" className="btn btn-secondary btn-small" onClick={onCancel} disabled={busy}>
          キャンセル
        </button>
        <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
          保存
        </button>
      </div>
      {nameError && <p className="field-error">{nameError}</p>}
    </form>
  )
}

/**
 * 鍵の設定・解除フォーム（一覧の行の中に表示する）。
 * 鍵がないフォルダ：新しいパスワードを2回入れて鍵をかける。
 * 鍵があるフォルダ：今のパスワードを入れて鍵を外す（忘れた場合は、フォルダを開く画面から管理者パスワードで外せる）。
 */
function LockForm({ folder, busy, onSetLock, onRemoveLock, onCancel }) {
  const isLocked = Boolean(folder.lock_hash)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (isLocked) {
      if (!password) {
        setError('今のパスワードを入力してください。')
        return
      }
      const removed = await onRemoveLock(password)
      if (!removed) {
        setError('パスワードが違います。')
        setPassword('')
      }
      return
    }
    const message = validateFolderLock(password, confirmation)
    setError(message)
    if (!message) onSetLock(password)
  }

  return (
    <form className="folder-rename" onSubmit={handleSubmit} noValidate>
      <p className="folder-lock-title">
        {isLocked ? `「${folder.name}」の鍵を外す` : `「${folder.name}」に鍵をかける`}
      </p>
      <input
        className="input"
        type="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          if (error) setError('')
        }}
        placeholder={isLocked ? '今のパスワード' : `パスワード（${FOLDER_LOCK_MIN_LENGTH}文字以上）`}
        aria-label={isLocked ? '今のパスワード' : '鍵のパスワード'}
        autoComplete="off"
        autoFocus
        disabled={busy}
      />
      {!isLocked && (
        <input
          className="input"
          type="password"
          value={confirmation}
          onChange={(e) => {
            setConfirmation(e.target.value)
            if (error) setError('')
          }}
          placeholder="確認のため、もう一度"
          aria-label="確認用のパスワード"
          autoComplete="off"
          disabled={busy}
        />
      )}
      {!isLocked && <p className="muted folder-lock-note">鍵付きのフォルダは、開くときにパスワードが必要になります。</p>}
      <div className="folder-row-actions">
        <button type="button" className="btn btn-secondary btn-small" onClick={onCancel} disabled={busy}>
          キャンセル
        </button>
        <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
          {isLocked ? '鍵を外す' : '鍵をかける'}
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </form>
  )
}
