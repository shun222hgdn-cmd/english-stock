import { useId, useRef, useState } from 'react'
import Modal from './Modal'
import { CheckIcon, CloseIcon, FolderIcon, PencilIcon, PlusIcon, TrashIcon } from './Icons'
import { cleanFolderName } from '../utils/folders'
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
 *   onClose: () => void,
 * }} props
 */
export default function FolderDialog({ folders, currentId, counts, onSelect, onAdd, onRename, onDelete, onClose }) {
  const id = useId()
  // 行ごとの操作モード（null: 通常 / { type: 'rename', id } / { type: 'delete', id }）
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
                <span className="folder-select-count">{count}件</span>
                {isCurrent && <CheckIcon size={18} />}
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setRowMode({ type: 'rename', id: folder.id })}
                aria-label={`「${folder.name}」の名前を変更`}
                title="名前を変更"
                disabled={Boolean(rowMode) || busy}
              >
                <PencilIcon size={18} />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn-danger"
                onClick={() => setRowMode({ type: 'delete', id: folder.id })}
                aria-label={`「${folder.name}」を削除`}
                title={folders.length <= 1 ? '最後のフォルダは削除できません' : '削除'}
                disabled={Boolean(rowMode) || busy || folders.length <= 1}
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
