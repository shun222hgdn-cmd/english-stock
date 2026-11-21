// 検索・並び替え・入力チェックの自動テスト（Node.js 標準のテスト機能を使用）
// 実行方法: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterStocks, sortByEnglish } from '../src/utils/search.js'
import { cleanStockInput, findDuplicate, guessCategory, validateNewPassword } from '../src/utils/validation.js'

const stocks = [
  { id: '1', category: 'word', english: 'Prioritize', japanese: '優先する' },
  { id: '2', category: 'word', english: 'Ambiguous', japanese: '曖昧な' },
  { id: '3', category: 'word', english: 'Efficient', japanese: '効率的な' },
  { id: '4', category: 'phrase', english: "I couldn't agree more.", japanese: '全く同感です。' },
]

const ids = (list) => list.map((s) => s.id)

test('T11: 英語で部分一致検索できる', () => {
  assert.deepEqual(ids(filterStocks(stocks, 'bigu')), ['2'])
})

test('T12: 日本語で部分一致検索できる', () => {
  assert.deepEqual(ids(filterStocks(stocks, '効率')), ['3'])
  assert.deepEqual(ids(filterStocks(stocks, '同感')), ['4'])
})

test('T13: 英語の大文字・小文字を区別しない', () => {
  const lower = ids(filterStocks(stocks, 'efficient'))
  const upper = ids(filterStocks(stocks, 'EFFICIENT'))
  const mixed = ids(filterStocks(stocks, 'eFfIcIeNt'))
  assert.deepEqual(lower, ['3'])
  assert.deepEqual(upper, lower)
  assert.deepEqual(mixed, lower)
})

test('検索欄が空（または空白のみ）ならすべて表示する', () => {
  assert.equal(filterStocks(stocks, '').length, 4)
  assert.equal(filterStocks(stocks, '   ').length, 4)
})

test('検索文字列の前後の空白は無視する', () => {
  assert.deepEqual(ids(filterStocks(stocks, '  prior  ')), ['1'])
})

test('一致しない場合は空配列を返す', () => {
  assert.deepEqual(filterStocks(stocks, 'xyz'), [])
})

test('記号を含む検索もそのまま部分一致する', () => {
  assert.deepEqual(ids(filterStocks(stocks, "couldn't")), ['4'])
})

test('一覧は英語のアルファベット順（大文字・小文字を区別しない）に並ぶ', () => {
  const list = [...stocks, { id: '5', category: 'word', english: 'apple', japanese: 'りんご' }]
  assert.deepEqual(
    sortByEnglish(list).map((s) => s.english),
    ['Ambiguous', 'apple', 'Efficient', "I couldn't agree more.", 'Prioritize'],
  )
})

test('並び替えは元の配列を変更しない', () => {
  const copy = [...stocks]
  sortByEnglish(stocks)
  assert.deepEqual(stocks, copy)
})

test('T06: 空欄は登録できない', () => {
  const result = cleanStockInput({ english: '', japanese: '' })
  assert.equal(result.isValid, false)
  assert.ok(result.errors.english)
  assert.ok(result.errors.japanese)
})

test('T07: 空白のみ（半角・全角・改行）は登録できない', () => {
  const result = cleanStockInput({ english: '   ', japanese: '　\n\t' })
  assert.equal(result.isValid, false)
})

test('片方だけ空欄の場合も登録できない', () => {
  assert.equal(cleanStockInput({ english: 'Hello', japanese: ' ' }).isValid, false)
  assert.equal(cleanStockInput({ english: ' ', japanese: 'こんにちは' }).isValid, false)
})

test('入力値の前後の空白は取り除かれる（文中の空白は残る）', () => {
  const result = cleanStockInput({ english: '  It depends on the situation.  ', japanese: '　状況によります。　' })
  assert.equal(result.isValid, true)
  assert.deepEqual(result.values, {
    english: 'It depends on the situation.',
    japanese: '状況によります。',
  })
})

test('重複チェック：大文字・小文字と前後の空白を無視して同じ英語を見つける', () => {
  assert.equal(findDuplicate(stocks, '  ambiguous ')?.id, '2')
  assert.equal(findDuplicate(stocks, 'AMBIGUOUS')?.id, '2')
})

test('重複チェック：編集中のデータ自身は重複扱いしない', () => {
  assert.equal(findDuplicate(stocks, 'Ambiguous', '2'), null)
})

test('重複チェック：部分一致や空欄は重複扱いしない', () => {
  assert.equal(findDuplicate(stocks, 'Ambig'), null)
  assert.equal(findDuplicate(stocks, '   '), null)
})

test('種類の自動判定：スペースを含めばフレーズ、含まなければ単語', () => {
  assert.equal(guessCategory('Ambiguous'), 'word')
  assert.equal(guessCategory('  Ambiguous  '), 'word') // 前後の空白は無視
  assert.equal(guessCategory('It depends on the situation.'), 'phrase')
  assert.equal(guessCategory('take off'), 'phrase')
  assert.equal(guessCategory(''), 'word')
})

test('パスワード変更：8文字以上で、確認用と一致すれば OK', () => {
  assert.equal(validateNewPassword('abcd1234', 'abcd1234'), '')
})

test('パスワード変更：空欄・8文字未満・確認用と不一致はエラー', () => {
  assert.ok(validateNewPassword('', ''))
  assert.ok(validateNewPassword('abc1234', 'abc1234'))
  assert.ok(validateNewPassword('abcd1234', 'abcd12345'))
})
