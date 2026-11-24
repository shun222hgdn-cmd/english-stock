import { useCallback, useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import Navigation from './components/Navigation'
import FolderDialog from './components/FolderDialog'
import PasswordDialog from './components/PasswordDialog'
import UndoBar from './components/UndoBar'
import BulkImportDialog from './components/BulkImportDialog'
import SettingsDialog from './components/SettingsDialog'
import SetupNotice from './components/SetupNotice'
import Login from './pages/Login'
import StockPage from './pages/StockPage'
import Quiz from './pages/Quiz'
import FolderSetup from './pages/FolderSetup'
import LockedFolder from './pages/LockedFolder'
import { useAuth } from './hooks/useAuth'
import { useFolders, useStocks } from './hooks/useData'
import { isSupabaseConfigured } from './lib/supabase'
import { loadChoice, loadValue, saveValue } from './lib/preferences'
import { toDisplayId } from './utils/loginId'
import { hashFolderPassword, verifyFolderPassword } from './utils/folderLock'
import { buildCsvFileName, buildStocksCsv } from './utils/csv'
import { QUIZ_CATEGORIES } from './utils/quiz'
import { filterByFolder, pickCurrentFolder } from './utils/folders'
import { toErrorMessage } from './utils/errors'

/** アプリの入口。Supabase の接続情報が無いときは設定案内を出す */
export default function App() {
  return isSupabaseConfigured ? <AuthGate /> : <SetupNotice />
}

/** ログイン状態で表示を切り替える（確認中は個人データを出さない） */
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

  // key：ユーザーが変わると作り直され、前のユーザーのデータや画面の状態はすべて消える
  return <MainApp key={session.user.id} userId={session.user.id} email={session.user.email ?? ''} onSignOut={signOut} />
}

/**
 * ログイン後のメイン画面。GitHub Pages で再読み込みしても404にならないよう、URLではなく state で画面を切り替える。
 * 1つのアカウントを複数人で使えるよう、データは「フォルダ」ごとに分け、どの画面も選んでいるフォルダのデータだけを扱う。
 */
