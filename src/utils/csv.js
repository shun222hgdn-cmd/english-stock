// フォルダの単語・フレーズ・例文を CSV にする処理（画面に依存しない純粋な関数なので、自動テストしやすい）
// Excel で開いても文字化けしないよう、先頭に BOM を付け、改行は CRLF にする。

import { sortByEnglish } from './search.js'
import { CATEGORIES, categoryLabel } from './validation.js'

/** 1行目の見出し */
export const CSV_HEADERS = ['種類', '英語', '日本語訳', '品詞', 'コメント']

/**
 * 1つの値を CSV のセルにする。
 * - 「,」「"」「改行」を含む場合は "" で囲み、中の " は "" にする
 * - Excel で数式として実行されないよう、= + - @ などで始まる値は先頭に ' を付ける
 */
export function toCsvCell(value) {
  let text = value == null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

/**
 * 登録データを CSV の文字列にする（BOM 付き・CRLF）。
 * 単語 → フレーズ → 例文 の順に、それぞれ英語のアルファベット順に並べる。
 *
 * @param {Array<{ category: string, english: string, japanese: string, part_of_speech?: string|null, note?: string|null }>} stocks
 */
export function buildStocksCsv(stocks) {
  const ordered = CATEGORIES.flatMap(({ value }) => sortByEnglish(stocks.filter((stock) => stock.category === value)))
  const rows = ordered.map((stock) => [
    categoryLabel(stock.category),
    stock.english,
    stock.japanese,
    stock.part_of_speech ?? '',
    stock.note ?? '',
  ])
  const lines = [CSV_HEADERS, ...rows].map((row) => row.map(toCsvCell).join(','))
  return `﻿${lines.join('\r\n')}\r\n`
}

/**
 * 書き出すファイルの名前を作る。例：english-stock_しゅん_2026-11-23.csv
 * ファイル名に使えない文字（\ / : * ? " < > | など）は「_」に置き換える。
 */
export function buildCsvFileName(folderName, date = new Date()) {
  const safeName = String(folderName ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim() || 'folder'
  const pad = (n) => String(n).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `english-stock_${safeName}_${day}.csv`
}
