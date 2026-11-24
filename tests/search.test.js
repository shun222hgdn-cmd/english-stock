// 検索・並び替え・入力チェックの自動テスト（Node.js 標準のテスト機能を使用）
// 実行方法: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterStocks, groupByInitial, sortByEnglish } from '../src/utils/search.js'
import {
  categoryLabel,
  categoryWithPos,
  isLongText,
  cleanStockExtras,
  cleanStockInput,
  findDuplicate,
  guessCategory,
  NOTE_MAX_LENGTH,
  PARTS_OF_SPEECH,
  validateNewPassword,
} from '../src/utils/validation.js'

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

test('種類の自動判定：スペースなしは単語、3語以上で . ? ! で終われば例文、それ以外はフレーズ', () => {
  assert.equal(guessCategory('Ambiguous'), 'word')
  assert.equal(guessCategory('  Ambiguous  '), 'word') // 前後の空白は無視
  assert.equal(guessCategory(''), 'word')
  assert.equal(guessCategory('take off'), 'phrase')
  assert.equal(guessCategory('break the ice'), 'phrase') // 句読点なし
  assert.equal(guessCategory('Thank you.'), 'phrase') // 2語は短いのでフレーズ
  assert.equal(guessCategory('It depends on the situation.'), 'sentence')
  assert.equal(guessCategory('Could you say that again?'), 'sentence')
  assert.equal(guessCategory('He said, "Let\'s go!"'), 'sentence') // 引用符で終わっても文
})

test('種類の表示名と、品詞つきの表示', () => {
  assert.equal(categoryLabel('sentence'), '例文')
  assert.equal(categoryWithPos({ category: 'word', part_of_speech: '形容詞' }), '単語・形容詞')
  assert.equal(categoryWithPos({ category: 'sentence', part_of_speech: '名詞' }), '例文') // 品詞は単語だけ
})

test('長い文の判定（40文字を超えたら小さめの文字にする）', () => {
  assert.equal(isLongText('Ambiguous'), false)
  assert.equal(isLongText('I would appreciate it if you could reply soon.'), true)
})

test('パスワード変更：8文字以上で、確認用と一致すれば OK', () => {
  assert.equal(validateNewPassword('abcd1234', 'abcd1234'), '')
})

test('パスワード変更：空欄・8文字未満・確認用と不一致はエラー', () => {
  assert.ok(validateNewPassword('', ''))
  assert.ok(validateNewPassword('abc1234', 'abc1234'))
  assert.ok(validateNewPassword('abcd1234', 'abcd12345'))
})

test('品詞：単語のときは一覧の品詞を保存できる', () => {
  assert.equal(cleanStockExtras({ category: 'word', partOfSpeech: '形容詞' }).values.part_of_speech, '形容詞')
  assert.equal(PARTS_OF_SPEECH.length, 10)
})

test('品詞：任意なので、未選択なら null', () => {
  assert.equal(cleanStockExtras({ category: 'word', partOfSpeech: null }).values.part_of_speech, null)
})

test('品詞：フレーズでは保存しない／一覧に無い値は保存しない', () => {
  assert.equal(cleanStockExtras({ category: 'phrase', partOfSpeech: '名詞' }).values.part_of_speech, null)
  assert.equal(cleanStockExtras({ category: 'word', partOfSpeech: '形容動詞' }).values.part_of_speech, null)
})

test('コメント：前後の空白を取り除き、空なら null', () => {
  assert.equal(cleanStockExtras({ category: 'word', note: '  会議でよく使う  ' }).values.note, '会議でよく使う')
  assert.equal(cleanStockExtras({ category: 'word', note: '   ' }).values.note, null)
  assert.equal(cleanStockExtras({ category: 'phrase' }).values.note, null)
})

test('コメント：上限の文字数まではOK、超えるとエラー', () => {
  assert.equal(cleanStockExtras({ category: 'word', note: 'あ'.repeat(NOTE_MAX_LENGTH) }).error, '')
  assert.ok(cleanStockExtras({ category: 'word', note: 'あ'.repeat(NOTE_MAX_LENGTH + 1) }).error)
})

test('一覧の見出し：頭文字ごとにまとまり、並び順は保たれる', () => {
  const groups = groupByInitial(
    sortByEnglish([
      { id: '1', english: 'apple' },
      { id: '2', english: 'Ambiguous' },
      { id: '3', english: 'break the ice' },
      { id: '4', english: "'cause" },
      { id: '5', english: '24/7' },
    ]),
  )
  assert.deepEqual(
    groups.map((g) => [g.initial, g.items.map((s) => s.id)]),
    [
      ['#', ['4', '5']],
      ['A', ['2', '1']],
      ['B', ['3']],
    ],
  )
})

test('一覧の見出し：0件なら見出しも無い', () => {
  assert.deepEqual(groupByInitial([]), [])
})
