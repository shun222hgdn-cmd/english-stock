import { createClient } from '@supabase/supabase-js'

// Supabase の接続情報は環境変数から読み込む（コードに直接書かない）。
// ローカル開発では .env.local、GitHub Pages では GitHub Actions の Variables から渡される。
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// 新しい Publishable Key を優先し、未設定なら旧 anon key を使う
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

// 接続情報がそろっているか（そろっていなければ App が設定案内を表示する）
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

// アプリ全体で使い回す Supabase クライアント（未設定の場合は null）
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null
