import { useMemo, useState } from 'react'
import SearchBar from '../components/SearchBar'
import StockCard from '../components/StockCard'
import StockForm from '../components/StockForm'
import { filterStocks, groupByInitial, sortByEnglish } from '../utils/search'
import { filterByCategory } from '../utils/quiz'
import { PlusIcon } from '../components/Icons'

// 表示の切り替え（すべて / 単語 / フレーズ）
const FILTERS = [
  { value: 'all', label: 'すべて', noun: '単語・フレーズ' },
  { value: 'word', label: '単語', noun: '単語' },
  { value: 'phrase', label: 'フレーズ', noun: 'フレーズ' },
]

/**
 * 単語帳の画面（単語とフレーズを1つの画面で管理する）。
 * 上部の切り替え（件数つき）で表示する種類を変え、「＋ 追加」でどちらも登録できる。
 * 一覧の行を押すと編集画面が開き、削除もそこから行う。
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

  const { noun } = FILTERS.find((item) => item.value === filter) ?? FILTERS[0]

  // 種類ごとの件数（切り替えのタブに表示する。固定値ではなく実データから計算）
  const counts = useMemo(() => {
    const result = { all: stocks.length, word: 0, phrase: 0 }
    for (const stock of stocks) result[stock.category] += 1
    return result
  }, [stocks])

  // 切り替えで絞り込んだデータ
  const filteredStocks = useMemo(() => filterByCategory(stocks, filter), [stocks, filter])
  // さらに検索で絞り込み、アルファベット順に並べたもの
  const visibleStocks = useMemo(
    () => sortByEnglish(filterStocks(filteredStocks, searchQuery)),
    [filteredStocks, searchQuery],
  )

  const isSearching = searchQuery.trim() !== ''
  // 追加フォームの種類：単語 / フレーズ 表示中はその種類、すべてなら英語の内容から自動判定
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
      <h1 className="page-title">単語帳</h1>

      {/* 追加ボタン：右下に大きく（親指で押しやすい位置） */}
      <button
        type="button"
        className="fab"
        onClick={() => setEditingStock({ mode: 'add' })}
        aria-label={`${noun}を追加`}
        title="追加"
      >
        <PlusIcon size={28} />
      </button>

      {/* 表示の切り替え */}
      <div className="segmented" role="group" aria-label="表示する種類">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`segmented-btn${filter === value ? ' is-active' : ''}`}
            aria-pressed={filter === value}
            onClick={() => onFilterChange(value)}
            aria-label={`${label} ${counts[value]}件`}
          >
            {label}
            <span className="segmented-count">{counts[value]}</span>
          </button>
        ))}
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} label={`${noun}を検索`} />

      {/* 検索結果の件数（読み上げにも対応） */}
      <p className="result-count" aria-live="polite">
        {isSearching ? `${visibleStocks.length} / ${filteredStocks.length} 件` : ''}
      </p>

      {/* 登録が0件のときは何も表示しない（右上の「＋ 追加」から登録する） */}
      {filteredStocks.length === 0 ? null : visibleStocks.length === 0 ? (
        <p className="empty-state">「{searchQuery.trim()}」に一致する{noun}はありません。</p>
      ) : (
        // 辞書のように、頭文字（A〜Z）ごとに見出しを付けて並べる
        <div className="index-list">
          {groupByInitial(visibleStocks).map(({ initial, items }) => (
            <section key={initial} className="index-group" aria-label={`${initial} から始まる${noun}`}>
              <h2 className="index-letter" lang="en">
                {initial}
              </h2>
              <ul className="ruled-list">
                {items.map((stock) => (
                  <StockCard
                    key={stock.id}
                    stock={stock}
                    // 「すべて」表示のときだけ、単語 / フレーズ の印を付ける
                    showCategory={filter === 'all'}
                    onEdit={() => setEditingStock({ mode: 'edit', stock })}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editingStock && (
        <StockForm
          mode={editingStock.mode}
          initialValues={editingStock.mode === 'edit' ? editingStock.stock : undefined}
          defaultCategory={defaultCategory}
          existingStocks={stocks}
          onSubmit={handleSubmit}
          onDelete={editingStock.mode === 'edit' ? () => onDelete(editingStock.stock.id) : undefined}
          onClose={() => setEditingStock(null)}
        />
      )}
    </section>
  )
}
