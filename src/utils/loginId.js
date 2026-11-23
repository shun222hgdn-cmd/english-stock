// ログインID ⇔ Supabase 用のアドレスの変換
//
// Supabase Auth は内部で必ず「メールアドレスの形」でアカウントを管理するため、
// 画面で入力された ID（例：shun）に決まったドメインを付けて shun@english-stock.invalid のように変換する。
//
// ドメインには「.invalid」（実在できないと規格で決められている名前）を使う。
// 実在するドメインを使うと、その持ち主にパスワード再設定メールが届き、乗っ取りに使われる恐れがあるため。
// メールは一切送らない運用なので、実在しないアドレスで問題ない。

/** ID に付けるドメイン */
export const LOGIN_ID_DOMAIN = 'english-stock.invalid'

/** ID に使える文字（英数字・ハイフン・アンダーバー、1〜32文字） */
const ID_PATTERN = /^[a-z0-9_-]{1,32}$/

/**
 * ログイン画面の入力を、Supabase に送るアドレスに変換する。
 * - 「@」を含む場合はメールアドレスとしてそのまま使う（以前のアカウントもログインできる）
 * - それ以外は ID とみなし、小文字にしてドメインを付ける（大文字・小文字は区別しない）
 *
 * @param {string} input 入力された ID またはメールアドレス
 * @returns {{ email: string, error: string }}
 */
export function toLoginEmail(input) {
  const value = String(input ?? '').trim()
  if (!value) return { email: '', error: 'IDを入力してください。' }

  if (value.includes('@')) return { email: value.toLowerCase(), error: '' }

  const id = value.toLowerCase()
  if (!ID_PATTERN.test(id)) {
    return { email: '', error: 'IDは半角英数字・「-」「_」の32文字以内で入力してください。' }
  }
  return { email: `${id}@${LOGIN_ID_DOMAIN}`, error: '' }
}

/**
 * Supabase のアドレスを、画面に出す ID に戻す（ID 形式でなければアドレスのまま）。
 * 例：shun@english-stock.invalid → shun
 */
export function toDisplayId(email) {
  const value = String(email ?? '')
  const suffix = `@${LOGIN_ID_DOMAIN}`
  return value.toLowerCase().endsWith(suffix) ? value.slice(0, -suffix.length) : value
}
