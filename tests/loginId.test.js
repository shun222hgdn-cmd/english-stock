// ログインID の変換の自動テスト（Node.js 標準のテスト機能を使用）
// 実行方法: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LOGIN_ID_DOMAIN, toDisplayId, toLoginEmail } from '../src/utils/loginId.js'

test('ID にドメインを付けて Supabase 用のアドレスにする', () => {
  assert.deepEqual(toLoginEmail('shun'), { email: `shun@${LOGIN_ID_DOMAIN}`, error: '' })
})

test('ID の大文字・小文字は区別しない（小文字にそろえる）', () => {
  assert.equal(toLoginEmail('Shun').email, `shun@${LOGIN_ID_DOMAIN}`)
  assert.equal(toLoginEmail('SHUN').email, toLoginEmail('shun').email)
})

test('前後の空白は無視する', () => {
  assert.equal(toLoginEmail('  family  ').email, `family@${LOGIN_ID_DOMAIN}`)
})

test('ID には英数字・ハイフン・アンダーバーが使える', () => {
  assert.equal(toLoginEmail('shun_2026-a').error, '')
})

test('空欄・使えない文字・長すぎる ID はエラー', () => {
  assert.ok(toLoginEmail('').error)
  assert.ok(toLoginEmail('   ').error)
  assert.ok(toLoginEmail('しゅん').error)
  assert.ok(toLoginEmail('shun muranushi').error)
  assert.ok(toLoginEmail('a'.repeat(33)).error)
  assert.equal(toLoginEmail('a'.repeat(32)).error, '')
})

test('「@」を含む入力はメールアドレスとしてそのまま使う（以前のアカウント用）', () => {
  assert.deepEqual(toLoginEmail(' Someone@Example.com '), { email: 'someone@example.com', error: '' })
})

test('画面に出すときは ID に戻す。ID 形式でなければアドレスのまま', () => {
  assert.equal(toDisplayId(`shun@${LOGIN_ID_DOMAIN}`), 'shun')
  assert.equal(toDisplayId('someone@example.com'), 'someone@example.com')
})
