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

/**
 * 英語の内容から種類を推測する（登録フォームの自動切り替え用）。
 * 前後の空白を除いてスペースを含めば phrase（例：It depends on the situation.）、含まなければ word（例：Ambiguous）。
 */
export function guessCategory(english) {
  return /\s/.test(String(english ?? '').trim()) ? 'phrase' : 'word'
}

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
