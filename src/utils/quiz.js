import { CATEGORIES } from './validation.js'
import { sortByEnglish } from './search.js'
import { loadChoice } from '../lib/preferences.js'

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

/** 「覚えた」ものの出やすさ（まだのものを 1 としたときの割合）。0 にはせず、たまに復習で出す */
export const LEARNED_WEIGHT = 0.2

/**
 * 候補の中からランダムに1件選ぶ。
 * - 候補が0件なら null
 * - 候補が2件以上なら、直前の問題（previousId）を除外して同じ問題が続かないようにする
 * - 候補が1件なら、その問題を繰り返し出題する
 * - 「覚えた」ものは出にくくする（LEARNED_WEIGHT 倍）
 * 直前の問題は配列の位置ではなくデータの id で判定する。
 *
 * @param {Array<{ id: string, learned?: boolean }>} candidates 出題候補
 * @param {string | null} previousId 直前に出題したデータのID
 * @param {() => number} random 0以上1未満の乱数を返す関数（テスト時に差し替えられるよう引数にしている）
 */
export function pickRandomStock(candidates, previousId = null, random = Math.random) {
  if (candidates.length === 0) return null

  const pool =
    candidates.length >= 2 ? candidates.filter((stock) => stock.id !== previousId) : candidates

  const weightOf = (stock) => (stock.learned ? LEARNED_WEIGHT : 1)
  let point = random() * pool.reduce((sum, stock) => sum + weightOf(stock), 0)
  for (const stock of pool) {
    point -= weightOf(stock)
    if (point < 0) return stock
  }
  return pool[pool.length - 1] // 念のため（端数の誤差）
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

/** 暗記の設定（右上の調整ボタンから）。最初の選択肢がはじめの値 */
export const QUIZ_OPTIONS = [
  { key: 'display', label: '表示', choices: [{ value: 'flip', label: '問題→答え' }, { value: 'both', label: '両方' }] },
  { key: 'order', label: '順番', choices: [{ value: 'random', label: 'ランダム' }, { value: 'abc', label: 'ABC順' }] },
  { key: 'learned', label: '覚えたもの', choices: [{ value: 'show', label: '出す' }, { value: 'hide', label: '出さない' }] },
  {
    key: 'auto',
    label: '自動で進む',
    choices: [
      { value: 'off', label: 'オフ' },
      { value: '3', label: '3秒' },
      { value: '5', label: '5秒' },
    ],
  },
]

/** 保存した暗記の設定を読む（未保存・想定外の値は、はじめの値） */
export function loadQuizOptions() {
  return Object.fromEntries(
    QUIZ_OPTIONS.map(({ key, choices }) => [key, loadChoice(`quiz_${key}`, choices.map((c) => c.value), choices[0].value)]),
  )
}

/**
 * 次の問題を選ぶ。
 * - random：pickRandomStock と同じ（直前は避け、覚えたものは出にくい）
 * - abc：英語のアルファベット順に1つずつ。最後まで行ったら最初に戻る
 */
export function pickNextStock(candidates, previousId = null, order = 'random', random = Math.random) {
  if (order !== 'abc') return pickRandomStock(candidates, previousId, random)
  if (candidates.length === 0) return null
  const sorted = sortByEnglish(candidates)
  const index = sorted.findIndex((stock) => stock.id === previousId)
  return sorted[(index + 1) % sorted.length]
}
