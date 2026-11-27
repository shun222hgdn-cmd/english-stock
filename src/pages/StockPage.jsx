import { useEffect, useMemo, useState } from 'react'
import SearchBar from '../components/SearchBar'
import StockCard from '../components/StockCard'
import StockForm from '../components/StockForm'
import StockDetail from '../components/StockDetail'
import Choice from '../components/Choice'
import { PlusIcon } from '../components/Icons'
import { SORTS, filterStocks, groupByInitial, sortStocks } from '../utils/search'
import { QUIZ_CATEGORIES, filterByCategory } from '../utils/quiz'
import { loadChoice, saveValue } from '../lib/preferences'

const NOUNS = { all: '単語・フレーズ・例文', word: '単語', phrase: 'フレーズ', sentence: '例文' }

/**
 * 単語帳（単語・フレーズ・例文を1つの画面で管理する）。
 * 上の切り替え（件数つき）で種類を絞り、プルダウンで並べ替え（ABC順・新しい順・古い順・覚えたが上・まだが上）、右下の ＋ で追加。
 * 行を押すと詳細（前へ / 次へで移れる）、詳細の「編集」から編集・削除。
 *
 * @param {{
 *   stocks: Array<object>,                     // 表示中のフォルダのデータ
 *   filter: 'all' | 'word' | 'phrase' | 'sentence', // 表示の切り替え（画面を移動しても覚えておくため親が持つ）
 *   onFilterChange: (filter: string) => void,
 *   onAdd: (input: object) => Promise<void>,
 *   onEdit: (id: string, input: object) => Promise<void>,
 *   onDelete: (id: string) => Promise<void>,
 *   onSetLearned: (id: string, learned: boolean) => Promise<void>,
 * }} props
 */
export default function StockPage({ stocks, filter, onFilterChange, onAdd, onEdit, onDelete, onSetLearned }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState(() => loadChoice('stockSort', SORTS.map((s) => s.value), 'abc'))
  // 開いている画面：詳細（id で持ち、編集後も最新を表示）・登録/編集フォーム
  const [detailId, setDetailId] = useState(null)
  const [form, setForm] = useState(null) // null / { mode: 'add' } / { mode: 'edit', stock }
  const [swipedId, setSwipedId] = useState(null) // 削除ボタンを出している行（一度に1行だけ）

  // 削除ボタンが出ている間に上下へスクロールしたら、ボタンをしまう
  useEffect(() => {
    if (!swipedId) return
    const close = () => setSwipedId(null)
    window.addEventListener('scroll', close, { passive: true, once: true })
    return () => window.removeEventListener('scroll', close)
  }, [swipedId])

  const noun = NOUNS[filter] ?? NOUNS.all
  const detailStock = detailId && stocks.find((stock) => stock.id === detailId)

  const counts = useMemo(() => {
    const result = { all: stocks.length, word: 0, phrase: 0, sentence: 0 }
    for (const stock of stocks) result[stock.category] += 1
    return result
  }, [stocks])
  const filteredStocks = useMemo(() => filterByCategory(stocks, filter), [stocks, filter])
  const visibleStocks = useMemo(
    () => sortStocks(filterStocks(filteredStocks, searchQuery), sort),
    [filteredStocks, searchQuery, sort],
  )

  // 詳細の「前へ / 次へ」：今の一覧（絞り込み・検索・並び順そのまま）の中で隣に移る
  const detailIndex = detailStock ? visibleStocks.findIndex((stock) => stock.id === detailStock.id) : -1
  const moveDetail = (step) => () => setDetailId(visibleStocks[detailIndex + step].id)

  const renderRows = (items) => (
    <ul className="ruled-list">
      {items.map((stock) => (
        <StockCard
          key={stock.id}
          stock={stock}
          showCategory={filter === 'all'}
          onOpen={() => setDetailId(stock.id)}
          onDelete={() => {
            setSwipedId(null)
            onDelete(stock.id).catch(() => window.alert('削除できませんでした。'))
          }}
          swiped={swipedId === stock.id}
          onSwipedChange={(swiped) => setSwipedId(swiped ? stock.id : null)}
        />
      ))}
    </ul>
  )

  return (
    <section className="page">
      <h1 className="page-title">単語帳</h1>

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

      {filteredStocks.length > 0 && (
        <div className="list-tools">
          <p className="list-count" aria-live="polite">
            {searchQuery.trim() ? `${visibleStocks.length} / ${filteredStocks.length} 件` : ''}
          </p>
          <select
            className="sort-select"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value)
              saveValue('stockSort', e.target.value)
            }}
            aria-label="並び順"
          >
            {SORTS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 種類・並び順を変えたら、一覧をふわっと出し直す（key が変わると作り直される） */}
      <div key={`${filter}-${sort}`} className="list-anim">
      {filteredStocks.length > 0 &&
        (visibleStocks.length === 0 ? (
          <p className="empty-state">「{searchQuery.trim()}」に一致する{noun}はありません。</p>
        ) : sort !== 'abc' ? (
          renderRows(visibleStocks)
        ) : (
          // 辞書のように、頭文字（A〜Z）ごとに見出しを付けて並べる
          <div className="index-list">
            {groupByInitial(visibleStocks).map(({ initial, items }) => (
              <section key={initial} className="index-group" aria-label={`${initial} から始まる${noun}`}>
                <h2 className="index-letter" lang="en">
                  {initial}
                </h2>
                {renderRows(items)}
              </section>
            ))}
          </div>
        ))}
      </div>

      {/* 編集画面を開いている間は詳細を隠し、閉じたら詳細に戻る（削除したら消える） */}
      {detailStock && !form && (
        <StockDetail
          stock={detailStock}
          position={detailIndex >= 0 ? { index: detailIndex, total: visibleStocks.length } : undefined}
          onPrev={detailIndex > 0 ? moveDetail(-1) : undefined}
          onNext={detailIndex >= 0 && detailIndex < visibleStocks.length - 1 ? moveDetail(1) : undefined}
          onSetLearned={(learned) => onSetLearned(detailStock.id, learned)}
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
