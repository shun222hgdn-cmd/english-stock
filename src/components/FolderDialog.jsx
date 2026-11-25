import { useState } from 'react'
import Modal from './Modal'
import { CloseIcon, FolderIcon, FolderPlusIcon, LockIcon, MoreIcon, PencilIcon, PlusIcon, TrashIcon, UnlockIcon } from './Icons'
import { MAX_FOLDER_DEPTH, cleanFolderName, folderDepth, folderSubtree } from '../utils/folders'
import { FOLDER_LOCK_MIN_LENGTH, validateFolderLock } from '../utils/folderLock'
import { useBusy } from '../hooks/useBusy'

/**
 * フォルダの切り替え・追加・名前変更・鍵・削除（1つのアカウントを複数人で使うとき、ここで誰のフォルダを見るか選ぶ）。
 * フォルダの中にフォルダを作れる（5段まで）。一覧は木の形で、中のフォルダは字下げして並べる。
 *
 * @param {{
 *   folders: Array<{ id: string, name: string, lock_hash: string | null }>,
 *   currentId: string,
 *   counts: Record<string, number>,          // フォルダごとの登録件数
 *   onSelect: (id: string) => void,
 *   onAdd: (name: string) => Promise<{ id: string }>,
 *   onAddChild: (parentId: string, name: string) => Promise<{ id: string }>, // フォルダの中に作る
 *   onRename: (id: string, name: string) => Promise<void>,
 *   onDelete: (id: string) => Promise<void>,
 *   isFolderOpen: (folder: object) => boolean,                        // 鍵がない、または開いているフォルダか
 *   onLock: (id: string, password: string) => Promise<void>,
 *   onRemoveLock: (id: string, password: string) => Promise<boolean>, // パスワードが違えば false
 *   onClose: () => void,
 * }} props
 */
