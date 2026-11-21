import { useMemo, useState } from 'react'
import SearchBar from '../components/SearchBar'
import StockCard from '../components/StockCard'
import StockForm from '../components/StockForm'
import ConfirmDialog from '../components/ConfirmDialog'
import { PlusIcon } from '../components/Icons'
import { filterStocks, sortByEnglish } from '../utils/search'

/**
 * 英単語ストック画面・フレーズストック画面の共通部分。
 * category を変えるだけで、どちらの画面としても使える（同じコードを2回書かないため）。
 *
 * @param {{
 *   category: 'word' | 'phrase',
 *   title: string,              // 画面タイトル（Words / Phrases）
 *   singular: string,           // フォームの見出し用（Word / Phrase）
 *   noun: string,               // 「英単語」「フレーズ」（メッセージ用）
 *   stocks: Array<object>,      // 全登録データ（この画面のカテゴリーだけをここで絞り込む）
 *   onAdd: (input: object) => Promise<void>,
 *   onEdit: (id: string, input: object) => Promise<void>,
 *   onDelete: (id: string) => Promise<void>,
 * }} props
 */
export default function StockPage({ category, title, singular, noun, stocks, onAdd, onEdit, onDelete }) {
  const [searchQuery, setSearchQuery] = useState('')
  // 登録・編集フォームの状態（null: 閉じている / { mode: 'add' } / { mode: 'edit', stock }）
  const [editingStock, setEditingStock] = useState(null)
  // 削除確認ダイアログの対象（null: 閉じている）
  const [deleteTarget, setDeleteTarget] = useState(null)

  // この画面のカテゴリーのデータだけ
  const categoryStocks = useMemo(
    () => stocks.filter((stock) => stock.category === category),
    [stocks, category],
  )
  // 検索で絞り込み、アルファベット順に並べたもの
  const visibleStocks = useMemo(
    () => sortByEnglish(filterStocks(categoryStocks, searchQuery)),
    [categoryStocks, searchQuery],
  )

  const isSearching = searchQuery.trim() !== ''

  // フォームの保存処理（カテゴリーは表示中の画面で自動的に決まる）
  async function handleSubmit(values) {
    if (editingStock.mode === 'edit') {
      await onEdit(editingStock.stock.id, values)
    } else {
      await onAdd({ category, ...values })
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <h1 className="page-title">
          {title}
          <span className="count-badge" aria-label={`${categoryStocks.length}件`}>
            {categoryStocks.length}
          </span>
        </h1>
        <button
          type="button"
          className="btn btn-primary btn-icon"
          onClick={() => setEditingStock({ mode: 'add' })}
          aria-label={`${noun}を追加`}
          title={`${noun}を追加`}
        >
          <PlusIcon size={22} />
        </button>
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} label={`${noun}を検索`} />

      {/* 検索結果の件数（読み上げにも対応） */}
      <p className="result-count" aria-live="polite">
        {isSearching ? `${visibleStocks.length} / ${categoryStocks.length} 件` : ''}
      </p>

      {categoryStocks.length === 0 ? (
        <div className="card empty-state">
          <p>まだ{noun}が登録されていません。</p>
          <button type="button" className="btn btn-primary" onClick={() => setEditingStock({ mode: 'add' })}>
            <PlusIcon size={18} />
            <span>最初の{noun}を登録する</span>
          </button>
        </div>
      ) : visibleStocks.length === 0 ? (
        <div className="card empty-state">
          <p>「{searchQuery.trim()}」に一致する{noun}はありません。</p>
        </div>
      ) : (
        <ul className="stock-list">
          {visibleStocks.map((stock) => (
            <StockCard
              key={stock.id}
              stock={stock}
              onEdit={() => setEditingStock({ mode: 'edit', stock })}
              onDelete={() => setDeleteTarget(stock)}
            />
          ))}
        </ul>
      )}

      {editingStock && (
        <StockForm
          mode={editingStock.mode}
          title={editingStock.mode === 'edit' ? `Edit ${singular}` : `Add a ${singular}`}
          initialValues={editingStock.mode === 'edit' ? editingStock.stock : undefined}
          existingStocks={categoryStocks}
          onSubmit={handleSubmit}
          onClose={() => setEditingStock(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message="このデータを削除しますか？"
          detail={`${deleteTarget.english} / ${deleteTarget.japanese}`}
          onConfirm={() => onDelete(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </section>
  )
}
