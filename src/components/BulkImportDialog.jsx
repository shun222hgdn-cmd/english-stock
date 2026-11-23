import { useId, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import { CheckIcon, CloseIcon } from './Icons'
import { CHATGPT_PROMPT, BULK_MAX_ROWS, markDuplicates, parseBulkText } from '../utils/bulkImport'
import { toErrorMessage } from '../utils/errors'

/**
 * 「まとめて追加」：ChatGPT などで作ったリストを貼り付けて、一度に追加する。
 * ① 貼り付け → ② 追加する内容を確認（登録済み・形式エラーは除外）→ ③ 追加
 * ChatGPT とアプリを直接つなぐのではなく、文章をコピー＆貼り付けするだけ。
 *
 * @param {{
 *   folderName: string,                                   // 追加先のフォルダ名
 *   existingStocks: Array<{ english: string }>,           // 追加先フォルダの登録データ（重複チェック用）
 *   onImport: (items: Array<object>) => Promise<number>,  // 追加して、追加した件数を返す
 *   onClose: () => void,
 * }} props
 */
export default function BulkImportDialog({ folderName, existingStocks, onImport, onClose }) {
  const id = useId()
  const [text, setText] = useState('')
  const [step, setStep] = useState('input') // 'input' | 'preview' | 'done'
  const [promptCopied, setPromptCopied] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [addedCount, setAddedCount] = useState(0)

  // 読み取り結果（確認画面で使う）
  const parsed = useMemo(() => (step === 'input' ? null : parseBulkText(text)), [step, text])
  const rows = useMemo(() => (parsed ? markDuplicates(parsed.rows, existingStocks) : []), [parsed, existingStocks])
  const toAdd = rows.filter((row) => !row.duplicate)

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(CHATGPT_PROMPT)
      setPromptCopied(true)
    } catch {
      setError('コピーできませんでした。')
    }
  }

  function readText() {
    setError('')
    if (!text.trim()) {
      setError('追加したいリストを貼り付けてください。')
      return
    }
    setStep('preview')
  }

  async function handleImport() {
    if (savingRef.current || toAdd.length === 0) return
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const count = await onImport(
        toAdd.map(({ category, english, japanese, part_of_speech, note }) => ({ category, english, japanese, part_of_speech, note })),
      )
      setAddedCount(count)
      setStep('done')
    } catch (err) {
      setError(toErrorMessage(err, '追加できませんでした。'))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function requestClose() {
    if (!savingRef.current) onClose()
  }

  return (
    <Modal
      titleId={`${id}-title`}
      onRequestClose={requestClose}
      closeOnBackdrop={!text.trim() || step === 'done'}
      className="modal-form"
    >
      <div className="modal-header">
        <h2 id={`${id}-title`} className="modal-title">
          まとめて追加
        </h2>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="閉じる" disabled={saving}>
          <CloseIcon size={20} />
        </button>
      </div>

      {step === 'done' && (
        <div className="password-done">
          <p className="saved-message">
            <CheckIcon size={18} />
            <span>
              「{folderName}」に {addedCount}件 追加しました。
            </span>
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={onClose} data-autofocus="">
            閉じる
          </button>
        </div>
      )}

      {step === 'input' && (
        <>
          <ol className="bulk-steps">
            <li>
              <button type="button" className="btn btn-secondary btn-small" onClick={copyPrompt}>
                {promptCopied ? (
                  <>
                    <CheckIcon size={16} /> コピーしました
                  </>
                ) : (
                  'ChatGPTに頼む文をコピー'
                )}
              </button>
              <span className="bulk-step-text">ChatGPT に貼り、最後に単語・フレーズを書いて送る</span>
            </li>
            <li>
              <span className="bulk-step-text">ChatGPT の答え（リスト）をコピーして、下に貼り付ける</span>
            </li>
          </ol>

          <label htmlFor={`${id}-text`} className="visually-hidden">
            追加するリスト
          </label>
          <textarea
            id={`${id}-text`}
            className="input bulk-input"
            rows={8}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (error) setError('')
            }}
            placeholder={'resilient | 回復力のある | 形容詞\nbreak the ice | 場を和ませる'}
            spellCheck="false"
            autoComplete="off"
            data-autofocus=""
          />
          <p className="muted bulk-format">
            1行に1件「英語 | 日本語訳 | 品詞 | コメント」（品詞・コメントは省略可）。表やタブ区切り、このアプリで書き出した CSV もそのまま貼れます。{BULK_MAX_ROWS}件まで。
          </p>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <button type="button" className="btn btn-primary btn-block" onClick={readText}>
            読み込む
          </button>
        </>
      )}

      {step === 'preview' && parsed && (
        <>
          <p className="bulk-summary">
            「{folderName}」に <strong>{toAdd.length}件</strong> 追加します
            {rows.length - toAdd.length + parsed.errors.length > 0 &&
              `（追加しないもの ${rows.length - toAdd.length + parsed.errors.length}件）`}
          </p>
          {parsed.tooMany && <p className="field-note">{BULK_MAX_ROWS}件を超えた分は読み込んでいません。分けて追加してください。</p>}

          <ul className="ruled-list bulk-preview">
            {rows.map((row) => (
              <li key={row.line} className={row.duplicate ? 'is-skipped' : undefined}>
                <span className="bulk-preview-en" lang="en">
                  {row.english}
                </span>
                <span className="bulk-preview-ja">
                  {row.japanese}
                  <span className="stock-category">{row.category === 'word' ? '単語' : 'フレーズ'}</span>
                  {row.part_of_speech && <span className="stock-category">{row.part_of_speech}</span>}
                  {row.duplicate && <span className="bulk-skip-tag">登録済みのため追加しない</span>}
                </span>
                {row.note && <span className="bulk-preview-note">{row.note}</span>}
              </li>
            ))}
            {parsed.errors.map((item) => (
              <li key={`e${item.line}`} className="is-skipped">
                <span className="bulk-preview-ja">
                  {item.line}行目：{item.text}
                  <span className="bulk-skip-tag">{item.reason}</span>
                </span>
              </li>
            ))}
          </ul>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions modal-actions-row">
            <button type="button" className="btn btn-secondary" onClick={() => setStep('input')} disabled={saving}>
              戻って直す
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={saving || toAdd.length === 0}
            >
              {saving ? '追加中…' : `${toAdd.length}件を追加`}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
