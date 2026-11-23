import { useMemo, useState } from 'react'
import Modal from './Modal'
import { CheckIcon } from './Icons'
import { CHATGPT_PROMPT, BULK_MAX_ROWS, markDuplicates, parseBulkText } from '../utils/bulkImport'
import { useBusy } from '../hooks/useBusy'

/**
 * 「まとめて追加」：ChatGPT などで作ったリストを貼り付けて、一度に追加する（文章をコピー＆貼り付けするだけ）。
 * ① 貼り付け → ② 追加する内容を確認（登録済み・形式エラーは除外）→ ③ 追加
 *
 * @param {{
 *   folderName: string,
 *   existingStocks: Array<{ english: string }>,           // 追加先フォルダの登録データ（重複チェック用）
 *   onImport: (items: Array<object>) => Promise<number>,  // 追加して、追加した件数を返す
 *   onClose: () => void,
 * }} props
 */
export default function BulkImportDialog({ folderName, existingStocks, onImport, onClose }) {
  const [text, setText] = useState('')
  const [step, setStep] = useState('input') // 'input' | 'preview' | 'done'
  const [promptCopied, setPromptCopied] = useState(false)
  const [addedCount, setAddedCount] = useState(0)
  const { busy, error, setError, run } = useBusy('追加できませんでした。')

  const parsed = useMemo(() => (step === 'input' ? null : parseBulkText(text)), [step, text])
  const rows = useMemo(() => (parsed ? markDuplicates(parsed.rows, existingStocks) : []), [parsed, existingStocks])
  const toAdd = rows.filter((row) => !row.duplicate)
  const skipped = rows.length - toAdd.length + (parsed?.errors.length ?? 0)

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(CHATGPT_PROMPT)
      setPromptCopied(true)
    } catch {
      setError('コピーできませんでした。')
    }
  }

  function readText() {
    if (!text.trim()) return setError('追加したいリストを貼り付けてください。')
    setError('')
    setStep('preview')
  }

  function handleImport() {
    if (toAdd.length === 0) return
    run(async () => {
      setAddedCount(await onImport(toAdd.map(({ line, duplicate, ...item }) => item)))
      setStep('done')
    })
  }

  const errorBox = error && (
    <p className="alert" role="alert">
      {error}
    </p>
  )

  return (
    <Modal title="まとめて追加" onClose={onClose} busy={busy} closeOnBackdrop={!text.trim() || step === 'done'} className="modal-form">
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

          <textarea
            className="input bulk-input"
            rows={8}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError('')
            }}
            aria-label="追加するリスト"
            placeholder={'resilient | 回復力のある | 形容詞\nbreak the ice | 場を和ませる'}
            spellCheck="false"
            autoComplete="off"
            data-autofocus=""
          />
          <p className="muted bulk-format">
            1行に1件「英語 | 日本語訳 | 品詞 | コメント」（品詞・コメントは省略可）。表やタブ区切り、このアプリで書き出した CSV もそのまま貼れます。{BULK_MAX_ROWS}件まで。
          </p>
          {errorBox}
          <button type="button" className="btn btn-primary btn-block" onClick={readText}>
            読み込む
          </button>
        </>
      )}

      {step === 'preview' && (
        <>
          <p className="bulk-summary">
            「{folderName}」に <strong>{toAdd.length}件</strong> 追加します
            {skipped > 0 && `（追加しないもの ${skipped}件）`}
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

          {errorBox}
          <div className="modal-actions modal-actions-row">
            <button type="button" className="btn btn-secondary" onClick={() => setStep('input')} disabled={busy}>
              戻って直す
            </button>
            <button type="button" className="btn btn-primary" onClick={handleImport} disabled={busy || toAdd.length === 0}>
              {busy ? '追加中…' : `${toAdd.length}件を追加`}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
