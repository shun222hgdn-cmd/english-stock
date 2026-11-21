import { useMemo, useState } from 'react'
import SearchBar from '../components/SearchBar'
import StockCard from '../components/StockCard'
import StockForm from '../components/StockForm'
import ConfirmDialog from '../components/ConfirmDialog'
import { PlusIcon } from '../components/Icons'
import { filterStocks, sortByEnglish } from '../utils/search'
import { filterByCategory } from '../utils/quiz'

// 表示の切り替え（All / Words / Phrases）
const FILTERS = [
  { value: 'all', label: 'All', noun: '英単語・フレーズ' },
  { value: 'word', label: 'Words', noun: '英単語' },
  { value: 'phrase', label: 'Phrases', noun: 'フレーズ' },
]

/**
 * ストック画面（英単語とフレーズを1つの画面で管理する）。
 * 上部の切り替えで All / Words / Phrases の表示を変え、＋ボタンでどちらも登録できる。
 *
 * @param {{
 *   stocks: Array<object>,                    // 表示中のフォルダの登録データ
 *   filter: 'all' | 'word' | 'phrase',        // 表示の切り替え（画面を移動しても覚えておくため親が持つ）
 *   onFilterChange: (filter: string) => void,
 *   onAdd: (input: object) => Promise<void>,
 *   onEdit: (id: string, input: object) => Promise<void>,
 *   onDelete: (id: string) => Promise<void>,
 * }} props
 */
export default function StockPage({ stocks, filter, onFilterChange, onAdd, onEdit, onDelete }) {
  const [searchQuery, setSearchQuery] = useState('')
  // 登録・編集フォームの状態（null: 閉じている / { mode: 'add' } / { mode: 'edit', stock }）
  const [editingStock, setEditingStock] = useState(null)
  // 削除確認ダイアログの対象（null: 閉じている）
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { noun } = FILTERS.find((item) => item.value === filter) ?? FILTERS[0]

  // 切り替えで絞り込んだデータ
  const filteredStocks = useMemo(() => filterByCategory(stocks, filter), [stocks, filter])
  // さらに検索で絞り込み、アルファベット順に並べたもの
  const visibleStocks = useMemo(
    () => sortByEnglish(filterStocks(filteredStocks, searchQuery)),
    [filteredStocks, searchQuery],
  )

  const isSearching = searchQuery.trim() !== ''
  // 追加フォームの種類：Words / Phrases 表示中はその種類、All なら英語の内容から自動判定
  const defaultCategory = filter === 'all' ? null : filter

  // フォームの保存処理（種類はフォームで選んだもの）
  async function handleSubmit(values) {
    if (editingStock.mode === 'edit') {
      await onEdit(editingStock.stock.id, values)
    } else {
      await onAdd(values)
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <h1 className="page-title">
          Stock
          <span className="count-badge" aria-label={`${filteredStocks.length}件`}>
            {filteredStocks.length}
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

      {/* 表示の切り替え */}
      <div className="segmented" role="group" aria-label="表示する種類">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`segmented-btn${filter === value ? ' is-active' : ''}`}
            aria-pressed={filter === value}
            onClick={() => onFilterChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} label={`${noun}を検索`} />

      {/* 検索結果の件数（読み上げにも対応） */}
      <p className="result-count" aria-live="polite">
        {isSearching ? `${visibleStocks.length} / ${filteredStocks.length} 件` : ''}
      </p>

      {/* 登録が0件のときは何も表示しない（右上の＋から登録する） */}
      {filteredStocks.length === 0 ? null : visibleStocks.length === 0 ? (
        <div className="card empty-state">
          <p>「{searchQuery.trim()}」に一致する{noun}はありません。</p>
        </div>
      ) : (
        <ul className="stock-list">
          {visibleStocks.map((stock) => (
            <StockCard
              key={stock.id}
              stock={stock}
              // All 表示のときだけ、Word / Phrase の印を付ける
              showCategory={filter === 'all'}
              onEdit={() => setEditingStock({ mode: 'edit', stock })}
              onDelete={() => setDeleteTarget(stock)}
            />
          ))}
        </ul>
      )}

      {editingStock && (
        <StockForm
          mode={editingStock.mode}
          initialValues={editingStock.mode === 'edit' ? editingStock.stock : undefined}
          defaultCategory={defaultCategory}
          existingStocks={stocks}
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
