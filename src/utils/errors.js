/**
 * Supabase などから返ってきたエラーを、利用者向けの日本語メッセージに変換する。
 * @param {unknown} error 発生したエラー
 * @param {string} fallback 想定外のエラーのときに表示する文
 */
export function toErrorMessage(error, fallback = 'エラーが発生しました。') {
  const message = String(error?.message ?? '')
  const code = String(error?.code ?? '')

  if (/invalid login credentials/i.test(message)) return 'IDまたはパスワードが正しくありません。'
  if (/email not confirmed/i.test(message)) {
    return 'このアカウントは確認が完了していません。Supabase Dashboard でユーザーを作るときに「Auto Confirm User」にチェックを入れてください。'
  }
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return '通信エラーが発生しました。インターネット接続を確認して、もう一度お試しください。'
  }
  if (/jwt|refresh token|not authenticated/i.test(message)) {
    return 'ログインの有効期限が切れました。ログアウトして、もう一度ログインしてください。'
  }
  // 更新・削除の対象が無い（他の端末で削除された）
  if (code === 'PGRST116') return '対象のデータが見つかりませんでした。他の端末で削除された可能性があります。'
  // 一意制約（同じ名前のフォルダなど）
  if (code === '23505') return '同じ名前のものがすでにあります。別の名前にしてください。'
  // 参照先が無い（別の端末でフォルダが削除された場合など）
  if (code === '23503') {
    return 'フォルダが見つかりませんでした。他の端末で削除された可能性があります。再読み込みしてください。'
  }
  if (code === '42501') return 'このデータを操作する権限がありません。'

  // 想定外のエラーは原因調査のため元のメッセージも添える
  return message ? `${fallback}（${message}）` : fallback
}

/** 管理者パスワードを使うデータベースの関数が返す結果 → 画面に出すメッセージ */
export const ADMIN_RESULT_MESSAGES = {
  wrong_admin: '管理者パスワードが違います。5回間違えると15分間ロックされます。',
  locked: '管理者パスワードを5回間違えたため、15分間ロックされています。時間をおいてやり直してください。',
  not_set: '管理者パスワードがまだ設定されていません。',
  already_set: '管理者パスワードはすでに設定されています。画面を開き直してください。',
  too_short: 'パスワードは8文字以上にしてください。',
  not_found: 'フォルダが見つかりませんでした。',
  not_authenticated: 'ログインの有効期限が切れました。ログインし直してください。',
}
