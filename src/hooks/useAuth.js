import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * ログイン状態を管理するフック。
 * - session: ログイン中ならセッション情報、未ログインなら null
 * - authLoading: 起動直後の「ログイン状態の確認中」なら true（確定するまで個人データを表示しない）
 */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let active = true

    // 起動時：保存済みのセッションがあるか確認する
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      setSession(error ? null : data.session)
      setAuthLoading(false)
    })

    // ログイン・ログアウト・トークン更新などの変化を監視して画面に反映する
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setAuthLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  /** メールアドレスとパスワードでログインする（失敗時は例外を投げる） */
  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  /**
   * ログアウトする。
   * scope: 'local' で「この端末だけ」をログアウトする（他の端末のログインは維持する）。
   */
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
  }, [])

  /**
   * ログイン中のユーザーのパスワードを変更する（失敗時は例外を投げる）。
   * 他の端末のログインはそのまま使い続けられる。次にログインするときから新しいパスワードになる。
   */
  const changePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }, [])

  return { session, authLoading, signIn, signOut, changePassword }
}
