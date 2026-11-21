/**
 * Supabase などから返ってきたエラーを、利用者向けの日本語メッセージに変換する。
 * @param {unknown} error 発生したエラー
 * @param {string} fallback 想定外のエラーのときに表示する文
 */
export function toErrorMessage(error, fallback = 'エラーが発生しました。') {
  const message = String(error?.message ?? '')
  const code = String(error?.code ?? '')

  if (/invalid login credentials/i.test(message)) {
    return 'メールアドレスまたはパスワードが正しくありません。'
  }
  if (/email not confirmed/i.test(message)) {
    return 'メールアドレスの確認が完了していません。Supabase Dashboard でユーザーを確認済みにしてください。'
  }
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return '通信エラーが発生しました。インターネット接続を確認して、もう一度お試しください。'
  }
  if (/jwt|refresh token|not authenticated/i.test(message)) {
    return 'ログインの有効期限が切れました。ログアウトして、もう一度ログインしてください。'
  }
  if (code === 'PGRST116') {
    // update().single() で対象が見つからなかった場合
    return '対象のデータが見つかりませんでした。他の端末で削除された可能性があります。'
  }
  if (code === '23505') {
    // 一意制約違反（同じ名前のフォルダなど）
    return '同じ名前のものがすでにあります。別の名前にしてください。'
  }
  if (code === '23503') {
    // 参照先が無い（別の端末でフォルダが削除された場合など）
    return 'フォルダが見つかりませんでした。他の端末で削除された可能性があります。再読み込みしてください。'
  }
  if (code === '42501') {
    return 'このデータを操作する権限がありません。'
  }

  // 想定外のエラーは原因調査のため元のメッセージも添える
  return message ? `${fallback}（${message}）` : fallback
}
