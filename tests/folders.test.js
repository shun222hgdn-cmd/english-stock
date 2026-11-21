// フォルダ機能の自動テスト（Node.js 標準のテスト機能を使用）
// 実行方法: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FOLDER_NAME_MAX,
  cleanFolderName,
  filterByFolder,
  pickCurrentFolder,
  sortFolders,
} from '../src/utils/folders.js'

const folders = [
  { id: 'f1', name: 'しゅん' },
  { id: 'f2', name: 'Sohee' },
  { id: 'f3', name: '母' },
]

const stocks = [
  { id: 's1', folder_id: 'f1', category: 'word', english: 'Ambiguous', japanese: '曖昧な' },
  { id: 's2', folder_id: 'f2', category: 'word', english: 'Efficient', japanese: '効率的な' },
  { id: 's3', folder_id: 'f1', category: 'phrase', english: 'No worries.', japanese: '気にしないで。' },
]

test('フォルダを選ぶと、そのフォルダのデータだけになる（他の人のデータは混ざらない）', () => {
  assert.deepEqual(
    filterByFolder(stocks, 'f1').map((s) => s.id),
    ['s1', 's3'],
  )
  assert.deepEqual(
    filterByFolder(stocks, 'f2').map((s) => s.id),
    ['s2'],
  )
  assert.deepEqual(filterByFolder(stocks, 'f3'), [])
})

test('前回選んでいたフォルダがあれば、それを表示する', () => {
  assert.equal(pickCurrentFolder(folders, 'f2').id, 'f2')
})

test('前回のフォルダが削除されていたら、先頭のフォルダを表示する', () => {
  assert.equal(pickCurrentFolder(folders, 'deleted').id, 'f1')
  assert.equal(pickCurrentFolder(folders, null).id, 'f1')
})

test('フォルダが1つも無ければ null（最初のフォルダ作成画面を出す）', () => {
  assert.equal(pickCurrentFolder([], 'f1'), null)
})

test('フォルダ名：前後の空白を取り除く', () => {
  assert.deepEqual(cleanFolderName('  ソヒ  ', folders), { value: 'ソヒ', error: '' })
})

test('フォルダ名：空欄・空白だけは作れない', () => {
  assert.ok(cleanFolderName('', folders).error)
  assert.ok(cleanFolderName('　 ', folders).error)
})

test('フォルダ名：長すぎる名前は作れない（日本語も1文字として数える）', () => {
  assert.equal(cleanFolderName('あ'.repeat(FOLDER_NAME_MAX), folders).error, '')
  assert.ok(cleanFolderName('あ'.repeat(FOLDER_NAME_MAX + 1), folders).error)
})

test('フォルダ名：同じ名前（大文字・小文字の違いだけ）も作れない', () => {
  assert.ok(cleanFolderName('しゅん', folders).error)
  assert.ok(cleanFolderName('SOHEE', folders).error)
})

test('フォルダ名：名前変更では、自分自身の今の名前は重複扱いしない', () => {
  assert.equal(cleanFolderName('Sohee', folders, 'f2').error, '')
  assert.ok(cleanFolderName('Sohee', folders, 'f1').error)
})

test('フォルダは名前順に並び、元の配列は変更しない', () => {
  const copy = [...folders]
  const sorted = sortFolders(folders)
  assert.equal(sorted.length, 3)
  assert.deepEqual(folders, copy)
  assert.equal(sorted[0].name, 'Sohee') // 英字が先、続いて日本語
})
