import { supabase } from '../lib/supabase'

// 管理者パスワードとパスワード変更の通信処理。
// 実際の確認・変更はデータベース側の関数（supabase/migrations/003_admin_password_lock.sql）で行う。
// 管理者パスワードを通さないパスワード変更は、データベースが拒否する。

/** 管理者パスワードが設定済みか */
export async function isAdminPasswordSet() {
  const { data, error } = await supabase.rpc('admin_password_is_set')
  if (error) throw error
  return data === true
}

/**
 * 管理者パスワードを最初に設定する（まだ設定されていないときだけ成功する）。
 * @returns {Promise<'ok' | 'already_set' | 'too_short' | 'not_authenticated'>}
 */
export async function setAdminPassword(adminPassword) {
  const { data, error } = await supabase.rpc('set_admin_password', { new_admin_password: adminPassword })
  if (error) throw error
  return data
}

/**
 * 管理者パスワードを確認して、ログイン中のユーザーのパスワードを変更する。
 * @returns {Promise<'ok' | 'wrong_admin' | 'locked' | 'not_set' | 'too_short' | 'not_authenticated'>}
 */
export async function changePasswordWithAdmin(adminPassword, newPassword) {
  const { data, error } = await supabase.rpc('change_password_with_admin', {
    admin_password: adminPassword,
    new_password: newPassword,
  })
  if (error) throw error
  return data
}
