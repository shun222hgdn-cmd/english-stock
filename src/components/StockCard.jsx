import { PencilIcon, TrashIcon } from './Icons'

/**
 * 一覧の1件分のカード。英語を大きく、日本語訳を小さく表示する。
 * 長いフレーズも省略せず折り返して表示する。
 *
 * @param {{
 *   stock: { category: string, english: string, japanese: string },
 *   showCategory?: boolean,   // true のとき Word / Phrase の印を表示（All 表示用）
 *   onEdit: () => void,
 *   onDelete: () => void,
 * }} props
 */
export default function StockCard({ stock, showCategory = false, onEdit, onDelete }) {
  return (
    <li className="card stock-card">
      <div className="stock-text">
        <p className="stock-english" lang="en">
          {stock.english}
        </p>
        <p className="stock-japanese" lang="ja">
          {showCategory && (
            <span className="stock-category">{stock.category === 'word' ? 'Word' : 'Phrase'}</span>
          )}
          {stock.japanese}
        </p>
      </div>
      <div className="stock-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={onEdit}
          aria-label={`「${stock.english}」を編集`}
          title="編集"
        >
          <PencilIcon size={18} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn-danger"
          onClick={onDelete}
          aria-label={`「${stock.english}」を削除`}
          title="削除"
        >
          <TrashIcon size={18} />
        </button>
      </div>
    </li>
  )
}
