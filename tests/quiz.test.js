// ランダム出題ロジックの自動テスト（Node.js 標準のテスト機能を使用）
// 実行方法: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterByCategory, getQuestionAndAnswer, pickRandomStock } from '../src/utils/quiz.js'

const stocks = [
  { id: 'w1', category: 'word', english: 'Ambiguous', japanese: '曖昧な' },
  { id: 'w2', category: 'word', english: 'Efficient', japanese: '効率的な' },
  { id: 'p1', category: 'phrase', english: 'It depends on the situation.', japanese: '状況によります。' },
  { id: 'p2', category: 'phrase', english: "I'll keep that in mind.", japanese: '覚えておきます。' },
  { id: 's1', category: 'sentence', english: 'See you tomorrow.', japanese: 'また明日。' },
]

test('例文のみを選ぶと例文だけが対象になる', () => {
  assert.deepEqual(
    filterByCategory(stocks, 'sentence').map((s) => s.id),
    ['s1'],
  )
})

test('T14: 英単語のみを選ぶと英単語だけが対象になる', () => {
  const result = filterByCategory(stocks, 'word')
  assert.deepEqual(
    result.map((s) => s.id),
    ['w1', 'w2'],
  )
})

test('T15: フレーズのみを選ぶとフレーズだけが対象になる', () => {
  const result = filterByCategory(stocks, 'phrase')
  assert.deepEqual(
    result.map((s) => s.id),
    ['p1', 'p2'],
  )
})

test('T16: すべてを選ぶと全種類が対象になる', () => {
  assert.equal(filterByCategory(stocks, 'all').length, 5)
})

test('T17: 日本語→英語では日本語が問題・英語が答えになる', () => {
  const { question, answer } = getQuestionAndAnswer(stocks[2], 'ja-en')
  assert.equal(question, '状況によります。')
  assert.equal(answer, 'It depends on the situation.')
})

test('T18: 英語→日本語では英語が問題・日本語が答えになる', () => {
  const { question, answer } = getQuestionAndAnswer(stocks[2], 'en-ja')
  assert.equal(question, 'It depends on the situation.')
  assert.equal(answer, '状況によります。')
})

test('T21: 候補が2件以上なら、直前と同じIDは連続で出題されない（1000回試行）', () => {
  let previousId = null
  for (let i = 0; i < 1000; i++) {
    const picked = pickRandomStock(stocks, previousId)
    assert.notEqual(picked.id, previousId)
    previousId = picked.id
  }
})

test('T21: 候補がちょうど2件なら、交互に出題される', () => {
  const two = filterByCategory(stocks, 'word')
  assert.equal(pickRandomStock(two, 'w1').id, 'w2')
  assert.equal(pickRandomStock(two, 'w2').id, 'w1')
})

test('T21: 乱数の値に関係なく直前の問題が除外される（乱数を固定して確認）', () => {
  // 乱数が 0 でも 0.9999 でも、直前の w1 は選ばれない
  assert.notEqual(pickRandomStock(stocks, 'w1', () => 0).id, 'w1')
  assert.notEqual(pickRandomStock(stocks, 'w1', () => 0.9999).id, 'w1')
})

test('候補の全件が出題される可能性がある（偏りなく選ばれる）', () => {
  const seen = new Set()
  for (let i = 0; i < 500; i++) seen.add(pickRandomStock(stocks, null).id)
  assert.equal(seen.size, stocks.length)
})

test('直前のIDが候補に含まれない場合（範囲変更直後など）も正しく選べる', () => {
  const words = filterByCategory(stocks, 'word')
  const picked = pickRandomStock(words, 'p1')
  assert.ok(['w1', 'w2'].includes(picked.id))
})

test('T22: 候補が1件なら、直前と同じでもその問題を繰り返し出題する', () => {
  const one = [stocks[0]]
  assert.equal(pickRandomStock(one, null).id, 'w1')
  assert.equal(pickRandomStock(one, 'w1').id, 'w1')
})

test('T23: 候補が0件なら null を返す（エラーにならない）', () => {
  assert.equal(pickRandomStock([], null), null)
  assert.equal(pickRandomStock(filterByCategory([], 'word'), 'w1'), null)
})

test('乱数が1に極めて近い値でも範囲外を返さない', () => {
  const picked = pickRandomStock(stocks, null, () => 0.9999999999)
  assert.ok(picked)
})
