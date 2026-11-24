import { useRef, useState } from 'react'
import Modal from './Modal'
import Choice from './Choice'
import { CheckIcon, ChevronRightIcon, DownloadIcon, KeyIcon, LogoutIcon } from './Icons'
import { SPEECH_ACCENTS, SPEECH_RATES, isSpeechSupported, loadSpeechSettings, speakEnglish } from '../utils/speech'
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
  signingOut,
  onOpenPassword,
  onSignOut,
  onClose,
}) {
  const [exported, setExported] = useState(false)
  // 発音の設定（この端末に保存）。選ぶとその場で見本を読み上げる
  const [speech, setSpeech] = useState(loadSpeechSettings)
  const speechRef = useRef(speech) // 続けて押しても最新の組み合わせで読む

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
