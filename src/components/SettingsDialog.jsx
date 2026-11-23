import { useId, useState } from 'react'
import { SPEECH_ACCENTS, SPEECH_RATES, isSpeechSupported, speakEnglish } from '../utils/speech'
import { loadChoice, saveChoice } from '../lib/preferences'
import Modal from './Modal'
import { ChatIcon, CheckIcon, ChevronRightIcon, CloseIcon, DownloadIcon, KeyIcon, LogoutIcon } from './Icons'

/**
 * 設定（ヘッダーの歯車から開く）。
 * ログイン中の ID と、CSV の書き出し・パスワード変更・ログアウトをまとめる。
 *
 * @param {{
 *   loginId: string,               // ログイン中の ID（メールアドレスのアカウントはアドレス）
 *   folderName?: string,           // 書き出す対象のフォルダ名（表示中のフォルダ）
 *   exportCount: number,           // 書き出す件数
 *   canExport: boolean,            // 書き出せるか（鍵が閉じているフォルダ・フォルダなしは不可）
 *   onExportCsv: () => void,
 *   signingOut: boolean,
 *   onOpenPassword: () => void,
 *   onOpenChatgpt: () => void,     // ChatGPT連携の画面を開く
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
  onOpenChatgpt,
  onSignOut,
  onClose,
}) {
  const id = useId()
  const [exported, setExported] = useState(false)
  // 発音の設定（この端末に保存）
  const [accent, setAccent] = useState(() => loadChoice('speechAccent', SPEECH_ACCENTS.map((a) => a.value), 'en-US'))
  const [rate, setRate] = useState(() => loadChoice('speechRate', SPEECH_RATES.map((r) => r.value), 'normal'))

  function chooseAccent(value) {
    setAccent(value)
    saveChoice('speechAccent', value)
    speakEnglish('Hello', { accent: value, rate }) // 選んだ声をその場で聞ける
  }
  function chooseRate(value) {
    setRate(value)
    saveChoice('speechRate', value)
    speakEnglish('Nice to meet you', { accent, rate: value })
  }

  function handleExport() {
    onExportCsv()
    setExported(true)
  }

  return (
    <Modal titleId={`${id}-title`} onRequestClose={onClose}>
      <div className="modal-header">
        <h2 id={`${id}-title`} className="modal-title">
          設定
        </h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="閉じる">
          <CloseIcon size={20} />
        </button>
      </div>

      <p className="muted folder-lead">ログイン中：{loginId}</p>

      <ul className="ruled-list">
        <li>
          <button type="button" className="settings-row" onClick={handleExport} disabled={!canExport}>
            <DownloadIcon size={18} />
            <span className="settings-row-label">
              CSVで書き出す
              <span className="settings-row-sub">
                {canExport
                  ? `「${folderName}」の単語・フレーズ ${exportCount}件`
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
              <div className="lang-switch" role="group" aria-label="発音の種類">
                {SPEECH_ACCENTS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`lang-switch-btn${accent === value ? ' is-active' : ''}`}
                    aria-pressed={accent === value}
                    onClick={() => chooseAccent(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="lang-switch" role="group" aria-label="読む速さ">
                {SPEECH_RATES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`lang-switch-btn${rate === value ? ' is-active' : ''}`}
                    aria-pressed={rate === value}
                    onClick={() => chooseRate(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="settings-row-sub">この端末・ブラウザでは発音を使えません</p>
          )}
        </li>
        <li>
          <button type="button" className="settings-row" onClick={onOpenChatgpt}>
            <ChatIcon size={18} />
            <span className="settings-row-label">
              ChatGPT連携
              <span className="settings-row-sub">ChatGPT から単語・フレーズを追加できるようにする</span>
            </span>
            <ChevronRightIcon size={18} className="settings-row-arrow" />
          </button>
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
