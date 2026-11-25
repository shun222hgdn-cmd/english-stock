import { useRef, useState } from 'react'

/** これ以上横に動かしたら「スワイプ」とみなす（px） */
const SWIPE_DISTANCE = 50

/**
 * 指で左右にスワイプしたときの操作（スマホ用。マウスでは反応しない）。
 * 縦のスクロールはそのまま使えるよう、横の動きが縦よりはっきり大きいときだけ反応する。
 * 指の動きに合わせて少しだけずらして見せ（offset）、離したら戻す。
 * スワイプしたときは、そのあとに起きる「タップ」を取り消す（カードを押した扱いにしない）。
 *
 * @param {{ onLeft?: () => void, onRight?: () => void }} actions 左へ / 右へスワイプしたとき
 * @returns {{ handlers: object, offset: number }} handlers を要素に付け、offset で少しずらす
 */
export function useSwipe({ onLeft, onRight }) {
  const start = useRef(null)
  const [offset, setOffset] = useState(0)

  const handlers = {
    onTouchStart(event) {
      const touch = event.touches[0]
      start.current = { x: touch.clientX, y: touch.clientY }
    },
    onTouchMove(event) {
      if (!start.current) return
      const touch = event.touches[0]
      const dx = touch.clientX - start.current.x
      const dy = touch.clientY - start.current.y
      // 横向きの動きのときだけ、指に合わせて少しずらす
      if (Math.abs(dx) > Math.abs(dy)) setOffset(Math.max(-60, Math.min(60, dx * 0.35)))
    },
    onTouchEnd(event) {
      if (!start.current) return
      const touch = event.changedTouches[0]
      const dx = touch.clientX - start.current.x
      const dy = touch.clientY - start.current.y
      start.current = null
      setOffset(0)
      if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return
      const action = dx < 0 ? onLeft : onRight
      if (!action) return
      event.preventDefault() // このあとのタップ（クリック）を起こさない
      action()
    },
    onTouchCancel() {
      start.current = null
      setOffset(0)
    },
  }

  return { handlers, offset }
}
