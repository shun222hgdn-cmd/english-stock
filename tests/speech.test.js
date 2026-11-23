// 発音（読み上げ）の声の選び方の自動テスト（Node.js 標準のテスト機能を使用）
// 実行方法: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickVoice, rateOf } from '../src/utils/speech.js'

const voices = [
  { name: 'Microsoft Haruka - Japanese', lang: 'ja-JP', default: true },
  { name: 'Microsoft David - English (United States)', lang: 'en-US' },
  { name: 'Google US English', lang: 'en-US' },
  { name: 'Google UK English Female', lang: 'en-GB' },
  { name: 'Microsoft Hazel - English (United Kingdom)', lang: 'en-GB' },
  { name: 'Zarvox', lang: 'en-US' },
]

test('アメリカ英語：en-US の中から自然な声（Google など）を選ぶ', () => {
  assert.equal(pickVoice(voices, 'en-US').name, 'Google US English')
})

test('イギリス英語：en-GB の声を選ぶ', () => {
  assert.equal(pickVoice(voices, 'en-GB').name, 'Google UK English Female')
})

test('指定した地域の声が無ければ、ほかの英語の声を使う', () => {
  const onlyUs = voices.filter((v) => v.lang !== 'en-GB')
  assert.equal(pickVoice(onlyUs, 'en-GB').lang, 'en-US')
})

test('ふざけた声（Zarvox など）は選ばない', () => {
  assert.notEqual(pickVoice([{ name: 'Zarvox', lang: 'en-US' }, { name: 'Alex', lang: 'en-US' }], 'en-US').name, 'Zarvox')
})

test('英語の声が1つも無ければ null（言語の指定だけで読む）', () => {
  assert.equal(pickVoice([{ name: 'Kyoko', lang: 'ja-JP' }], 'en-US'), null)
  assert.equal(pickVoice([], 'en-US'), null)
})

test('「en_US」のような書き方（Android）も英語として扱う', () => {
  assert.equal(pickVoice([{ name: 'English United States', lang: 'en_US' }], 'en-US').lang, 'en_US')
})

test('速さ：ゆっくりは遅く、知らない値はふつう', () => {
  assert.ok(rateOf('slow') < rateOf('normal'))
  assert.equal(rateOf('unknown'), rateOf('normal'))
})
