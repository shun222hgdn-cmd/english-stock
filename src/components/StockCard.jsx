import { ChevronRightIcon } from './Icons'

/**
 * 一覧の1件分の行。英語を上、日本語訳を下に表示する。行全体を押すと編集画面が開く。
 * 長いフレーズも省略せず折り返して表示する。
 *
 * @param {{
 *   stock: { category: string, english: string, japanese: string },
 *   showCategory?: boolean,   // true のとき 単語 / フレーズ を小さく表示（「すべて」表示用）
 *   onEdit: () => void,
 * }} props
 */
export default function StockCard({ stock, showCategory = false, onEdit }) {
  return (
    <li>
      <button type="button" className="stock-row" onClick={onEdit} aria-label={`「${stock.english}」を編集`}>
        <span className="stock-text">
          <span className="stock-english" lang="en">
            {stock.english}
          </span>
          <span className="stock-japanese" lang="ja">
            {stock.japanese}
            {showCategory && (
              <span className="stock-category">{stock.category === 'word' ? '単語' : 'フレーズ'}</span>
            )}
          </span>
        </span>
        <ChevronRightIcon size={18} className="stock-row-arrow" />
      </button>
    </li>
  )
}
