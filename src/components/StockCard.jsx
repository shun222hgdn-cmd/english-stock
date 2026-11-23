import SpeakButton from './SpeakButton'

/**
 * 一覧の1件分の行。英語を上、日本語訳を下に表示する。行を押すと編集画面が開く。
 * 右端の 🔊 で英語の発音を聞ける。長いフレーズも省略せず折り返して表示する。
 *
 * @param {{
 *   stock: { category: string, english: string, japanese: string, part_of_speech?: string, note?: string },
 *   showCategory?: boolean,   // true のとき 単語 / フレーズ を小さく表示（「すべて」表示用）
 *   onEdit: () => void,
 * }} props
 */
export default function StockCard({ stock, showCategory = false, onEdit }) {
  return (
    <li className="stock-item">
      <button type="button" className="stock-row" onClick={onEdit} aria-label={`「${stock.english}」を編集`}>
        <span className="stock-text">
          <span className="stock-english" lang="en">
            {stock.english}
          </span>
          <span className="stock-japanese" lang="ja">
            {stock.japanese}
            {/* 品詞（設定されていれば）と、「すべて」表示のときの種類 */}
            {stock.part_of_speech && <span className="stock-category">{stock.part_of_speech}</span>}
            {showCategory && (
              <span className="stock-category">{stock.category === 'word' ? '単語' : 'フレーズ'}</span>
            )}
          </span>
          {stock.note && <span className="stock-note">{stock.note}</span>}
        </span>
      </button>
      <SpeakButton text={stock.english} />
    </li>
  )
}
