import { useMemo, useState } from 'react'
import SearchBar from '../components/SearchBar'
import StockCard from '../components/StockCard'
import StockForm from '../components/StockForm'
import StockDetail from '../components/StockDetail'
import BulkImportDialog from '../components/BulkImportDialog'
import Choice from '../components/Choice'
import { PlusIcon } from '../components/Icons'
import { filterStocks, groupByInitial, sortByEnglish } from '../utils/search'
import { QUIZ_CATEGORIES, filterByCategory } from '../utils/quiz'

const NOUNS = { all: '単語・フレーズ・例文', word: '単語', phrase: 'フレーズ', sentence: '例文' }

/**
 * 単語帳（単語・フレーズ・例文を1つの画面で管理する）。
 * 上の切り替え（件数つき）で種類を絞り、右下の ＋ で追加。行を押すと詳細、詳細の「編集」から編集・削除。
 *
 * @param {{
 *   stocks: Array<object>,                     // 表示中のフォルダのデータ
 *   filter: 'all' | 'word' | 'phrase' | 'sentence',       // 表示の切り替え（画面を移動しても覚えておくため親が持つ）
 *   onFilterChange: (filter: string) => void,
 *   onAdd: (input: object) => Promise<void>,
 *   onEdit: (id: string, input: object) => Promise<void>,
 *   onDelete: (id: string) => Promise<void>,
 *   onAddMany: (items: Array<object>) => Promise<number>, // 追加した件数を返す
 *   folderName: string,
 * }} props
 */
export default function StockPage({ stocks, filter, onFilterChange, onAdd, onEdit, onDelete, onAddMany, folderName }) {
  const [searchQuery, setSearchQuery] = useState('')
  // 開いている画面：詳細（id で持ち、編集後も最新を表示）・登録/編集フォーム・まとめて追加
  const [detailId, setDetailId] = useState(null)
  const [form, setForm] = useState(null) // null / { mode: 'add' } / { mode: 'edit', stock }
  const [bulkOpen, setBulkOpen] = useState(false)

  const noun = NOUNS[filter] ?? NOUNS.all
  const detailStock = detailId && stocks.find((stock) => stock.id === detailId)

  const counts = useMemo(() => {
    const result = { all: stocks.length, word: 0, phrase: 0, sentence: 0 }
    for (const stock of stocks) result[stock.category] += 1
    return result
  }, [stocks])
  const filteredStocks = useMemo(() => filterByCategory(stocks, filter), [stocks, filter])
  const visibleStocks = useMemo(() => sortByEnglish(filterStocks(filteredStocks, searchQuery)), [filteredStocks, searchQuery])

  return (
    <section className="page">
      <div className="page-header">
        <h1 className="page-title">単語帳</h1>
        <button type="button" className="btn btn-text" onClick={() => setBulkOpen(true)}>
          まとめて追加
        </button>
      </div>

      {/* 追加ボタン：右下に大きく（親指で押しやすい位置） */}
      <button type="button" className="fab" onClick={() => setForm({ mode: 'add' })} aria-label={`${noun}を追加`} title="追加">
        <PlusIcon size={28} />
      </button>

      <Choice
        label="表示する種類"
        options={QUIZ_CATEGORIES.map((option) => ({ ...option, count: counts[option.value] }))}
        value={filter}
        onChange={onFilterChange}
      />

      <SearchBar value={searchQuery} onChange={setSearchQuery} label={`${noun}を検索`} />

      <p className="result-count" aria-live="polite">
        {searchQuery.trim() ? `${visibleStocks.length} / ${filteredStocks.length} 件` : ''}
      </p>

      {filteredStocks.length > 0 &&
        (visibleStocks.length === 0 ? (
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
                    <StockCard key={stock.id} stock={stock} showCategory={filter === 'all'} onOpen={() => setDetailId(stock.id)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ))}

      {bulkOpen && (
        <BulkImportDialog folderName={folderName} existingStocks={stocks} onImport={onAddMany} onClose={() => setBulkOpen(false)} />
      )}

      {/* 編集画面を開いている間は詳細を隠し、閉じたら詳細に戻る（削除したら消える） */}
      {detailStock && !form && (
        <StockDetail
          stock={detailStock}
          onEdit={() => setForm({ mode: 'edit', stock: detailStock })}
          onClose={() => setDetailId(null)}
        />
      )}

      {form && (
        <StockForm
          mode={form.mode}
          initialValues={form.stock}
          // 追加時の種類：単語 / フレーズ / 例文 表示中はその種類、「すべて」なら英語の内容から自動判定
          defaultCategory={filter === 'all' ? null : filter}
          existingStocks={stocks}
          onSubmit={(values) => (form.stock ? onEdit(form.stock.id, values) : onAdd(values))}
          onDelete={form.stock && (() => onDelete(form.stock.id))}
          onClose={() => setForm(null)}
        />
      )}
    </section>
  )
}
