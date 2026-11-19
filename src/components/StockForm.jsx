import { useId, useRef, useState } from 'react'
import Modal from './Modal'
import { cleanStockInput } from '../utils/validation'
import { toErrorMessage } from '../utils/errors'

/**
 * 登録・編集フォーム（モーダル）。
 * カテゴリーは表示中のストック画面で決まるため、ここでは英語と日本語訳だけを入力する。
 *
 * @param {{
 *   title: string,
 *   initialValues?: { english: string, japanese: string },
 *   onSubmit: (values: { english: string, japanese: string }) => Promise<void>,
 *   onClose: () => void,
 * }} props
 */
export default function StockForm({ title, initialValues, onSubmit, onClose }) {
  const id = useId()
  // 編集時は既存の内容を初期値にする
  const [english, setEnglish] = useState(initialValues?.english ?? '')
  const [japanese, setJapanese] = useState(initialValues?.japanese ?? '')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)
  // 連打による二重送信を確実に防ぐためのフラグ（state の反映を待たずに判定できる）
  const savingRef = useRef(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (savingRef.current) return

    // 前後の空白を取り除き、空欄チェックを行う
    const { values, errors, isValid } = cleanStockInput({ english, japanese })
    setFieldErrors(errors)
    setSubmitError('')
    if (!isValid) return

    savingRef.current = true
    setSaving(true)
    try {
      await onSubmit(values)
      onClose() // 保存成功：フォームを閉じる
    } catch (err) {
      // 保存失敗：入力内容は残したままエラーを表示する
      setSubmitError(toErrorMessage(err, '保存に失敗しました。'))
      savingRef.current = false
      setSaving(false)
    }
  }

  // 保存中は閉じられないようにする
  function requestClose() {
    if (!savingRef.current) onClose()
  }

  return (
    <Modal titleId={`${id}-title`} onRequestClose={requestClose}>
      <form onSubmit={handleSubmit} noValidate>
        <h2 id={`${id}-title`} className="modal-title">
          {title}
        </h2>

        <div className="field">
          <label htmlFor={`${id}-english`}>English</label>
          <textarea
            id={`${id}-english`}
            className="input"
            rows={2}
            value={english}
            onChange={(e) => setEnglish(e.target.value)}
            lang="en"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck="true"
            aria-invalid={Boolean(fieldErrors.english)}
            aria-describedby={fieldErrors.english ? `${id}-english-error` : undefined}
            disabled={saving}
          />
          {fieldErrors.english && (
            <p id={`${id}-english-error`} className="field-error">
              {fieldErrors.english}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor={`${id}-japanese`}>Japanese</label>
          <textarea
            id={`${id}-japanese`}
            className="input"
            rows={2}
            value={japanese}
            onChange={(e) => setJapanese(e.target.value)}
            lang="ja"
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.japanese)}
            aria-describedby={fieldErrors.japanese ? `${id}-japanese-error` : undefined}
            disabled={saving}
          />
          {fieldErrors.japanese && (
            <p id={`${id}-japanese-error`} className="field-error">
              {fieldErrors.japanese}
            </p>
          )}
        </div>

        {submitError && (
          <p className="alert" role="alert">
            {submitError}
          </p>
        )}

        <div className="modal-actions">
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={requestClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
