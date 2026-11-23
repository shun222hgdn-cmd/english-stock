// フォルダの鍵（任意）のパスワード処理。
// パスワードそのものは保存せず、PBKDF2（ブラウザ標準の Web Crypto）で作ったハッシュだけを保存する。
// 形式：pbkdf2$<回数>$<ソルト(Base64)>$<ハッシュ(Base64)>
//
// ※ これは「画面での鍵」。同じアカウントでログインできる人が API を直接使えば、中身は読める。

const ITERATIONS = 100000
const encoder = new TextEncoder()

/** 鍵のパスワードの最小文字数 */
export const FOLDER_LOCK_MIN_LENGTH = 4

const toBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)))
const fromBase64 = (text) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0))

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
}

/** 鍵のパスワードからハッシュを作る（毎回ランダムなソルトを使う） */
export async function hashFolderPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await derive(String(password), salt, ITERATIONS)
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(bits)}`
}

/** 入力されたパスワードが、保存されたハッシュと一致するか */
export async function verifyFolderPassword(password, stored) {
  const parts = String(stored ?? '').split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  if (!Number.isInteger(iterations) || iterations <= 0) return false

  const expected = toBase64(await derive(String(password ?? ''), fromBase64(parts[2]), iterations))
  // 文字ごとの比較で早く抜けないようにする
  const actual = parts[3]
  let diff = expected.length ^ actual.length
  for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
    diff |= (expected.charCodeAt(i) || 0) ^ (actual.charCodeAt(i) || 0)
  }
  return diff === 0
}

/**
 * 新しく設定する鍵のパスワードの入力チェック（4文字以上・確認用と一致）。問題なければ空文字。
 */
export function validateFolderLock(password, confirmation) {
  const value = String(password ?? '')
  if (!value) return 'パスワードを入力してください。'
  if (value.length < FOLDER_LOCK_MIN_LENGTH) return `パスワードは${FOLDER_LOCK_MIN_LENGTH}文字以上にしてください。`
  if (value !== String(confirmation ?? '')) return '確認用のパスワードが一致しません。'
  return ''
}
