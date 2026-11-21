import { useMemo, useState } from 'react'
import Header from './components/Header'
import Navigation from './components/Navigation'
import FolderDialog from './components/FolderDialog'
import SetupNotice from './components/SetupNotice'
import Login from './pages/Login'
import Home from './pages/Home'
import StockPage from './pages/StockPage'
import Quiz from './pages/Quiz'
import FolderSetup from './pages/FolderSetup'
import { useAuth } from './hooks/useAuth'
import { useStocks } from './hooks/useStocks'
import { useFolders } from './hooks/useFolders'
import { isSupabaseConfigured } from './lib/supabase'
import { loadFolderPreference, saveFolderPreference } from './lib/folderPreference'
import { filterByFolder, pickCurrentFolder } from './utils/folders'
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
 *
 * 1つのアカウントを複数人で使えるよう、データは「フォルダ」ごとに分けて表示する。
 * どの画面も、選んでいるフォルダのデータだけを扱う。
 */
function MainApp({ userId, onSignOut }) {
  const [activePage, setActivePage] = useState('home')
  // ストック画面の表示切り替え（All / Words / Phrases）。画面を移動しても覚えておく
  const [stockFilter, setStockFilter] = useState('all')
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  // この端末で前回選んだフォルダ（無ければ先頭のフォルダを表示）
  const [selectedFolderId, setSelectedFolderId] = useState(() => loadFolderPreference(userId))

  const stocksState = useStocks(userId)
  const foldersState = useFolders(userId)
  const { stocks, addStock, editStock, removeStock, forgetFolderStocks } = stocksState
  const { folders, addFolder, editFolder, removeFolder } = foldersState

  const loading = stocksState.loading || foldersState.loading
  const error = foldersState.error || stocksState.error

  // 表示中のフォルダと、そのフォルダのデータ
  const currentFolder = pickCurrentFolder(folders, selectedFolderId)
  const folderStocks = useMemo(
    () => (currentFolder ? filterByFolder(stocks, currentFolder.id) : []),
    [stocks, currentFolder],
  )

  // 登録件数は stocks から計算する（固定値や別の状態は使わない）
  const counts = useMemo(() => {
    let word = 0
    let phrase = 0
    for (const stock of folderStocks) {
      if (stock.category === 'word') word += 1
      else if (stock.category === 'phrase') phrase += 1
    }
    return { word, phrase }
  }, [folderStocks])

  // フォルダごとの件数（フォルダ切り替え画面に表示）
  const folderCounts = useMemo(() => {
    const result = {}
    for (const stock of stocks) result[stock.folder_id] = (result[stock.folder_id] ?? 0) + 1
    return result
  }, [stocks])

  /**
   * 画面の移動。'words' / 'phrases' を指定すると、ストック画面をその種類で開く
   * （ホームの件数カードや、復習画面の「登録する」ボタンから使う）。
   */
  function navigate(page) {
    if (page === 'words' || page === 'phrases') {
      setStockFilter(page === 'words' ? 'word' : 'phrase')
      setActivePage('stock')
    } else {
      setActivePage(page)
    }
    window.scrollTo(0, 0)
  }

  function selectFolder(folderId) {
    setSelectedFolderId(folderId)
    saveFolderPreference(userId, folderId)
  }

  // 新しいフォルダを作って、そのフォルダに切り替える（最初のフォルダ作成画面用）
  async function createFirstFolder(name) {
    const created = await addFolder(name)
    selectFolder(created.id)
    navigate('home')
  }

  // フォルダを削除したら、中のデータも手元から消す（データベース側は自動で削除される）
  async function deleteFolder(folderId) {
    await removeFolder(folderId)
    forgetFolderStocks(folderId)
  }

  function reload() {
    stocksState.reload()
    foldersState.reload()
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
    // フォルダが1つも無い（新しいアカウント）→ 最初のフォルダを作ってもらう
    if (!currentFolder) {
      return <FolderSetup onCreate={createFirstFolder} />
    }

    const stockProps = {
      stocks: folderStocks,
      // 登録は表示中のフォルダに入れる
      onAdd: (input) => addStock({ ...input, folder_id: currentFolder.id }),
      onEdit: editStock,
      onDelete: removeStock,
    }
    // key にフォルダIDを指定：フォルダを切り替えると検索や出題の状態がリセットされる
    switch (activePage) {
      case 'stock':
        return (
          <StockPage
            key={currentFolder.id}
            {...stockProps}
            filter={stockFilter}
            onFilterChange={setStockFilter}
          />
        )
      case 'quiz':
        return <Quiz key={currentFolder.id} stocks={folderStocks} />
      default:
        return <Home wordCount={counts.word} phraseCount={counts.phrase} onNavigate={navigate} />
    }
  }

  const showMenu = !loading && !error && Boolean(currentFolder)

  return (
    <div className="app-shell">
      <Header
        folderName={showMenu ? currentFolder.name : undefined}
        onOpenFolders={() => setFolderDialogOpen(true)}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />
      <main className="app-main">
        {signOutError && (
          <p className="alert" role="alert">
            {signOutError}
          </p>
        )}
        {renderPage()}
      </main>
      {showMenu && <Navigation activePage={activePage} onNavigate={navigate} />}

      {folderDialogOpen && showMenu && (
        <FolderDialog
          folders={folders}
          currentId={currentFolder.id}
          counts={folderCounts}
          onSelect={selectFolder}
          onAdd={addFolder}
          onRename={editFolder}
          onDelete={deleteFolder}
          onClose={() => setFolderDialogOpen(false)}
        />
      )}
    </div>
  )
}
