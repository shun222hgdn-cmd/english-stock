// フォルダの鍵の自動テスト（Node.js 標準のテスト機能を使用）
// 実行方法: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashFolderPassword, validateFolderLock, verifyFolderPassword } from '../src/utils/folderLock.js'

test('正しいパスワードなら開ける・違えば開けない', async () => {
  const stored = await hashFolderPassword('sohee-1234')
  assert.equal(await verifyFolderPassword('sohee-1234', stored), true)
  assert.equal(await verifyFolderPassword('sohee-1235', stored), false)
  assert.equal(await verifyFolderPassword('', stored), false)
})

test('パスワードそのものは保存されない（ハッシュの形式で保存される）', async () => {
  const stored = await hashFolderPassword('sohee-1234')
  assert.ok(stored.startsWith('pbkdf2$'))
  assert.ok(!stored.includes('sohee-1234'))
  assert.ok(stored.length <= 200) // データベースの制約に収まる
})

test('同じパスワードでも毎回違うハッシュになる（ソルト付き）', async () => {
  const a = await hashFolderPassword('same-pass')
  const b = await hashFolderPassword('same-pass')
  assert.notEqual(a, b)
  assert.equal(await verifyFolderPassword('same-pass', a), true)
  assert.equal(await verifyFolderPassword('same-pass', b), true)
})

test('壊れた・空のハッシュでは開けない', async () => {
  assert.equal(await verifyFolderPassword('x', null), false)
  assert.equal(await verifyFolderPassword('x', 'plain-text'), false)
  assert.equal(await verifyFolderPassword('x', 'pbkdf2$abc$AAAA$AAAA'), false)
})

test('鍵のパスワード：4文字以上で、確認用と一致すれば OK', () => {
  assert.equal(validateFolderLock('1234', '1234'), '')
  assert.ok(validateFolderLock('', ''))
  assert.ok(validateFolderLock('123', '123'))
  assert.ok(validateFolderLock('1234', '1235'))
})
