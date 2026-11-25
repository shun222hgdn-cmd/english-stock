/**
 * 登録・編集フォームの入力値を整えて、入力チェックを行う。
 * - 前後の空白（全角スペース・改行を含む）を取り除く
 * - 空欄または空白だけの場合はエラーにする
 *
 * @param {{ english: string, japanese: string }} input フォームの入力値
 * @returns {{ values: { english: string, japanese: string }, errors: { english?: string, japanese?: string }, isValid: boolean }}
 */
export function cleanStockInput(input) {
  const english = String(input?.english ?? '').trim()
  const japanese = String(input?.japanese ?? '').trim()

  const errors = {}
  if (!english) errors.english = '英語を入力してください。'
  if (!japanese) errors.japanese = '日本語訳を入力してください。'

  return {
    values: { english, japanese },
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}

/** 種類（データベースの制約と同じ） */
export const CATEGORIES = [
  { value: 'word', label: '単語' },
  { value: 'phrase', label: 'フレーズ' },
  { value: 'sentence', label: '例文' },
]

/** 種類の表示名（単語 / フレーズ / 例文） */
export const categoryLabel = (value) => CATEGORIES.find((c) => c.value === value)?.label ?? value

/**
 * 英語の内容から種類を推測する（登録フォーム・まとめて追加の自動判定用）。
 * - スペースなし → 単語（例：Ambiguous）
 * - 3語以上で . ? ! で終わる → 例文（例：It depends on the situation.）
 * - それ以外 → フレーズ（例：take off / Thank you.）
 */
export function guessCategory(english) {
  const text = String(english ?? '').trim()
  if (!/\s/.test(text)) return 'word'
  return /[.?!]["')\]]?$/.test(text) && text.split(/\s+/).length >= 3 ? 'sentence' : 'phrase'
}

/** 長い文（例文など）か。カードや詳細で文字を少し小さくする目安 */
export const isLongText = (text) => [...String(text ?? '')].length > 40

/**
 * 同じ英語（大文字・小文字と前後の空白は無視）がすでに登録されていれば、そのデータを返す。
 * 編集中のデータ自身は excludeId で除外する。見つからなければ null。
 *
 * @param {Array<{ id: string, english: string }>} stocks 同じフォルダの登録データ
 * @param {string} english 入力中の英語
 * @param {string} [excludeId] 除外するデータのID
 */
export function findDuplicate(stocks, english, excludeId) {
  const key = String(english ?? '').trim().toLowerCase()
  if (!key) return null
  return stocks.find((stock) => stock.id !== excludeId && stock.english.trim().toLowerCase() === key) ?? null
}

/** パスワードの最小文字数 */
export const PASSWORD_MIN_LENGTH = 8

/**
 * 新しいパスワードの入力チェック。
 * - 8文字以上
 * - 確認用の入力と一致すること
 * 問題がなければ空文字を返す。パスワードの前後の空白も、そのまま1文字として扱う（取り除かない）。
 *
 * @param {string} password 新しいパスワード
 * @param {string} confirmation 確認用にもう一度入力したもの
 */
export function validateNewPassword(password, confirmation) {
  const value = String(password ?? '')
  if (value.length === 0) return '新しいパスワードを入力してください。'
  if (value.length < PASSWORD_MIN_LENGTH) return `パスワードは${PASSWORD_MIN_LENGTH}文字以上にしてください。`
  if (value !== String(confirmation ?? '')) return '確認用のパスワードが一致しません。'
  return ''
}

/** 品詞の一覧（データベースの制約と同じ。単語のときだけ選べる） */
export const PARTS_OF_SPEECH = [
  '名詞',
  '代名詞',
  '動詞',
  '形容詞',
  '副詞',
  '助動詞',
  '前置詞',
  '冠詞',
  '接続詞',
  '間投詞',
]

/** 品詞の1文字の略（辞書の書き方。例：形容詞 → 形） */
export const POS_SHORT = {
  名詞: '名',
  代名詞: '代',
  動詞: '動',
  形容詞: '形',
  副詞: '副',
  助動詞: '助',
  前置詞: '前',
  冠詞: '冠',
  接続詞: '接',
  間投詞: '間',
}

/** コメントの最大文字数（データベースの制約と同じ） */
export const NOTE_MAX_LENGTH = 500

/**
 * 任意項目（品詞・コメント）を整えて、入力チェックを行う。
 * - 品詞は単語のときだけ保存し、フレーズでは未設定（null）にする
 * - 一覧に無い品詞は未設定にする
 * - コメントは前後の空白を取り除き、空なら未設定（null）にする。長すぎる場合はエラー
 *
 * @param {{ category: 'word' | 'phrase', partOfSpeech?: string | null, note?: string }} input
 * @returns {{ values: { part_of_speech: string | null, note: string | null }, error: string }}
 */
export function cleanStockExtras({ category, partOfSpeech, note }) {
  const part_of_speech =
    category === 'word' && PARTS_OF_SPEECH.includes(partOfSpeech) ? partOfSpeech : null
  const trimmed = String(note ?? '').trim()
  const error = [...trimmed].length > NOTE_MAX_LENGTH ? `コメントは${NOTE_MAX_LENGTH}文字以内にしてください。` : ''
  return { values: { part_of_speech, note: trimmed || null }, error }
}
