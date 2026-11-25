import { useRef, useState } from 'react'

/**
 * 指で左右にスワイプしたときの操作（スマホ用。マウスでは反応しない）。
 * - 要素は指についてそのまま動く（その向きの操作が無いときは、少しだけ動いて重く感じる）
 * - 要素の幅の半分以上動かして離したら、その向きの操作をする。半分より手前なら元に戻る
 * - 縦のスクロールはそのまま使えるよう、横の動きが縦より大きいときだけ動かす
 * - スワイプしたときは、そのあとに起きる「タップ」を取り消す（カードを押した扱いにしない）
 *
 * @param {{ onLeft?: () => void, onRight?: () => void }} actions 左へ / 右へスワイプしたとき
 * @returns {{ handlers: object, style?: object }} handlers を要素に付け、style で指について動かす
 */
export function useSwipe({ onLeft, onRight }) {
  const start = useRef(null) // { x, y, width, horizontal }
  const [drag, setDrag] = useState(null) // 指で動かしている間の横のずれ（px）

  const actionFor = (dx) => (dx < 0 ? onLeft : onRight)

  const handlers = {
    onTouchStart(event) {
      const touch = event.touches[0]
      start.current = { x: touch.clientX, y: touch.clientY, width: event.currentTarget.offsetWidth, horizontal: null }
    },
    onTouchMove(event) {
      const s = start.current
      if (!s) return
      const touch = event.touches[0]
      const dx = touch.clientX - s.x
      const dy = touch.clientY - s.y
      // 最初の動きで、横のスワイプか縦のスクロールかを決める
      if (s.horizontal === null && Math.abs(dx) + Math.abs(dy) > 8) s.horizontal = Math.abs(dx) > Math.abs(dy)
      if (!s.horizontal) return
      setDrag(actionFor(dx) ? dx : dx * 0.2)
    },
    onTouchEnd(event) {
      const s = start.current
      start.current = null
      setDrag(null)
      if (!s?.horizontal) return
      const dx = event.changedTouches[0].clientX - s.x
      const action = actionFor(dx)
      if (!action || Math.abs(dx) < s.width / 2) return // 半分より手前なら戻るだけ
      event.preventDefault() // このあとのタップ（クリック）を起こさない
      action()
    },
    onTouchCancel() {
      start.current = null
      setDrag(null)
    },
  }

  // 動かしている間はアニメーションなしで指に合わせ、離したら CSS の transition で戻る
  const style =
    drag === null
      ? undefined
      : {
          transform: `translateX(${drag}px)`,
          transition: 'none',
          opacity: Math.max(0.4, 1 - Math.abs(drag) / (start.current?.width || 400)),
        }

  return { handlers, style }
}
