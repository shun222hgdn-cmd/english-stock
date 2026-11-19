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