function MainApp({ userId, email, onSignOut }) {
  const [activePage, setActivePage] = useState('stock') // 'stock'：単語帳 / 'quiz'：暗記
  // 単語帳の表示切り替え（すべて / 単語 / フレーズ / 例文）。端末に保存して、開き直しても前回の表示で始める
  const [stockFilter, setStockFilter] = useState(() => loadChoice('stockFilter', QUIZ_CATEGORIES.map((c) => c.value), 'all'))
  const [dialog, setDialog] = useState(null) // 'folders' / 'settings' / 'password' / 'bulk'
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  // この端末で前回選んだフォルダ（無ければ先頭）と、今開いている鍵付きフォルダ（切り替えるか閉じると閉まる）
  const [selectedFolderId, setSelectedFolderId] = useState(() => loadValue(`folder:${userId}`))
  const [unlockedFolderId, setUnlockedFolderId] = useState(null)
  // 削除の直後に出す「元に戻す」（{ key, message, restore } / null）。新しく消したら、そちらに入れ替わる
  const [undo, setUndo] = useState(null)
  const clearUndo = useCallback(() => setUndo(null), [])

  const stocksData = useStocks(userId)
  const foldersData = useFolders(userId)
  const { stocks } = stocksData
  const { folders } = foldersData

  // アプリに戻ってきたとき（タブの切り替え・スマホで開き直したとき）に、他の端末での変更も裏で読み直す
  const { refresh: refreshStocks } = stocksData
  const { refresh: refreshFolders } = foldersData
  useEffect(() => {
    let lastRefresh = Date.now()
    function handleReturn() {
      // 「表示された」と「フォーカスされた」が続けて起きても1回だけ
      if (document.visibilityState !== 'visible' || Date.now() - lastRefresh < 5000) return
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

  const loading = stocksData.loading || foldersData.loading
  const error = foldersData.error || stocksData.error
  const currentFolder = pickCurrentFolder(folders, selectedFolderId)
  const folderStocks = useMemo(
    () => (currentFolder ? filterByFolder(stocks, currentFolder.id) : []),
    [stocks, currentFolder],
  )
  const folderCounts = useMemo(() => {
    const result = {}
    for (const stock of stocks) result[stock.folder_id] = (result[stock.folder_id] ?? 0) + 1
    return result
  }, [stocks])

  /** 鍵がかかっていない、または今開いているフォルダか */
  const isFolderOpen = (folder) => !folder.lock_hash || folder.id === unlockedFolderId

  function navigate(page) {
    setActivePage(page)
    window.scrollTo(0, 0)
  }

  function selectFolder(folderId) {
    if (folderId !== unlockedFolderId) setUnlockedFolderId(null) // 別のフォルダにしたら鍵はまた閉まる
    setSelectedFolderId(folderId)
    saveValue(`folder:${userId}`, folderId)
  }

  /** 表示中のフォルダを CSV にしてダウンロードする（ファイルはこの端末の中だけで作られる） */
  function exportCurrentFolderCsv() {
    if (!currentFolder || !isFolderOpen(currentFolder)) return
    const url = URL.createObjectURL(new Blob([buildStocksCsv(folderStocks)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = buildCsvFileName(currentFolder.name)
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError('')
    try {
      await onSignOut() // 成功するとログイン画面に切り替わり、この画面のデータは破棄される
    } catch (err) {
      setSignOutError(toErrorMessage(err, 'ログアウトに失敗しました。'))
      setSigningOut(false)
    }
  }

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
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              stocksData.reload()
              foldersData.reload()
            }}
          >
            再読み込み
          </button>
        </div>
      )
    }
    // フォルダが1つも無い（新しいアカウント）→ 最初のフォルダを作ってもらう
    if (!currentFolder) {
      return (
        <FolderSetup
          onCreate={async (name) => {
            selectFolder((await foldersData.addFolder(name)).id)
            navigate('stock')
          }}
        />
      )
    }
    // 鍵がかかっていて、まだ開いていないフォルダ
    if (!isFolderOpen(currentFolder)) {
      return (
        <LockedFolder
          key={currentFolder.id}
          folderName={currentFolder.name}
          onUnlock={async (password) => {
            const ok = await verifyFolderPassword(password, currentFolder.lock_hash)
            if (ok) setUnlockedFolderId(currentFolder.id)
            return ok
          }}
          // パスワードを忘れたとき：管理者パスワードで鍵を外す
          onClearWithAdmin={async (adminPassword) => {
            const result = await foldersData.clearLockWithAdmin(currentFolder.id, adminPassword)
            if (result === 'ok') setUnlockedFolderId(currentFolder.id)
            return result
          }}
        />
      )
    }
    // key：フォルダを切り替えると検索や出題の状態がリセットされる
    if (activePage === 'quiz') return <Quiz key={currentFolder.id} stocks={folderStocks} onSetLearned={stocksData.setLearned} />
    return (
      <StockPage
        key={currentFolder.id}
        stocks={folderStocks}
        filter={stockFilter}
        onFilterChange={(filter) => {
          setStockFilter(filter)
          saveValue('stockFilter', filter)
        }}
        // 追加は表示中のフォルダに入れる
        onAdd={(input) => stocksData.addStocks(currentFolder.id, [input])}
        onEdit={stocksData.editStock}
        onSetLearned={stocksData.setLearned}
        // 消したら数秒だけ「元に戻す」を出す（同じ id・同じ内容で戻す）
        onDelete={async (id) => {
          const stock = stocks.find((item) => item.id === id)
          await stocksData.removeStock(id)
          setUndo({ key: Date.now(), message: `「${stock.english}」を削除しました`, restore: () => stocksData.restoreStocks([stock]) })
        }}
      />
    )
  }

  const showMenu = !loading && !error && Boolean(currentFolder)
  const closeDialog = () => setDialog(null)

  return (
    <div className="app-shell">
      <Header
        folderName={showMenu ? currentFolder.name : undefined}
        onOpenFolders={() => setDialog('folders')}
        onOpenSettings={() => setDialog('settings')}
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

      {dialog === 'folders' && showMenu && (
        <FolderDialog
          folders={folders}
          currentId={currentFolder.id}
          counts={folderCounts}
          onSelect={selectFolder}
          onAdd={foldersData.addFolder}
          onRename={foldersData.renameFolder}
          // 削除したら中のデータも手元から消す（データベース側は自動で削除される）。
          // 戻せるように、フォルダと中身を覚えておく
          onDelete={async (folderId) => {
            const folder = folders.find((item) => item.id === folderId)
            const contents = filterByFolder(stocks, folderId)
            await foldersData.removeFolder(folderId)
            stocksData.forgetFolderStocks(folderId)
            let folderBack = false // 途中で失敗してもう一度押したとき、フォルダを二重に戻さない
            setUndo({
              key: Date.now(),
              message: `フォルダ「${folder.name}」を削除しました`,
              restore: async () => {
                if (!folderBack) await foldersData.restoreFolder(folder)
                folderBack = true
                if (contents.length > 0) await stocksData.restoreStocks(contents)
              },
            })
          }}
          isFolderOpen={isFolderOpen}
          onLock={async (folderId, password) => {
            await foldersData.setLock(folderId, await hashFolderPassword(password))
            // 表示中のフォルダに鍵をかけても、その場では締め出さない
            if (folderId === currentFolder.id) setUnlockedFolderId(folderId)
          }}
          // 鍵を外す（今のパスワードが正しいときだけ。正しければ true）
          onRemoveLock={async (folderId, password) => {
            const folder = folders.find((item) => item.id === folderId)
            if (!folder?.lock_hash || !(await verifyFolderPassword(password, folder.lock_hash))) return false
            await foldersData.setLock(folderId, null)
            return true
          }}
          onClose={closeDialog}
        />
      )}

      {dialog === 'settings' && (
        <SettingsDialog
          loginId={toDisplayId(email)}
          folderName={currentFolder?.name}
          exportCount={folderStocks.length}
          canExport={Boolean(currentFolder) && isFolderOpen(currentFolder)}
          onExportCsv={exportCurrentFolderCsv}
          learnedCount={folderStocks.filter((stock) => stock.learned).length}
          // 覚えたものをまとめて削除 → 設定を閉じて「元に戻す」を出す
          onDeleteLearned={async () => {
            const learned = folderStocks.filter((stock) => stock.learned)
            await stocksData.removeStocks(learned.map((stock) => stock.id))
            closeDialog()
            setUndo({
              key: Date.now(),
              message: `覚えた ${learned.length}件を削除しました`,
              restore: () => stocksData.restoreStocks(learned),
            })
          }}
          signingOut={signingOut}
          onOpenPassword={() => setDialog('password')}
          onOpenBulk={() => setDialog('bulk')}
          onSignOut={handleSignOut}
          onClose={closeDialog}
        />
      )}

      {dialog === 'password' && <PasswordDialog email={email} onClose={closeDialog} />}

      {/* まとめて追加（⚙ 設定から）：表示中のフォルダに入れる */}
      {dialog === 'bulk' && currentFolder && isFolderOpen(currentFolder) && (
        <BulkImportDialog
          folderName={currentFolder.name}
          existingStocks={folderStocks}
          onImport={(items) => stocksData.addStocks(currentFolder.id, items)}
          onClose={closeDialog}
        />
      )}

      {undo && <UndoBar key={undo.key} message={undo.message} onUndo={undo.restore} onClose={clearUndo} />}
    </div>
  )
}
