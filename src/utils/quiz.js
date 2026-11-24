import { CATEGORIES } from './validation.js'

// ランダム出題に関する処理（画面に依存しない純粋な関数なので、自動テストしやすい）

/** 出題範囲 */
export const QUIZ_CATEGORIES = [{ value: 'all', label: 'すべて' }, ...CATEGORIES]

/** 出題方向（ja-en: 日本語 → 英語 / en-ja: 英語 → 日本語） */
export const QUIZ_DIRECTIONS = [
  { value: 'ja-en', label: 'JP → EN', description: '日本語を見て英語を答える' },
  { value: 'en-ja', label: 'EN → JP', description: '英語を見て日本語を答える' },
]

/**
 * 出題範囲でデータを絞り込む。
 * @param {Array<{ category: string }>} stocks
 * @param {'all' | 'word' | 'phrase' | 'sentence'} category
 */
export function filterByCategory(stocks, category) {
  if (category === 'all') return stocks
  return stocks.filter((stock) => stock.category === category)
}

/**
 * 候補の中からランダムに1件選ぶ。
 * - 候補が0件なら null
 * - 候補が2件以上なら、直前の問題（previousId）を除外して同じ問題が続かないようにする
 * - 候補が1件なら、その問題を繰り返し出題する
 * 直前の問題は配列の位置ではなくデータの id で判定する。
 *
 * @param {Array<{ id: string }>} candidates 出題候補
 * @param {string | null} previousId 直前に出題したデータのID
 * @param {() => number} random 0以上1未満の乱数を返す関数（テスト時に差し替えられるよう引数にしている）
 */
export function pickRandomStock(candidates, previousId = null, random = Math.random) {
  if (candidates.length === 0) return null

  const pool =
    candidates.length >= 2 ? candidates.filter((stock) => stock.id !== previousId) : candidates

  const index = Math.floor(random() * pool.length)
  // 念のため範囲外にならないようにする
  return pool[Math.min(index, pool.length - 1)]
}

/**
 * 出題方向に応じて「問題」と「答え」を返す。
 * @param {{ english: string, japanese: string }} stock
 * @param {'ja-en' | 'en-ja'} direction
 */
export function getQuestionAndAnswer(stock, direction) {
  if (direction === 'ja-en') {
    return { question: stock.japanese, answer: stock.english }
  }
  return { question: stock.english, answer: stock.japanese }
}