export default function FolderDialog({
  folders,
  currentId,
  counts,
  onSelect,
  onAdd,
  onAddChild,
  onRename,
  onDelete,
  isFolderOpen,
  onLock,
  onRemoveLock,
  onClose,
}) {
  // 行ごとの操作（null: 通常 / { type: 'rename' | 'delete' | 'lock' | 'child', id }）
  const [rowMode, setRowMode] = useState(null)
  // 「⋯」で操作（鍵・名前変更・削除）を出している行の id
  const [menuId, setMenuId] = useState(null)
  const { busy, error, run } = useBusy('保存に失敗しました。')
  const [newName, setNewName] = useState('')
  const [newNameError, setNewNameError] = useState('')
  const locked = Boolean(rowMode) || busy

  /** 通信して、成功したら行の操作を終える */
  const runRow = async (action) => (await run(action)) && setRowMode(null)

  function selectAndClose(folderId) {
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
    if (await run(async () => (created = await onAdd(value)))) selectAndClose(created.id)
  }

  function renderRow(folder) {
    const isCurrent = folder.id === currentId
    const count = counts[folder.id] ?? 0
    const isLocked = Boolean(folder.lock_hash)
    const isOpen = isFolderOpen(folder) // 閉じている鍵付きフォルダは、件数・名前変更・削除を出さない
    const mode = rowMode?.id === folder.id ? rowMode.type : null
    const cancel = () => setRowMode(null)
    const depth = folderDepth(folders, folder.id)
    const subtree = folderSubtree(folders, folder.id)

    if (mode === 'lock') {
      return (
        <LockForm
          folder={folder}
          busy={busy}
          onSetLock={(password) => runRow(() => onLock(folder.id, password))}
          onRemoveLock={async (password) => {
            let removed = false
            const ok = await run(async () => (removed = await onRemoveLock(folder.id, password)))
            if (ok && removed) cancel()
            return ok ? removed : true // 通信エラーは上にエラーを出すので、ここでは「違う」とは言わない
          }}
          onCancel={cancel}
        />
      )
    }
    if (mode === 'child') {
      return (
        <RenameForm
          folder={{ id: null, name: '' }}
          label={`「${folder.name}」の中に`}
          submitLabel="作成"
          folders={folders}
          busy={busy}
          onSave={async (name) => {
            let created
            if (await run(async () => (created = await onAddChild(folder.id, name)))) selectAndClose(created.id)
          }}
          onCancel={cancel}
        />
      )
    }
    if (mode === 'rename') {
      return (
        <RenameForm folder={folder} folders={folders} busy={busy} onSave={(name) => runRow(() => onRename(folder.id, name))} onCancel={cancel} />
      )
    }
    if (mode === 'delete') {
      return (
        <>
          <p className="folder-delete-text">
            {subtree.size > 1
              ? `「${folder.name}」と、中のフォルダ・${count}件を削除します。`
              : `「${folder.name}」と中の ${count} 件を削除します。`}
          </p>
          <div className="folder-row-actions">
            <button type="button" className="btn btn-secondary btn-small" onClick={cancel} disabled={busy}>
              キャンセル
            </button>
            {/* 削除したら閉じて、画面の下の「元に戻す」が見えるようにする */}
            <button
              type="button"
              className="btn btn-danger btn-small"
              onClick={async () => (await run(() => onDelete(folder.id))) && onClose()}
              disabled={busy}
            >
              {busy ? '削除中…' : '削除'}
            </button>
          </div>
        </>
      )
    }

    const menuOpen = menuId === folder.id
    const openMode = (type) => {
      setMenuId(null)
      setRowMode({ type, id: folder.id })
    }

    return (
      <>
        <button
          type="button"
          className="folder-select"
          // 中のフォルダは、段の深さだけ字下げする
          style={{ paddingLeft: `${8 + (depth - 1) * 20}px` }}
          onClick={() => selectAndClose(folder.id)}
          aria-current={isCurrent ? 'true' : undefined}
          disabled={locked}
        >
          <FolderIcon size={20} />
          <span className="folder-select-name">{folder.name}</span>
          {isLocked && (
            <span className="folder-lock-mark" aria-label="鍵付き">
              <LockIcon size={15} />
            </span>
          )}
          {isOpen && !menuOpen && <span className="folder-select-count">{count}件</span>}
        </button>

        {/* 操作は「⋯」を押したときだけ出す（ふだんの一覧をすっきりさせる） */}
        {menuOpen && (
          <span className="folder-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => openMode('child')}
              aria-label={`「${folder.name}」の中にフォルダを追加`}
              title={depth >= MAX_FOLDER_DEPTH ? `フォルダは${MAX_FOLDER_DEPTH}段までです` : isOpen ? '中にフォルダを追加' : '鍵を開けると追加できます'}
              disabled={locked || !isOpen || depth >= MAX_FOLDER_DEPTH}
            >
              <FolderPlusIcon size={18} />
            </button>
            <button
              type="button"
              className={`icon-btn${isLocked ? ' is-locked' : ''}`}
              onClick={() => openMode('lock')}
              aria-label={isLocked ? `「${folder.name}」の鍵を外す` : `「${folder.name}」に鍵をかける`}
              title={isLocked ? '鍵を外す' : '鍵をかける'}
              disabled={locked}
            >
              {isLocked ? <LockIcon size={18} /> : <UnlockIcon size={18} />}
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => openMode('rename')}
              aria-label={`「${folder.name}」の名前を変更`}
              title={isOpen ? '名前を変更' : '鍵を開けると変更できます'}
              disabled={locked || !isOpen}
            >
              <PencilIcon size={18} />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn-danger"
              onClick={() => openMode('delete')}
              aria-label={`「${folder.name}」を削除`}
              title={subtree.size >= folders.length ? '最後のフォルダは削除できません' : isOpen ? '削除' : '鍵を開けると削除できます'}
              disabled={locked || subtree.size >= folders.length || !isOpen}
            >
              <TrashIcon size={18} />
            </button>
          </span>
        )}
        <button
          type="button"
          className="icon-btn folder-more"
          onClick={() => setMenuId(menuOpen ? null : folder.id)}
          aria-label={menuOpen ? '操作を閉じる' : `「${folder.name}」の操作`}
          aria-expanded={menuOpen}
          disabled={locked}
        >
          {menuOpen ? <CloseIcon size={18} /> : <MoreIcon size={20} />}
        </button>
      </>
    )
  }

  return (
    <Modal title="フォルダ" onClose={onClose} busy={busy} closeOnBackdrop={!rowMode && !newName.trim()}>
      <ul className="folder-list">
        {folders.map((folder) => {
          const mode = rowMode?.id === folder.id ? rowMode.type : null
          const className = mode === 'delete' ? ' folder-row-danger' : !mode && folder.id === currentId ? ' is-current' : ''
          return (
            <li key={folder.id} className={`folder-row${className}`}>
              {renderRow(folder)}
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
        <input
          className="input"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value)
            setNewNameError('')
          }}
          aria-label="新しいフォルダ名"
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={Boolean(newNameError)}
          disabled={locked}
        />
        <button type="submit" className="btn btn-primary" disabled={locked}>
          <PlusIcon size={18} />
          <span>追加</span>
        </button>
      </form>
      {newNameError && <p className="field-error">{newNameError}</p>}
    </Modal>
  )
}

