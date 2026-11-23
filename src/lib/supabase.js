import { createClient } from '@supabase/supabase-js'

// Supabase の接続情報は環境変数から読む（ローカルは .env.local、GitHub Pages は Actions の Variables）。
// Publishable Key は公開してよい鍵で、データは RLS で守られている。
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** 接続情報がそろっているか（なければ App が設定案内を出す） */
export const isSupabaseConfigured = Boolean(url && key)

export const supabase = isSupabaseConfigured ? createClient(url, key) : null
