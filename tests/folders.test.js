// フォルダ機能の自動テスト（Node.js 標準のテスト機能を使用）
// 実行方法: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FOLDER_NAME_MAX,
  cleanFolderName,
  filterByFolder,
  filterByFolders,
  folderDepth,
  folderPath,
  folderSubtree,
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

// 入れ子：English ─ Junior ─ Year1、English ─ High、Math
const tree = [
  { id: 'h', name: 'High', parent_id: 'e' },
  { id: 'm', name: 'Math', parent_id: null },
  { id: 'j1', name: 'Year1', parent_id: 'j' },
  { id: 'e', name: 'English', parent_id: null },
  { id: 'j', name: 'Junior', parent_id: 'e' },
]

test('入れ子：親のすぐ後に子が並ぶ（同じ親の中は名前順）', () => {
  assert.deepEqual(sortFolders(tree).map((f) => f.id), ['e', 'h', 'j', 'j1', 'm'])
})

test('入れ子：深さと、いちばん上からの道のり', () => {
  assert.equal(folderDepth(tree, 'e'), 1)
  assert.equal(folderDepth(tree, 'j1'), 3)
  assert.deepEqual(folderPath(tree, 'j1'), ['e', 'j', 'j1'])
})

test('入れ子：フォルダの中身（中のフォルダも含む）', () => {
  assert.deepEqual([...folderSubtree(tree, 'e')].sort(), ['e', 'h', 'j', 'j1'])
  assert.deepEqual([...folderSubtree(tree, 'm')], ['m'])
  const list = [
    { id: 1, folder_id: 'j1' },
    { id: 2, folder_id: 'm' },
    { id: 3, folder_id: 'e' },
  ]
  assert.deepEqual(filterByFolders(list, folderSubtree(tree, 'e')).map((s) => s.id), [1, 3])
})

test('入れ子：親が見つからないフォルダは、いちばん上として扱う', () => {
  assert.deepEqual(sortFolders([{ id: 'x', name: 'X', parent_id: 'gone' }]).map((f) => f.id), ['x'])
})
