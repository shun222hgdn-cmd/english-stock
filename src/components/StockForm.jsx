import { useId, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import AutoTextarea from './AutoTextarea'
import { CheckIcon, CloseIcon } from './Icons'
import {
  NOTE_MAX_LENGTH,
  PARTS_OF_SPEECH,
  cleanStockExtras,
  cleanStockInput,
  findDuplicate,
  guessCategory,
} from '../utils/validation'
import { toErrorMessage } from '../utils/errors'

/**
 * 登録・編集フォーム（モーダル）。
 * 英語・日本語訳に加えて、種類（Word / Phrase）をフォーム上部の切り替えで選ぶ。
 * 種類を手で選んでいない間は、英語にスペースがあれば Phrase、なければ Word に自動で切り替わる。
 *
 * 操作をスムーズにするための工夫：
 * - 英語欄で Enter → 日本語欄へ移動、日本語欄で Enter → 保存（Shift + Enter で改行）
 * - 日本語入力の変換確定の Enter では移動・保存しない
 * - 入力欄は文字数に合わせて自動で高さが伸びる
 * - 「Save & Next」で保存後もフォームを開いたまま、続けて登録できる
 * - 同じ英語がすでに登録されている場合は注意を表示する（登録は可能）
 * - 何か入力している間は、背景をタップしても閉じない（入力内容を誤って消さない）
 *
 * @param {{
 *   mode: 'add' | 'edit',
 *   initialValues?: { id?: string, category: 'word' | 'phrase', english: string, japanese: string },
 *   defaultCategory?: 'word' | 'phrase' | null, // 追加時の種類（null なら英語の内容から自動で判定）
 *   existingStocks?: Array<{ id: string, english: string, japanese: string }>, // 重複チェック用（同じフォルダ）
 *   onSubmit: (values: { category: string, english: string, japanese: string }) => Promise<void>,
 *   onDelete?: () => Promise<void>,  // 編集時だけ：このデータを削除する（確認してから実行）
 *   onClose: () => void,
 * }} props
 */
export default function StockForm({
  mode,
  initialValues,
  defaultCategory = null,
  existingStocks = [],
  onSubmit,
  onDelete,
  onClose,
}) {
  const id = useId()
  const englishRef = useRef(null)
  const japaneseRef = useRef(null)

  // 編集時は既存の内容を初期値にする
  const [english, setEnglish] = useState(initialValues?.english ?? '')
  const [japanese, setJapanese] = useState(initialValues?.japanese ?? '')
  // 任意項目：品詞（単語のときだけ）とコメント
  const [partOfSpeech, setPartOfSpeech] = useState(initialValues?.part_of_speech ?? null)
  const [note, setNote] = useState(initialValues?.note ?? '')
  // 種類（単語 / フレーズ）。編集時は今の種類、追加時は表示中の絞り込み、「すべて」なら自動判定
  const [category, setCategory] = useState(initialValues?.category ?? defaultCategory ?? 'word')
  // 種類が決まっているか（決まっていなければ、英語の入力に合わせて自動で切り替える）
  // 画面表示には使わないので ref で持つ（直後の入力でも確実に最新の値を参照できる）
  const categoryFixedRef = useRef(Boolean(initialValues?.category ?? defaultCategory))
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [savedMessage, setSavedMessage] = useState('') // 「続けて登録」で保存したときのお知らせ
  const [saving, setSaving] = useState(false)
  // 連打による二重送信を確実に防ぐためのフラグ（state の反映を待たずに判定できる）
  const savingRef = useRef(false)

  const isAdd = mode === 'add'
  const categoryLabel = category === 'word' ? '単語' : 'フレーズ'
  const title = isAdd ? `${categoryLabel}を追加` : `${categoryLabel}を編集`
  // 削除の確認を表示中か（編集時のみ）
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const isEmpty = english.trim() === '' && japanese.trim() === '' && note.trim() === ''

  // 同じ英語がすでに登録されていないか（編集中のデータ自身は除く）
  const duplicate = useMemo(
    () => findDuplicate(existingStocks, english, initialValues?.id),
    [existingStocks, english, initialValues?.id],
  )

  /**
   * 保存処理
   * @param {boolean} addAnother true のときは保存後にフォームを空にして続けて登録する
   */
  async function save(addAnother) {
    if (savingRef.current) return

    // 前後の空白を取り除き、空欄チェックを行う
    const { values, errors, isValid } = cleanStockInput({ english, japanese })
    // 任意項目（品詞はフレーズでは保存しない、コメントは空なら未設定）
    const extras = cleanStockExtras({ category, partOfSpeech, note })
    setFieldErrors(errors)
    setSubmitError(extras.error)
    setSavedMessage('')
    if (!isValid) {
      // 空欄のほうにカーソルを移して、すぐ入力できるようにする
      ;(errors.english ? englishRef : japaneseRef).current?.focus()
      return
    }
    if (extras.error) return

    savingRef.current = true
    setSaving(true)
    try {
      await onSubmit({ category, ...values, ...extras.values })
      if (addAnother) {
        // 続けて登録：入力欄を空にして英語欄に戻る
        setEnglish('')
        setJapanese('')
        setPartOfSpeech(null)
        setNote('')
        setSavedMessage(`「${values.english}」を保存しました`)
        englishRef.current?.focus()
      } else {
        onClose() // 保存成功：フォームを閉じる
        return
      }
    } catch (err) {
      // 保存失敗：入力内容は残したままエラーを表示する
      setSubmitError(toErrorMessage(err, '保存に失敗しました。'))
    }
    savingRef.current = false
    setSaving(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    save(false)
  }

  /**
   * Enter キーの動き（Shift + Enter は通常どおり改行）
   * 日本語入力の変換中（isComposing）は何もしない
   */
  function handleKeyDown(event, next) {
    if (event.key !== 'Enter' || event.shiftKey) return
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    event.preventDefault()
    // Ctrl/⌘ + Enter は「続けて登録」
    if (isAdd && (event.ctrlKey || event.metaKey)) {
      save(true)
      return
    }
    next()
  }

  // 入力し直したら、その欄のエラーとお知らせを消す
  function changeEnglish(value) {
    setEnglish(value)
    // 種類を手で選んでいなければ、英語の内容から Word / Phrase を自動で切り替える
    if (!categoryFixedRef.current) setCategory(guessCategory(value))
    if (fieldErrors.english) setFieldErrors((prev) => ({ ...prev, english: undefined }))
    if (savedMessage) setSavedMessage('')
  }
  function changeJapanese(value) {
    setJapanese(value)
    if (fieldErrors.japanese) setFieldErrors((prev) => ({ ...prev, japanese: undefined }))
    if (savedMessage) setSavedMessage('')
  }

  // 種類を手で選んだら、以後は自動で切り替えない
  function chooseCategory(value) {
    setCategory(value)
    categoryFixedRef.current = true
  }

  // 削除：確認ボタンが押されたら実行し、成功したらフォームを閉じる。失敗したら内容は残してエラーを表示
  async function handleDelete() {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setSubmitError('')
    try {
      await onDelete()
      onClose()
      return
    } catch (err) {
      setSubmitError(toErrorMessage(err, '削除に失敗しました。'))
    }
    savingRef.current = false
    setSaving(false)
  }

  // 保存中は閉じられないようにする
  function requestClose() {
    if (!savingRef.current) onClose()
  }

  return (
    <Modal
      titleId={`${id}-title`}
      onRequestClose={requestClose}
      closeOnBackdrop={isEmpty}
      className="modal-form"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-header">
          <h2 id={`${id}-title`} className="modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={requestClose}
            aria-label="閉じる"
            title="閉じる（Esc）"
            disabled={saving}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* 種類の切り替え（単語 / フレーズ） */}
        <div className="segmented form-category" role="group" aria-label="種類">
          {[
            { value: 'word', label: '単語' },
            { value: 'phrase', label: 'フレーズ' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`segmented-btn${category === option.value ? ' is-active' : ''}`}
              aria-pressed={category === option.value}
              onClick={() => chooseCategory(option.value)}
              disabled={saving}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* 英語と日本語訳を1つのカードにまとめ、入力欄ごとの枠はなくす */}
        <div className="field-group">
          <InputField
            id={`${id}-english`}
            label="英語"
            hint="英語"
            inputRef={englishRef}
            value={english}
            onChange={changeEnglish}
            onKeyDown={(e) => handleKeyDown(e, () => japaneseRef.current?.focus())}
            placeholder={category === 'word' ? 'ambiguous' : 'It depends on the situation.'}
            lang="en"
            autoCapitalize="sentences"
            enterKeyHint="next"
            error={fieldErrors.english}
            readOnly={saving}
            autoFocus
          >
            {duplicate && (
              <p className="field-note" role="status">
                すでに登録済みです（{duplicate.japanese}）
              </p>
            )}
          </InputField>

          <InputField
            id={`${id}-japanese`}
            label="日本語訳"
            hint="日本語訳"
            inputRef={japaneseRef}
            value={japanese}
            onChange={changeJapanese}
            onKeyDown={(e) => handleKeyDown(e, () => save(false))}
            placeholder={category === 'word' ? '曖昧な' : '状況によります。'}
            lang="ja"
            enterKeyHint="done"
            error={fieldErrors.japanese}
            readOnly={saving}
          />
        </div>

        {/* 品詞（任意・単語のときだけ）：押して選ぶ。もう一度押すと解除 */}
        {category === 'word' && (
          <fieldset className="pos-field" disabled={saving}>
            <legend className="pos-legend">品詞（任意）</legend>
            <div className="pos-list">
              {PARTS_OF_SPEECH.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  className={`pos-chip${partOfSpeech === pos ? ' is-active' : ''}`}
                  aria-pressed={partOfSpeech === pos}
                  onClick={() => setPartOfSpeech((current) => (current === pos ? null : pos))}
                >
                  {pos}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {/* コメント（任意）：Enter は改行 */}
        <div className="field-group">
          <div className="group-field">
            <label htmlFor={`${id}-note`} className="field-label">
              コメント（任意）
            </label>
            <AutoTextarea
              id={`${id}-note`}
              className="group-input group-input-note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                if (submitError) setSubmitError('')
              }}
              placeholder="例：会議でよく使う／似た表現 vague"
              maxLength={NOTE_MAX_LENGTH}
              readOnly={saving}
            />
          </div>
        </div>

        <p className="keyboard-hint" aria-hidden="true">
          Enter で次へ・保存 ／ Shift + Enter で改行
          {isAdd && ' ／ Ctrl + Enter で続けて登録'}
        </p>

        {/* 続けて登録したときのお知らせ（読み上げにも対応） */}
        <p className="saved-message" role="status" aria-live="polite">
          {savedMessage && (
            <>
              <CheckIcon size={16} />
              <span>{savedMessage}</span>
            </>
          )}
        </p>

        {submitError && (
          <p className="alert" role="alert">
            {submitError}
          </p>
        )}

        <div className={`modal-actions${isAdd ? ' modal-actions-row' : ''}`}>
          {isAdd && (
            <button type="button" className="btn btn-secondary" onClick={() => save(true)} disabled={saving}>
              保存して次へ
            </button>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>

        {/* 編集時だけ：削除（押すと確認が出る） */}
        {onDelete && (
          <div className="form-delete">
            {confirmingDelete ? (
              <>
                <span className="form-delete-text">このデータを削除しますか？</span>
                <span className="folder-row-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={saving}
                  >
                    やめる
                  </button>
                  <button type="button" className="btn btn-danger btn-small" onClick={handleDelete} disabled={saving}>
                    {saving ? '削除中…' : '削除する'}
                  </button>
                </span>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-text btn-text-danger"
                onClick={() => setConfirmingDelete(true)}
                disabled={saving}
              >
                削除
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}

/**
 * ラベル・自動で伸びる入力欄・クリアボタン・エラー表示をまとめた入力項目。
 */
function InputField({ id, label, hint, inputRef, value, onChange, error, autoFocus, children, ...textareaProps }) {
  const errorId = `${id}-error`

  // × ボタン：入力を消して、すぐ打ち直せるようにカーソルを戻す
  function clear() {
    onChange('')
    inputRef.current?.focus()
  }

  return (
    // 欄の余白部分をタップしても入力できるようにする（ラベル・入力欄以外の場所）
    <div
      className={`group-field${error ? ' has-error' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) inputRef.current?.focus()
      }}
    >
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <AutoTextarea
        ref={inputRef}
        id={id}
        className="group-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck="true"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        data-autofocus={autoFocus ? '' : undefined}
        {...textareaProps}
      />
      {value && !textareaProps.readOnly && (
        <button type="button" className="clear-btn" onClick={clear} aria-label={`${hint}を消去`} tabIndex={-1}>
          <CloseIcon size={16} />
        </button>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
      {children}
    </div>
  )
}
