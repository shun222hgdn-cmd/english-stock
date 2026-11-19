// 一覧画面で使う「検索」と「並び替え」の処理

/**
 * 英語・日本語訳のどちらかに検索文字列を含むデータだけを返す（部分一致）。
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
      stock.japanese.toLowerCase().includes(keyword),
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
