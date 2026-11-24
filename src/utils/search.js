// 一覧画面で使う「検索」と「並び替え」の処理

/**
 * 英語・日本語訳・コメントのどれかに検索文字列を含むデータだけを返す（部分一致）。
 * 英語の大文字・小文字は区別しない。検索文字列が空ならすべて返す。
 *
 * @param {Array<{ english: string, japanese: string }>} stocks
 * @param {string} query 検索欄の入力
 */
export function filterStocks(stocks, query) {
  const keyword = String(query ?? '').trim().toLowerCase()
  if (!keyword) return stocks

  return stocks.filter(
    (stock) =>
      stock.english.toLowerCase().includes(keyword) ||
      stock.japanese.toLowerCase().includes(keyword) ||
      String(stock.note ?? '').toLowerCase().includes(keyword),
  )
}

/**
 * 英語のアルファベット順（大文字・小文字を区別しない）に並べた新しい配列を返す。
 * 元の配列は変更しない。英語が同じ場合は日本語訳・IDの順で並べ、表示順を安定させる。
 */
export function sortByEnglish(stocks) {
  return [...stocks].sort(
    (a, b) =>
      a.english.localeCompare(b.english, 'en', { sensitivity: 'base' }) ||
      a.japanese.localeCompare(b.japanese, 'ja') ||
      String(a.id).localeCompare(String(b.id)),
  )
}

/** 単語帳の並び順（プルダウンの選択肢） */
export const SORTS = [
  { value: 'abc', label: 'ABC順' },
  { value: 'new', label: '新しい順' },
  { value: 'old', label: '古い順' },
  { value: 'learned', label: '覚えたが上' },
  { value: 'unlearned', label: 'まだが上' },
]

const byDate = (a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''))
const byLearned = (a, b) => Number(Boolean(b.learned)) - Number(Boolean(a.learned))

/**
 * 選んだ並び順に並べた新しい配列を返す。同じ順位どうしはアルファベット順（並びが毎回変わらないように）。
 * @param {'abc' | 'new' | 'old' | 'learned' | 'unlearned'} sort
 */
export function sortStocks(stocks, sort) {
  const list = sortByEnglish(stocks)
  if (sort === 'new') return list.sort((a, b) => byDate(b, a))
  if (sort === 'old') return list.sort(byDate)
  if (sort === 'learned') return list.sort(byLearned)
  if (sort === 'unlearned') return list.sort((a, b) => byLearned(b, a))
  return list
}

/**
 * 並び替え済みの一覧を、英語の頭文字（A〜Z）ごとにまとめる（辞書の見出しのように表示するため）。
 * アルファベット以外で始まるもの（数字・記号など）は「#」にまとめる。元の並び順は保つ。
 *
 * @param {Array<{ english: string }>} stocks 並び替え済みのデータ
 * @returns {Array<{ initial: string, items: Array<object> }>}
 */
export function groupByInitial(stocks) {
  const groups = []
  for (const stock of stocks) {
    const first = String(stock.english ?? '').trim().charAt(0).toUpperCase()
    const initial = /^[A-Z]$/.test(first) ? first : '#'
    const last = groups[groups.length - 1]
    if (last && last.initial === initial) last.items.push(stock)
    else groups.push({ initial, items: [stock] })
  }
  return groups
}