/** 行の中の小さなフォーム（名前変更・鍵）の共通の枠：入力欄、キャンセル・決定ボタン、エラー */
function RowForm({ onSubmit, busy, submitLabel, onCancel, error, children }) {
  return (
    <form className="folder-rename" onSubmit={onSubmit} noValidate>
      {children}
      <div className="folder-row-actions">
        <button type="button" className="btn btn-secondary btn-small" onClick={onCancel} disabled={busy}>
          キャンセル
        </button>
        <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
          {submitLabel}
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </form>
  )
}

/** フォルダ名の変更（label・submitLabel を渡すと「中にフォルダを作る」にも使う） */
function RenameForm({ folder, folders, busy, onSave, onCancel, label, submitLabel = '保存' }) {
  const [name, setName] = useState(folder.name)
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const result = cleanFolderName(name, folders, folder.id)
    setError(result.error)
    if (result.error) return
    if (result.value === folder.name) onCancel() // 変更なし
    else onSave(result.value)
  }

  return (
    <RowForm onSubmit={handleSubmit} busy={busy} submitLabel={submitLabel} onCancel={onCancel} error={error}>
      {label && <span className="folder-lock-label">{label}</span>}
      <input
        className="input"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setError('')
        }}
        onKeyDown={(e) => {
          // Esc は名前変更だけを取り消す（ダイアログ全体は閉じない）
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            onCancel()
          }
        }}
        aria-label={label ? `${label}作るフォルダの名前` : 'フォルダ名'}
        aria-invalid={Boolean(error)}
        autoComplete="off"
        enterKeyHint="done"
        autoFocus
        disabled={busy}
      />
    </RowForm>
  )
}

/**
 * 鍵の設定・解除。鍵がないフォルダは新しいパスワードを2回入れて鍵をかけ、
 * 鍵があるフォルダは今のパスワードで外す（忘れたら、フォルダを開く画面から管理者パスワードで外せる）。
 */
function LockForm({ folder, busy, onSetLock, onRemoveLock, onCancel }) {
  const isLocked = Boolean(folder.lock_hash)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (isLocked) {
      if (!password) return setError('今のパスワードを入力してください。')
      if (!(await onRemoveLock(password))) {
        setError('パスワードが違います。')
        setPassword('')
      }
      return
    }
    const message = validateFolderLock(password, confirmation)
    setError(message)
    if (!message) onSetLock(password)
  }

  const input = (value, setValue, props) => (
    <input
      className="input"
      type="password"
      value={value}
      onChange={(e) => {
        setValue(e.target.value)
        setError('')
      }}
      autoComplete="off"
      disabled={busy}
      {...props}
    />
  )

  return (
    <RowForm onSubmit={handleSubmit} busy={busy} submitLabel={isLocked ? '鍵を外す' : '鍵をかける'} onCancel={onCancel} error={error}>
      <p className="folder-lock-title">{isLocked ? `「${folder.name}」の鍵を外す` : `「${folder.name}」に鍵をかける`}</p>
      {/* 鍵をかけるときは入力欄が2つ並ぶので、小さく見出しを付ける（外すときは1つなので無し） */}
      {!isLocked && <span className="folder-lock-label">パスワード（{FOLDER_LOCK_MIN_LENGTH}文字以上）</span>}
      {input(password, setPassword, {
        'aria-label': isLocked ? '今のパスワード' : '鍵のパスワード',
        autoFocus: true,
      })}
      {!isLocked && (
        <>
          <span className="folder-lock-label">もう一度</span>
          {input(confirmation, setConfirmation, { 'aria-label': '確認用のパスワード' })}
          <p className="muted folder-lock-note">鍵付きのフォルダは、開くときにパスワードが必要になります。</p>
        </>
      )}
    </RowForm>
  )
}
