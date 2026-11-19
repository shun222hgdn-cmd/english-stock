/**
 * Supabase の接続情報（環境変数）が未設定のときに表示する案内画面。
 * 設定方法の詳細は README.md を参照。
 */
export default function SetupNotice() {
  return (
    <main className="center-screen">
      <div className="card setup-card">
        <h1 className="page-title">English Stock</h1>
        <p>Supabase の接続情報が設定されていません。</p>
        <ol className="setup-steps">
          <li>
            <code>.env.example</code> をコピーして <code>.env.local</code> を作成
          </li>
          <li>
            <code>VITE_SUPABASE_URL</code> と <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> を設定
          </li>
          <li>開発サーバー（npm run dev）を再起動</li>
        </ol>
        <p className="muted">詳しい手順は README.md を確認してください。</p>
      </div>
    </main>
  )
}
