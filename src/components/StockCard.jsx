import { useRef, useState } from 'react'
import SpeakButton from './SpeakButton'
import { TrashIcon } from './Icons'
import { categoryLabel } from '../utils/validation'

const DELETE_WIDTH = 76 // 左にずらしたときに出る削除ボタンの幅

/**
 * 一覧の1件分の行。英語を上、日本語訳を下に表示する。行を押すと詳細が開く。
 * 右端の 🔊 で英語の発音を聞ける。長いフレーズも省略せず折り返して表示する。
 * スマホでは行を左にずらすと、右から削除ボタンが出る（押すと削除。直後に「元に戻す」が出る）。
 *
 * @param {{
 *   stock: { category: string, english: string, japanese: string, part_of_speech?: string, note?: string },
 *   showCategory?: boolean,   // true のとき 単語 / フレーズ / 例文 を小さく表示（「すべて」表示用）
 *   onOpen: () => void,       // 詳細を開く
 *   onDelete: () => void,
 *   swiped: boolean,          // 削除ボタンが出ているか（一度に1行だけ出すため親が持つ）
 *   onSwipedChange: (swiped: boolean) => void,
 * }} props
 */
export default function StockCard({ stock, showCategory = false, onOpen, onDelete, swiped, onSwipedChange }) {
  const start = useRef(null) // { x, y, base, horizontal }
  const moved = useRef(false) // ずらしたあとのタップを取り消す
  const [drag, setDrag] = useState(null) // 指でずらしている間の位置（px）

  const offset = drag ?? (swiped ? -DELETE_WIDTH : 0)

  const handlers = {
    onTouchStart(event) {
      const touch = event.touches[0]
      start.current = { x: touch.clientX, y: touch.clientY, base: swiped ? -DELETE_WIDTH : 0, horizontal: null }
      moved.current = false
    },
    onTouchMove(event) {
      const s = start.current
      if (!s) return
      const touch = event.touches[0]
      const dx = touch.clientX - s.x
      const dy = touch.clientY - s.y
      if (s.horizontal === null && Math.abs(dx) + Math.abs(dy) > 8) s.horizontal = Math.abs(dx) > Math.abs(dy)
      if (!s.horizontal) return
      moved.current = true
      const x = s.base + dx
      // 右へは動かない。ボタンの幅より先は重くする
      setDrag(x > 0 ? 0 : x < -DELETE_WIDTH ? -DELETE_WIDTH + (x + DELETE_WIDTH) * 0.3 : x)
    },
    onTouchEnd() {
      const s = start.current
      start.current = null
      if (!s?.horizontal) return
      onSwipedChange((drag ?? s.base) < -DELETE_WIDTH / 2)
      setDrag(null)
    },
    onTouchCancel() {
      start.current = null
      setDrag(null)
    },
  }

  return (
    <li className="stock-item">
      <button
        type="button"
        className="stock-delete"
        onClick={onDelete}
        aria-label={`「${stock.english}」を削除`}
        tabIndex={swiped ? 0 : -1}
        style={{ width: DELETE_WIDTH }}
      >
        <TrashIcon size={22} />
      </button>
      <div
        className="stock-swipe"
        {...handlers}
        style={{
          transform: offset ? `translateX(${offset}px)` : undefined,
          transition: drag === null ? 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
        }}
      >
        <button
          type="button"
          className="stock-row"
          onClick={() => {
            if (moved.current) return (moved.current = false)
            if (swiped) return onSwipedChange(false) // 出ているときは、押すと閉じる
            onOpen()
          }}
          aria-label={`「${stock.english}」の詳細`}
        >
          <span className="stock-text">
            <span className="stock-english" lang="en">
              {stock.english}
            </span>
            <span className="stock-japanese" lang="ja">
              {stock.japanese}
              {/* 品詞（設定されていれば）と、「すべて」表示のときの種類 */}
              {stock.part_of_speech && <span className="stock-category">{stock.part_of_speech}</span>}
              {showCategory && <span className="stock-category">{categoryLabel(stock.category)}</span>}
              {stock.learned && <span className="stock-learned">覚えた</span>}
            </span>
            {stock.note && <span className="stock-note">{stock.note}</span>}
          </span>
        </button>
        <SpeakButton text={stock.english} />
      </div>
    </li>
  )
}
