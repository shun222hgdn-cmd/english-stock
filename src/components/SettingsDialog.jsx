import { useState } from 'react'
import Modal from './Modal'
import { CheckIcon, ChevronRightIcon, ClipboardIcon, DownloadIcon, KeyIcon, LogoutIcon, TrashIcon } from './Icons'
import { useBusy } from '../hooks/useBusy'

/**
 * 設定（ヘッダーの歯車から開く）：まとめて追加、CSV の書き出し、覚えたものの削除、パスワード変更、ログアウト。
 * 発音の設定は「暗記の設定」にある。
 *
 * @param {{
 *   loginId: string,
 *   folderName?: string,   // 書き出す対象（表示中のフォルダ）
 *   exportCount: number,
 *   canExport: boolean,    // 鍵が閉じているフォルダ・フォルダなしは書き出せない
 *   onExportCsv: () => void,
 *   learnedCount: number,           // 表示中のフォルダで「覚えた」が付いている件数
 *   onDeleteLearned: () => Promise<void>,
 *   signingOut: boolean,
 *   onOpenPassword: () => void,
 *   onOpenBulk: () => void,         // まとめて追加を開く
 *   onSignOut: () => void,
 *   onClose: () => void,
 * }} props
 */
export default function SettingsDialog({
  loginId,
  folderName,
  exportCount,
  canExport,
  onExportCsv,
  learnedCount,
  onDeleteLearned,
  signingOut,
  onOpenPassword,
  onOpenBulk,
  onSignOut,
  onClose,
}) {
  const [exported, setExported] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const deleting = useBusy('削除できませんでした。')

  return (
    <Modal title="設定" onClose={onClose}>
      <p className="muted folder-lead">ログイン中：{loginId}</p>

      {/* 表示中のフォルダに対する操作 */}
      <ul className="settings-group">
        <li>
          <button type="button" className="settings-row" onClick={onOpenBulk} disabled={!canExport}>
            <ClipboardIcon size={18} />
            <span className="settings-row-label">まとめて追加</span>
            <ChevronRightIcon size={18} className="settings-row-arrow" />
          </button>
        </li>
        <li>
          <button
            type="button"
            className="settings-row"
            onClick={() => {
              onExportCsv()
              setExported(true)
            }}
            disabled={!canExport}
          >
            <DownloadIcon size={18} />
            <span className="settings-row-label">
              CSVで書き出す
              <span className="settings-row-sub">
                {canExport
                  ? `「${folderName}」の ${exportCount}件`
                  : folderName
                    ? `「${folderName}」は鍵が閉じているため書き出せません`
                    : 'フォルダがありません'}
              </span>
            </span>
          </button>
          {exported && (
            <p className="saved-message settings-done" role="status">
              <CheckIcon size={16} />
              <span>書き出しました（ダウンロードフォルダを確認してください）</span>
            </p>
          )}
        </li>
        <li>
          {confirmingDelete ? (
            <div className="settings-confirm">
              <p className="settings-confirm-text">
                「{folderName}」の覚えた {learnedCount}件を削除します。削除してから8秒間は「元に戻す」で戻せます。
              </p>
              <span className="folder-row-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting.busy}
                >
                  やめる
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={() => deleting.run(onDeleteLearned)}
                  disabled={deleting.busy}
                >
                  {deleting.busy ? '削除中…' : `${learnedCount}件を削除`}
                </button>
              </span>
              {deleting.error && (
                <p className="field-error" role="alert">
                  {deleting.error}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="settings-row settings-row-danger"
              onClick={() => setConfirmingDelete(true)}
              disabled={!canExport || learnedCount === 0}
            >
              <TrashIcon size={18} />
              <span className="settings-row-label">
                覚えたものを削除
                <span className="settings-row-sub">
                  {!canExport
                    ? '鍵が閉じているフォルダでは使えません'
                    : learnedCount === 0
                      ? `「${folderName}」に覚えたものはありません`
                      : `「${folderName}」の覚えた ${learnedCount}件`}
                </span>
              </span>
            </button>
          )}
        </li>
      </ul>

      <ul className="settings-group">
        <li>
          <button type="button" className="settings-row" onClick={onOpenPassword}>
            <KeyIcon size={18} />
            <span className="settings-row-label">パスワード変更</span>
            <ChevronRightIcon size={18} className="settings-row-arrow" />
          </button>
        </li>
        <li>
          <button type="button" className="settings-row settings-row-danger" onClick={onSignOut} disabled={signingOut}>
            <LogoutIcon size={18} />
            <span className="settings-row-label">{signingOut ? 'ログアウト中…' : 'ログアウト'}</span>
          </button>
        </li>
      </ul>
    </Modal>
  )
}
