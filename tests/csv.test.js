// CSV 書き出しの自動テスト（Node.js 標準のテスト機能を使用）
// 実行方法: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CSV_HEADERS, buildCsvFileName, buildStocksCsv, toCsvCell } from '../src/utils/csv.js'

const stocks = [
  { id: '1', category: 'phrase', english: 'It depends on the situation.', japanese: '状況によります。', part_of_speech: null, note: 'よく使う' },
  { id: '2', category: 'word', english: 'Prioritize', japanese: '優先する', part_of_speech: '動詞', note: null },
  { id: '3', category: 'word', english: 'Ambiguous', japanese: '曖昧な', part_of_speech: '形容詞', note: '似た表現：vague' },
  { id: '4', category: 'sentence', english: 'See you tomorrow.', japanese: 'また明日。', part_of_speech: null, note: null },
]

const rowsOf = (csv) => csv.replace(/^﻿/, '').trimEnd().split('\r\n')

test('Excel で文字化けしないよう BOM 付き・行の区切りは CRLF', () => {
  const csv = buildStocksCsv(stocks)
  assert.ok(csv.startsWith('﻿'))
  assert.ok(csv.includes('\r\n'))
  assert.ok(!/[^\r]\n/.test(csv)) // LF だけの改行は無い
})

test('1行目は日本語の見出し、その後は 単語 → フレーズ → 例文、それぞれアルファベット順', () => {
  const rows = rowsOf(buildStocksCsv(stocks))
  assert.equal(rows[0], CSV_HEADERS.join(','))
  assert.equal(rows[1], '単語,Ambiguous,曖昧な,形容詞,似た表現：vague')
  assert.equal(rows[2], '単語,Prioritize,優先する,動詞,')
  assert.equal(rows[3], 'フレーズ,It depends on the situation.,状況によります。,,よく使う')
  assert.equal(rows[4], '例文,See you tomorrow.,また明日。,,')
  assert.equal(rows.length, 5)
})

test('「,」「"」「改行」を含む値は "" で囲む', () => {
  assert.equal(toCsvCell('a, b'), '"a, b"')
  assert.equal(toCsvCell('He said "hi"'), '"He said ""hi"""')
  assert.equal(toCsvCell('1行目\n2行目'), '"1行目\n2行目"')
  assert.equal(toCsvCell("I'll keep that in mind."), "I'll keep that in mind.")
})

test('Excel で数式として動かないよう、= + - @ で始まる値は先頭に \' を付ける', () => {
  assert.equal(toCsvCell('=SUM(A1)'), "'=SUM(A1)")
  assert.equal(toCsvCell('-ly'), "'-ly")
  assert.equal(toCsvCell('@home'), "'@home")
})

test('0件でも見出しだけの CSV になる', () => {
  assert.deepEqual(rowsOf(buildStocksCsv([])), [CSV_HEADERS.join(',')])
})

test('ファイル名：フォルダ名と日付入り。使えない文字は _ に置き換える', () => {
  const day = new Date(2026, 10, 23)
  assert.equal(buildCsvFileName('しゅん', day), 'english-stock_しゅん_2026-11-23.csv')
  assert.equal(buildCsvFileName('a/b:c', day), 'english-stock_a_b_c_2026-11-23.csv')
  assert.equal(buildCsvFileName('', day), 'english-stock_folder_2026-11-23.csv')
})
