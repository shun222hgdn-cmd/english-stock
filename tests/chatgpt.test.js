// ChatGPT 連携の受け口の入力チェックの自動テスト（Node.js 標準のテスト機能を使用）
// 実行方法: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_ITEMS,
  normalizeItems,
  pickFolder,
  readBearerToken,
  sha256Hex,
} from '../supabase/functions/chatgpt/logic.js'

test('追加データ：種類・品詞・コメントを整える（種類が無ければスペースの有無で判定）', () => {
  const { valid, skipped } = normalizeItems([
    { english: ' resilient ', japanese: '回復力のある', part_of_speech: '形容詞' },
    { english: 'break the ice', japanese: '場を和ませる', note: '初対面で使う' },
    { english: 'run', japanese: '走る', category: 'word', part_of_speech: '形容動詞' },
  ])
  assert.deepEqual(skipped, [])
  assert.deepEqual(valid, [
    { category: 'word', english: 'resilient', japanese: '回復力のある', part_of_speech: '形容詞', note: null },
    { category: 'phrase', english: 'break the ice', japanese: '場を和ませる', part_of_speech: null, note: '初対面で使う' },
    { category: 'word', english: 'run', japanese: '走る', part_of_speech: null, note: null }, // 一覧に無い品詞は付けない
  ])
})

test('フレーズには品詞を付けない', () => {
  const { valid } = normalizeItems([{ english: 'take off', japanese: '離陸する', category: 'phrase', part_of_speech: '動詞' }])
  assert.equal(valid[0].part_of_speech, null)
})

test('空欄・登録済み・同じ依頼の中の重複はスキップして理由を返す（大文字・小文字は無視）', () => {
  const { valid, skipped } = normalizeItems(
    [
      { english: 'Ambiguous', japanese: '曖昧な' },
      { english: 'diligent', japanese: '' },
      { english: 'Diligent', japanese: '勤勉な' },
      { english: 'DILIGENT', japanese: '勤勉な' },
    ],
    new Set(['ambiguous']),
  )
  assert.deepEqual(
    valid.map((v) => v.english),
    ['Diligent'],
  )
  assert.deepEqual(
    skipped.map((s) => s.reason),
    ['すでに登録済みです', '英語と日本語訳の両方が必要です', 'すでに登録済みです'],
  )
})

test('0件・配列でない・多すぎる依頼はエラー', () => {
  assert.ok(normalizeItems([]).error)
  assert.ok(normalizeItems('resilient').error)
  const many = Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ({ english: `w${i}`, japanese: 'x' }))
  assert.ok(normalizeItems(many).error)
  assert.equal(normalizeItems(many.slice(0, MAX_ITEMS)).valid.length, MAX_ITEMS)
})

test('長すぎる英語・日本語はスキップ、長すぎるコメントは切り詰める', () => {
  const { valid, skipped } = normalizeItems([
    { english: 'a'.repeat(501), japanese: 'x' },
    { english: 'ok', japanese: 'よい', note: 'あ'.repeat(600) },
  ])
  assert.equal(skipped.length, 1)
  assert.equal([...valid[0].note].length, 500)
})

const folders = [
  { id: 'f1', name: 'しゅん', lock_hash: null },
  { id: 'f2', name: 'Sohee', lock_hash: 'pbkdf2$...' },
]

test('フォルダ：名前（大文字・小文字は無視）か ID で選ぶ', () => {
  assert.equal(pickFolder(folders, { folder: 'しゅん' }).folder.id, 'f1')
  assert.equal(pickFolder(folders, { folder_id: 'f1' }).folder.id, 'f1')
})

test('フォルダ：鍵のかかったフォルダには追加しない', () => {
  assert.match(pickFolder(folders, { folder: 'sohee' }).error, /鍵/)
})

test('フォルダ：指定が無いとき、1つだけならそれ、複数なら指定を求める', () => {
  assert.equal(pickFolder([folders[0]], {}).folder.id, 'f1')
  assert.match(pickFolder(folders, {}).error, /指定/)
  assert.match(pickFolder(folders, { folder: 'ない' }).error, /見つかりません/)
})

test('連携キー：Bearer es_ + 64桁の16進数だけを受け付ける', () => {
  const token = `es_${'a1'.repeat(32)}`
  assert.equal(readBearerToken(`Bearer ${token}`), token)
  assert.equal(readBearerToken(token), null)
  assert.equal(readBearerToken('Bearer es_short'), null)
  assert.equal(readBearerToken(undefined), null)
})

test('連携キーのハッシュ：SHA-256 の16進数（データベースの digest と同じ形式）', async () => {
  assert.equal(
    await sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  )
})
