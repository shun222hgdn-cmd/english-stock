import { useRef, useState } from 'react'
import Modal from './Modal'
import Choice from './Choice'
import { CheckIcon, ChevronRightIcon, DownloadIcon, KeyIcon, LogoutIcon, TrashIcon } from './Icons'
import { useBusy } from '../hooks/useBusy'
import {
  SPEECH_ACCENTS,
  SPEECH_RATES,
  isSpeechSupported,
  loadAutoSpeak,
  loadSpeechSettings,
  saveAutoSpeak,
  speakEnglish,
} from '../utils/speech'
import { saveValue } from '../lib/preferences'

/**
 * 設定（ヘッダーの歯車から開く）：ログイン中の ID、CSV の書き出し、発音、パスワード変更、ログアウト。
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
  onSignOut,
  onClose,
}) {
  const [exported, setExported] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const deleting = useBusy('削除できませんでした。')
  // 発音の設定（この端末に保存）。選ぶとその場で見本を読み上げる
  const [speech, setSpeech] = useState(loadSpeechSettings)
  const speechRef = useRef(speech) // 続けて押しても最新の組み合わせで読む
  const [autoSpeak, setAutoSpeak] = useState(loadAutoSpeak)

  function chooseSpeech(key, value, sample) {
    const next = { ...speechRef.current, [key]: value }
    speechRef.current = next
    setSpeech(next)
    saveValue(key === 'accent' ? 'speechAccent' : 'speechRate', value)
    speakEnglish(sample, next)
  }

  return (
    <Modal title="設定" onClose={onClose}>
      <p className="muted folder-lead">ログイン中：{loginId}</p>

      <ul className="ruled-list">
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
        <li className="settings-speech">
          <p className="settings-speech-title">発音</p>
          {isSpeechSupported() ? (
            <>
              <Choice
                variant="lang-switch"
                label="発音の種類"
                options={SPEECH_ACCENTS}
                value={speech.accent}
                onChange={(value) => chooseSpeech('accent', value, 'Hello')}
              />
              <Choice
                variant="lang-switch"
                label="読む速さ"
                options={SPEECH_RATES}
                value={speech.rate}
                onChange={(value) => chooseSpeech('rate', value, 'Nice to meet you')}
              />
              <Choice
                variant="lang-switch"
                label="自動読み上げ"
                options={[
                  { value: 'on', label: '自動で読む' },
                  { value: 'off', label: '押したときだけ' },
                ]}
                value={autoSpeak ? 'on' : 'off'}
                onChange={(value) => {
                  setAutoSpeak(value === 'on')
                  saveAutoSpeak(value === 'on')
                }}
              />
            </>
          ) : (
            <p className="settings-row-sub">この端末・ブラウザでは発音を使えません</p>
          )}
        </li>
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
