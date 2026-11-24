import { useId, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import Choice from './Choice'
import AutoTextarea from './AutoTextarea'
import { CheckIcon, CloseIcon } from './Icons'
import {
  CATEGORIES,
  NOTE_MAX_LENGTH,
  PARTS_OF_SPEECH,
  categoryLabel,
  cleanStockExtras,
  cleanStockInput,
  findDuplicate,
  guessCategory,
} from '../utils/validation'
import { useBusy } from '../hooks/useBusy'

/**
 * 登録・編集フォーム。英語・日本語訳・種類（単語 / フレーズ / 例文）、任意で品詞（単語のみ）とコメント。
 * - 種類を手で選ぶまでは、英語の内容から自動で切り替える（utils/validation.js の guessCategory）
 * - 英語で Enter → 日本語へ、日本語で Enter → 保存（Shift + Enter は改行、変換確定の Enter は無視）
 * - 「保存して次へ」（Ctrl + Enter）で続けて登録できる
 * - 同じ英語が登録済みなら注意を出す（登録はできる）
 * - 何か入力している間は、背景を押しても閉じない
 *
 * @param {{
 *   mode: 'add' | 'edit',
 *   initialValues?: { id: string, category: string, english: string, japanese: string, part_of_speech?: string, note?: string },
 *   defaultCategory?: 'word' | 'phrase' | 'sentence' | null, // 追加時の種類（null なら自動判定）
 *   existingStocks?: Array<{ id: string, english: string, japanese: string }>, // 重複チェック用（同じフォルダ）
 *   onSubmit: (values: object) => Promise<void>,
 *   onDelete?: () => Promise<void>,  // 編集時だけ
 *   onClose: () => void,
 * }} props
 */
export default function StockForm({ mode, initialValues, defaultCategory = null, existingStocks = [], onSubmit, onDelete, onClose }) {
  const noteId = useId()
  const englishRef = useRef(null)
  const japaneseRef = useRef(null)
  const [english, setEnglish] = useState(initialValues?.english ?? '')
  const [japanese, setJapanese] = useState(initialValues?.japanese ?? '')
  const [partOfSpeech, setPartOfSpeech] = useState(initialValues?.part_of_speech ?? null)
  const [note, setNote] = useState(initialValues?.note ?? '')
  const [category, setCategory] = useState(initialValues?.category ?? defaultCategory ?? 'word')
  // 種類が決まっているか（ref なので直後の入力でも最新の値を見られる）
  const categoryFixedRef = useRef(Boolean(initialValues?.category ?? defaultCategory))
  const [fieldErrors, setFieldErrors] = useState({})
  const [savedMessage, setSavedMessage] = useState('') // 「保存して次へ」のお知らせ
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const { busy, error, setError, run } = useBusy('保存に失敗しました。')
  const deleting = useBusy('削除に失敗しました。')
  const saving = busy || deleting.busy

  const isAdd = mode === 'add'
  const isEmpty = !english.trim() && !japanese.trim() && !note.trim()
  const duplicate = useMemo(
    () => findDuplicate(existingStocks, english, initialValues?.id),
    [existingStocks, english, initialValues?.id],
  )

  /** 保存（addAnother なら保存後に空にして続けて登録） */
  async function save(addAnother) {
    const { values, errors, isValid } = cleanStockInput({ english, japanese })
    const extras = cleanStockExtras({ category, partOfSpeech, note })
    setFieldErrors(errors)
    setError(extras.error)
    setSavedMessage('')
    if (!isValid) return (errors.english ? englishRef : japaneseRef).current?.focus()
    if (extras.error) return

    const ok = await run(() => onSubmit({ category, ...values, ...extras.values }))
    if (!ok) return
    if (!addAnother) return onClose()
    setEnglish('')
    setJapanese('')
    setPartOfSpeech(null)
    setNote('')
    setSavedMessage(`「${values.english}」を保存しました`)
    englishRef.current?.focus()
  }

  function handleKeyDown(event, next) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229) return
    event.preventDefault()
    if (isAdd && (event.ctrlKey || event.metaKey)) save(true)
    else next()
  }

  function changeEnglish(value) {
    setEnglish(value)
    if (!categoryFixedRef.current) setCategory(guessCategory(value))
    setFieldErrors((prev) => ({ ...prev, english: undefined }))
    setSavedMessage('')
  }

  async function handleDelete() {
    if (await deleting.run(onDelete)) onClose()
  }

  return (
    <Modal
      title={`${categoryLabel(category)}を${isAdd ? '追加' : '編集'}`}
      onClose={onClose}
      busy={saving}
      closeOnBackdrop={isEmpty}
      className="modal-form"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          save(false)
        }}
        noValidate
      >
        <Choice
          className="form-category"
          label="種類"
          options={CATEGORIES}
          value={category}
          onChange={(value) => {
            setCategory(value)
            categoryFixedRef.current = true // 手で選んだら、以後は自動で切り替えない
          }}
          disabled={saving}
        />

        <div className="field-group">
          <InputField
            label="英語"
            inputRef={englishRef}
            value={english}
            onChange={changeEnglish}
            onKeyDown={(e) => handleKeyDown(e, () => japaneseRef.current?.focus())}
            lang="en"
            autoCapitalize="sentences"
            enterKeyHint="next"
            error={fieldErrors.english}
            readOnly={saving}
            data-autofocus=""
            labelExtra={
              // 品詞（任意・単語のときだけ）
              category === 'word' && (
                <select
                  className="pos-select"
                  value={partOfSpeech ?? ''}
                  onChange={(e) => setPartOfSpeech(e.target.value || null)}
                  aria-label="品詞（任意）"
                  disabled={saving}
                >
                  <option value="">品詞</option>
                  {PARTS_OF_SPEECH.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              )
            }
          >
            {duplicate && (
              <p className="field-note" role="status">
                すでに登録済みです（{duplicate.japanese}）
              </p>
            )}
          </InputField>

          <InputField
            label="日本語訳"
            inputRef={japaneseRef}
            value={japanese}
            onChange={(value) => {
              setJapanese(value)
              setFieldErrors((prev) => ({ ...prev, japanese: undefined }))
              setSavedMessage('')
            }}
            onKeyDown={(e) => handleKeyDown(e, () => save(false))}
            lang="ja"
            enterKeyHint="done"
            error={fieldErrors.japanese}
            readOnly={saving}
          />
        </div>

        {/* コメント（任意）：Enter は改行 */}
        <div className="field-group">
          <div className="group-field">
            <label htmlFor={noteId} className="field-label">
              コメント（任意）
            </label>
            <AutoTextarea
              id={noteId}
              className="group-input group-input-note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                setError('')
              }}
              maxLength={NOTE_MAX_LENGTH}
              readOnly={saving}
            />
          </div>
        </div>

        <p className="keyboard-hint" aria-hidden="true">
          Enter で次へ・保存 ／ Shift + Enter で改行
          {isAdd && ' ／ Ctrl + Enter で続けて登録'}
        </p>

        <p className="saved-message" role="status" aria-live="polite">
          {savedMessage && (
            <>
              <CheckIcon size={16} />
              <span>{savedMessage}</span>
            </>
          )}
        </p>

        {(error || deleting.error) && (
          <p className="alert" role="alert">
            {error || deleting.error}
          </p>
        )}

        <div className={`modal-actions${isAdd ? ' modal-actions-row' : ''}`}>
          {isAdd && (
            <button type="button" className="btn btn-secondary" onClick={() => save(true)} disabled={saving}>
              保存して次へ
            </button>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {busy ? '保存中…' : '保存'}
          </button>
        </div>

        {/* 編集時だけ：削除（押すと確認が出る） */}
        {onDelete && (
          <div className="form-delete">
            {confirmingDelete ? (
              <>
                <span className="form-delete-text">このデータを削除しますか？</span>
                <span className="folder-row-actions">
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => setConfirmingDelete(false)} disabled={saving}>
                    やめる
                  </button>
                  <button type="button" className="btn btn-danger btn-small" onClick={handleDelete} disabled={saving}>
                    {deleting.busy ? '削除中…' : '削除する'}
                  </button>
                </span>
              </>
            ) : (
              <button type="button" className="btn btn-text btn-text-danger" onClick={() => setConfirmingDelete(true)} disabled={saving}>
                削除
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}

/** ラベル・自動で伸びる入力欄・× ボタン・エラーをまとめた入力項目 */
function InputField({ label, labelExtra, inputRef, value, onChange, error, children, ...textareaProps }) {
  const id = useId()
  return (
    // 欄の余白を押しても入力できるようにする
    <div
      className={`group-field${error ? ' has-error' : ''}`}
      onClick={(e) => e.target === e.currentTarget && inputRef.current?.focus()}
    >
      <div className="field-label-row">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {labelExtra}
      </div>
      <AutoTextarea
        ref={inputRef}
        id={id}
        className="group-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck="true"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...textareaProps}
      />
      {value && !textareaProps.readOnly && (
        <button
          type="button"
          className="clear-btn"
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          aria-label={`${label}を消去`}
          tabIndex={-1}
        >
          <CloseIcon size={16} />
        </button>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
      {children}
    </div>
  )
}
