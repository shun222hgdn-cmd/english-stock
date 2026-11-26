// 「まとめて追加」の読み取りの自動テスト（Node.js 標準のテスト機能を使用）
// 実行方法: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BULK_MAX_ROWS, markDuplicates, parseBulkText, parseCsv } from '../src/utils/bulkImport.js'
import { buildStocksCsv } from '../src/utils/csv.js'

const pick = (rows) => rows.map(({ category, english, japanese, part_of_speech, note }) => [category, english, japanese, part_of_speech, note])

test('「英語 | 日本語訳 | 品詞 | コメント」を1行ずつ読む（品詞・コメントは省略可）', () => {
  const { rows, errors } = parseBulkText(`resilient | 回復力のある | 形容詞 | 困難から立ち直る
break the ice | 場を和ませる
postpone | 延期する | 動詞`)
  assert.deepEqual(errors, [])
  assert.deepEqual(pick(rows), [
    ['word', 'resilient', '回復力のある', '形容詞', '困難から立ち直る'],
    ['phrase', 'break the ice', '場を和ませる', null, null],
    ['word', 'postpone', '延期する', '動詞', null],
  ])
})

test('ChatGPT のコードブロック・見出し・空行は読み飛ばす', () => {
  const { rows, errors } = parseBulkText('```\n英語 | 日本語訳 | 品詞 | コメント\n\ndiligent | 勤勉な | 形容詞 |\n```')
  assert.deepEqual(errors, [])
  assert.deepEqual(pick(rows), [['word', 'diligent', '勤勉な', '形容詞', null]])
})

test('ChatGPT の表（| a | b |）と区切りの行（|---|）を読む', () => {
  const { rows } = parseBulkText(`| 英語 | 日本語訳 | 品詞 | コメント |
|---|---|---|---|
| vague | ぼんやりした | 形容詞 | ambiguous と似ている |
| take your time | ごゆっくり |  |  |`)
  assert.deepEqual(pick(rows), [
    ['word', 'vague', 'ぼんやりした', '形容詞', 'ambiguous と似ている'],
    ['phrase', 'take your time', 'ごゆっくり', null, null],
  ])
})

test('タブ区切り（Excel やスプレッドシートからのコピー）も読める', () => {
  const { rows } = parseBulkText('grateful\t感謝している\t形容詞')
  assert.deepEqual(pick(rows), [['word', 'grateful', '感謝している', '形容詞', null]])
})

test('3番目が品詞でなければコメントとして扱う。フレーズには品詞を付けない', () => {
  const { rows } = parseBulkText(`deadline | 締め切り | 会議でよく使う
look up | 調べる | 動詞`)
  assert.deepEqual(pick(rows), [
    ['word', 'deadline', '締め切り', null, '会議でよく使う'],
    ['phrase', 'look up', '調べる', null, null],
  ])
})

test('「英語 | 日本語訳」になっていない行・空欄はエラーとして行番号付きで返す', () => {
  const { rows, errors } = parseBulkText(`ok | よい
just a sentence
 | 日本語だけ`)
  assert.equal(rows.length, 1)
  assert.deepEqual(
    errors.map((e) => e.line),
    [2, 3],
  )
})

test('このアプリの CSV（書き出したもの）をそのまま取り込める（改行・カンマ・引用符・数式よけ付き）', () => {
  const original = [
    { category: 'word', english: 'Ambiguous', japanese: '曖昧な', part_of_speech: '形容詞', note: '似た表現：vague, unclear' },
    { category: 'phrase', english: 'He said "hi"', japanese: '彼は「やあ」と言った', part_of_speech: null, note: '1行目\n2行目' },
    { category: 'word', english: '-ly', japanese: '〜に（副詞をつくる）', part_of_speech: null, note: null },
  ]
  const { rows, errors } = parseBulkText(buildStocksCsv(original))
  assert.deepEqual(errors, [])
  assert.deepEqual(pick(rows).sort(), original.map((o) => [o.category, o.english, o.japanese, o.part_of_speech, o.note]).sort())
})

test('CSV：引用符の中のカンマ・改行を正しく読む', () => {
  assert.deepEqual(
    parseCsv('a,"b, c","d\ne"\r\nf,g,h').map((r) => r.cells),
    [
      ['a', 'b, c', 'd\ne'],
      ['f', 'g', 'h'],
    ],
  )
})

test('上限を超えたら上限まで読み、tooMany で知らせる', () => {
  const text = Array.from({ length: BULK_MAX_ROWS + 5 }, (_, i) => `w${i} | x`).join('\n')
  const { rows, tooMany } = parseBulkText(text)
  assert.equal(rows.length, BULK_MAX_ROWS)
  assert.equal(tooMany, true)
})

test('重複：登録済み・貼り付けの中の重複に印を付ける（大文字・小文字は無視）', () => {
  const { rows } = parseBulkText(`Ambiguous | 曖昧な
diligent | 勤勉な
DILIGENT | 勤勉な`)
  assert.deepEqual(
    markDuplicates(rows, [{ english: 'ambiguous' }]).map((r) => r.duplicate),
    [true, false, true],
  )
})

test('ChatGPT が付けた番号は取り込まない（1. / 2) / ③ / 表の番号の列）', () => {
  const { rows, errors } = parseBulkText(`1. resilient | 回復力のある | 形容詞
2) break the ice | 場を和ませる
③ postpone | 延期する | 動詞
| # | 英語 | 日本語訳 |
|---|---|---|
| 4 | vivid | 鮮やかな |`)
  assert.deepEqual(errors, [])
  assert.deepEqual(pick(rows).map((r) => r[1]), ['resilient', 'break the ice', 'postpone', 'vivid'])
})

test('番号に見えても英語の一部なら消さない（1.5 times）', () => {
  const { rows } = parseBulkText('1.5 times | 1.5倍')
  assert.equal(rows[0].english, '1.5 times')
})
