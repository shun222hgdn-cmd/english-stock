import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import Navigation from './components/Navigation'
import FolderDialog from './components/FolderDialog'
import PasswordDialog from './components/PasswordDialog'
import SettingsDialog from './components/SettingsDialog'
import ChatgptDialog from './components/ChatgptDialog'
import SetupNotice from './components/SetupNotice'
import Login from './pages/Login'
import StockPage from './pages/StockPage'
import Quiz from './pages/Quiz'
import FolderSetup from './pages/FolderSetup'
import LockedFolder from './pages/LockedFolder'
import { useAuth } from './hooks/useAuth'
import { useStocks } from './hooks/useStocks'
import { useFolders } from './hooks/useFolders'
import { isSupabaseConfigured } from './lib/supabase'
import { loadFolderPreference, saveFolderPreference } from './lib/folderPreference'
import { toDisplayId } from './utils/loginId'
import { hashFolderPassword, verifyFolderPassword } from './utils/folderLock'
import { buildCsvFileName, buildStocksCsv } from './utils/csv'
import { loadChoice, saveChoice } from './lib/preferences'
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
  return (
    <MainApp
      key={session.user.id}
      userId={session.user.id}
      email={session.user.email ?? ''}
      onSignOut={signOut}
    />
  )
}

/**
 * ログイン後のメイン画面（ヘッダー・各ページ・下部ナビゲーション）。
 * GitHub Pages で再読み込み時に404にならないよう、URLではなく state で画面を切り替える。
 *
 * 1つのアカウントを複数人で使えるよう、データは「フォルダ」ごとに分けて表示する。
 * どの画面も、選んでいるフォルダのデータだけを扱う。
 */
