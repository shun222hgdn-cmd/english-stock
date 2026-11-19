import { useMemo, useState } from 'react'
import Header from './components/Header'
import Navigation from './components/Navigation'
import SetupNotice from './components/SetupNotice'
import Login from './pages/Login'
import Home from './pages/Home'
import Words from './pages/Words'
import Phrases from './pages/Phrases'
import Quiz from './pages/Quiz'
import { useAuth } from './hooks/useAuth'
import { useStocks } from './hooks/useStocks'
import { isSupabaseConfigured } from './lib/supabase'
import { toErrorMessage } from './utils/errors'

/**
 * アプリの入口。
 * Supabase の接続情報が無いときは設定案内を表示する。
 */
export default function App() {
  if (!isSupabaseConfigured) return <SetupNotice />
  return <AuthGate />
}

/**
 * ログイン状態に応じて表示を切り替える。
 * - 確認中：読み込み表示（個人データは表示しない）
 * - 未ログイン：ログイン画面のみ
 * - ログイン済み：メイン画面
 */
function AuthGate() {
  const { session, authLoading, signIn, signOut } = useAuth()

  if (authLoading) {
    return (
      <main className="center-screen" aria-busy="true">
        <p className="muted">読み込み中…</p>
      </main>
    )
  }

  if (!session) return <Login onSignIn={signIn} />

  // key にユーザーIDを指定：ユーザーが変わると MainApp が作り直され、
  // 前のユーザーの登録データ・出題状態・画面状態がすべて消える
  return <MainApp key={session.user.id} userId={session.user.id} onSignOut={signOut} />
}

/**
 * ログイン後のメイン画面（ヘッダー・各ページ・下部ナビゲーション）。
 * GitHub Pages で再読み込み時に404にならないよう、URLではなく state で画面を切り替える。
 */
function MainApp({ userId, onSignOut }) {
  const [activePage, setActivePage] = useState('home')
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const { stocks, loading, error, reload, addStock, editStock, removeStock } = useStocks(userId)

  // 登録件数は stocks から計算する（固定値や別の状態は使わない）
  const counts = useMemo(() => {
    let word = 0
    let phrase = 0
    for (const stock of stocks) {
      if (stock.category === 'word') word += 1
      else if (stock.category === 'phrase') phrase += 1
    }
    return { word, phrase }
  }, [stocks])

  function navigate(page) {
    setActivePage(page)
    window.scrollTo(0, 0)
  }

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError('')
    try {
      await onSignOut()
      // 成功するとログイン画面に切り替わり、この画面のデータは破棄される
    } catch (err) {
      setSignOutError(toErrorMessage(err, 'ログアウトに失敗しました。'))
      setSigningOut(false)
    }
  }

  // 表示中のページの中身
  function renderPage() {
    if (loading) {
      return (
        <p className="muted center-text page-message" aria-busy="true">
          読み込み中…
        </p>
      )
    }
    if (error) {
      return (
        <div className="card empty-state page-message">
          <p className="error-text" role="alert">
            {error}
          </p>
          <button type="button" className="btn btn-secondary" onClick={reload}>
            再読み込み
          </button>
        </div>
      )
    }

    const stockProps = { stocks, onAdd: addStock, onEdit: editStock, onDelete: removeStock }
    switch (activePage) {
      case 'words':
        return <Words {...stockProps} />
      case 'phrases':
        return <Phrases {...stockProps} />
      case 'quiz':
        return <Quiz stocks={stocks} onNavigate={navigate} />
      default:
        return <Home wordCount={counts.word} phraseCount={counts.phrase} onNavigate={navigate} />
    }
  }

  return (
    <div className="app-shell">
      <Header onSignOut={handleSignOut} signingOut={signingOut} />
      <main className="app-main">
        {signOutError && (
          <p className="alert" role="alert">
            {signOutError}
          </p>
        )}
        {renderPage()}
      </main>
      <Navigation activePage={activePage} onNavigate={navigate} />
    </div>
  )
}