function MainApp({ userId, email, onSignOut }) {
  // 表示中の画面（'stock'：単語帳 / 'quiz'：暗記）。最初は単語帳
  const [activePage, setActivePage] = useState('stock')
  // 単語帳の表示切り替え（すべて / 単語 / フレーズ）。端末に保存し、開き直しても前回の表示で始める
  const [stockFilter, setStockFilterState] = useState(() =>
    loadChoice('stockFilter', ['all', 'word', 'phrase'], 'all'),
  )
  function setStockFilter(filter) {
    setStockFilterState(filter)
    saveChoice('stockFilter', filter)
  }
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chatgptOpen, setChatgptOpen] = useState(false)
  // この端末で前回選んだフォルダ（無ければ先頭のフォルダを表示）
  const [selectedFolderId, setSelectedFolderId] = useState(() => loadFolderPreference(userId))
  // 鍵付きフォルダのうち、今開いているもの（別のフォルダに切り替えるか、アプリを閉じると閉じる）
  const [unlockedFolderId, setUnlockedFolderId] = useState(null)

  const stocksState = useStocks(userId)
  const foldersState = useFolders(userId)
  const { stocks, addStock, addStocks, editStock, removeStock, forgetFolderStocks } = stocksState
  const { folders, addFolder, editFolder, removeFolder, setLock, clearLockWithAdmin } = foldersState

  // アプリに戻ってきたとき（タブの切り替え・スマホでアプリを開き直したとき）に、
  // 最新のデータを裏で読み直す。他の端末で登録した分もそのまま反映される。
  const refreshStocks = stocksState.refresh
  const refreshFolders = foldersState.refresh
  useEffect(() => {
    let lastRefresh = Date.now()
    function handleReturn() {
      if (document.visibilityState !== 'visible') return
      // 「表示された」と「フォーカスされた」が続けて起きても、1回だけ読み直す
      if (Date.now() - lastRefresh < 5000) return
      lastRefresh = Date.now()
      refreshFolders()
      refreshStocks()
    }
    document.addEventListener('visibilitychange', handleReturn)
    window.addEventListener('focus', handleReturn)
    return () => {
      document.removeEventListener('visibilitychange', handleReturn)
      window.removeEventListener('focus', handleReturn)
    }
  }, [refreshStocks, refreshFolders])

  const loading = stocksState.loading || foldersState.loading
  const error = foldersState.error || stocksState.error

  // 表示中のフォルダと、そのフォルダのデータ
  const currentFolder = pickCurrentFolder(folders, selectedFolderId)
  const folderStocks = useMemo(
    () => (currentFolder ? filterByFolder(stocks, currentFolder.id) : []),
    [stocks, currentFolder],
  )

  // フォルダごとの件数（フォルダ切り替え画面に表示）
  const folderCounts = useMemo(() => {
    const result = {}
    for (const stock of stocks) result[stock.folder_id] = (result[stock.folder_id] ?? 0) + 1
    return result
  }, [stocks])

  /** 画面の移動（'stock'：単語帳 / 'quiz'：暗記） */
  function navigate(page) {
    setActivePage(page)
    window.scrollTo(0, 0)
  }

  function selectFolder(folderId) {
    // 別のフォルダに切り替えたら、開いていた鍵付きフォルダはまた閉じる
    if (folderId !== unlockedFolderId) setUnlockedFolderId(null)
    setSelectedFolderId(folderId)
    saveFolderPreference(userId, folderId)
  }

  /** 鍵がかかっていない、または今開いているフォルダか */
  function isFolderOpen(folder) {
    return !folder.lock_hash || folder.id === unlockedFolderId
  }

  /**
   * 表示中のフォルダの単語・フレーズを CSV ファイルにしてダウンロードする。
   * ファイルはこの端末の中だけで作られ、どこにも送られない。
   */
  function exportCurrentFolderCsv() {
    if (!currentFolder || !isFolderOpen(currentFolder)) return
    const csv = buildStocksCsv(folderStocks)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = buildCsvFileName(currentFolder.name)
    document.body.appendChild(link)
    link.click()
    link.remove()
    // ダウンロードが始まってから、一時的な URL を片付ける
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // 鍵付きフォルダを開く（パスワードが正しければ true）
  async function unlockCurrentFolder(password) {
    const ok = await verifyFolderPassword(password, currentFolder.lock_hash)
    if (ok) setUnlockedFolderId(currentFolder.id)
    return ok
  }

  // パスワードを忘れたとき：管理者パスワードで鍵を外す
  async function clearCurrentLockWithAdmin(adminPassword) {
    const result = await clearLockWithAdmin(currentFolder.id, adminPassword)
    if (result === 'ok') setUnlockedFolderId(currentFolder.id)
    return result
  }

  // 鍵をかける（このあとも、切り替えるまでは開いたまま使える）
  async function lockFolder(folderId, password) {
    await setLock(folderId, await hashFolderPassword(password))
    // 表示中のフォルダに鍵をかけた場合は、その場で締め出さない
    if (folderId === currentFolder?.id) setUnlockedFolderId(folderId)
  }

  // 鍵を外す（今のパスワードが正しいときだけ。正しければ true）
  async function unlockFolderPermanently(folderId, password) {
    const folder = folders.find((item) => item.id === folderId)
    if (!folder?.lock_hash || !(await verifyFolderPassword(password, folder.lock_hash))) return false
    await setLock(folderId, null)
    return true
  }

  // 新しいフォルダを作って、そのフォルダに切り替える（最初のフォルダ作成画面用）
  async function createFirstFolder(name) {
    const created = await addFolder(name)
    selectFolder(created.id)
    navigate('stock')
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
    // 鍵がかかっていて、まだ開いていないフォルダ → パスワード入力の画面
    if (!isFolderOpen(currentFolder)) {
      return (
        <LockedFolder
          key={currentFolder.id}
          folderName={currentFolder.name}
          onUnlock={unlockCurrentFolder}
          onClearWithAdmin={clearCurrentLockWithAdmin}
        />
      )
    }

    const stockProps = {
      stocks: folderStocks,
      // 登録は表示中のフォルダに入れる
      onAdd: (input) => addStock({ ...input, folder_id: currentFolder.id }),
      onEdit: editStock,
      onDelete: removeStock,
      // まとめて追加も、表示中のフォルダに入れる
      onAddMany: (items) => addStocks(currentFolder.id, items),
      folderName: currentFolder.name,
    }
    // key にフォルダIDを指定：フォルダを切り替えると検索や出題の状態がリセットされる
    if (activePage === 'quiz') {
      return <Quiz key={currentFolder.id} stocks={folderStocks} />
    }
    return (
      <StockPage key={currentFolder.id} {...stockProps} filter={stockFilter} onFilterChange={setStockFilter} />
    )
  }

  const showMenu = !loading && !error && Boolean(currentFolder)

  return (
    <div className="app-shell">
      <Header
        folderName={showMenu ? currentFolder.name : undefined}
        onOpenFolders={() => setFolderDialogOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
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
          isFolderOpen={isFolderOpen}
          onLock={lockFolder}
          onRemoveLock={unlockFolderPermanently}
          onClose={() => setFolderDialogOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          loginId={toDisplayId(email)}
          folderName={currentFolder?.name}
          exportCount={folderStocks.length}
          canExport={Boolean(currentFolder) && isFolderOpen(currentFolder)}
          onExportCsv={exportCurrentFolderCsv}
          signingOut={signingOut}
          onOpenPassword={() => {
            // 設定を閉じてから、パスワード変更を開く
            setSettingsOpen(false)
            setPasswordDialogOpen(true)
          }}
          onOpenChatgpt={() => {
            setSettingsOpen(false)
            setChatgptOpen(true)
          }}
          onSignOut={handleSignOut}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {chatgptOpen && <ChatgptDialog onClose={() => setChatgptOpen(false)} />}

      {passwordDialogOpen && (
        <PasswordDialog
          email={email}
          onClose={() => setPasswordDialogOpen(false)}
        />
      )}
    </div>
  )
}
