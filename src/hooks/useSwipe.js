import { useEffect, useRef, useState } from 'react'

const OUT_MS = 180 // 画面の外へ飛んでいく時間
const IN_MS = 260 // 次のカードが入ってくる時間

/**
 * 指で左右にスワイプしたときの操作（スマホ用。マウスでは反応しない）。本物のカードを払う感じを出す。
 * - 動かしている間：要素ごと指について動き、tilt なら少し傾く
 * - 幅の半分以上で離す：その向きへ画面の外まで飛んでいき、操作をしてから、次の中身が反対側から入ってくる
 * - 半分より手前で離す：元の位置へ戻る
 * - その向きの操作が無いときは、少しだけ動いて重く感じる
 * - 縦のスクロールはそのまま（最初の動きが縦ならスワイプにしない）
 * - スワイプしたときは、そのあとの「タップ」を取り消す
 *
 * @param {{ onLeft?: () => void, onRight?: () => void, tilt?: boolean }} options
 * @returns {{ handlers: object, style?: object }}
 */
export function useSwipe({ onLeft, onRight, tilt = false }) {
  const start = useRef(null) // { x, y, width, horizontal }
  const timers = useRef([])
  // x：横のずれ（px） / ms：戻る・飛ぶアニメーションの時間（0 なら指にそのまま）
  const [pos, setPos] = useState(null)

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

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
      if (s.horizontal === null && Math.abs(dx) + Math.abs(dy) > 8) s.horizontal = Math.abs(dx) > Math.abs(dy)
      if (!s.horizontal) return
      setPos({ x: actionFor(dx) ? dx : dx * 0.2, ms: 0 })
    },
    onTouchEnd(event) {
      const s = start.current
      start.current = null
      if (!s?.horizontal) return setPos(null)
      const dx = event.changedTouches[0].clientX - s.x
      const action = actionFor(dx)
      if (!action || Math.abs(dx) < s.width / 2) return setPos({ x: 0, ms: 220 }) // 戻る
      event.preventDefault() // このあとのタップ（クリック）を起こさない
      const dir = Math.sign(dx)
      const away = s.width * 1.3
      setPos({ x: dir * away, ms: OUT_MS }) // 外へ飛んでいく
      later(() => {
        action() // 中身を次（前）のものにする
        setPos({ x: -dir * s.width * 0.6, ms: 0 }) // 反対側に置いて
        requestAnimationFrame(() => requestAnimationFrame(() => setPos({ x: 0, ms: IN_MS }))) // 入ってくる
        later(() => setPos(null), IN_MS + 30)
      }, OUT_MS)
    },
    onTouchCancel() {
      start.current = null
      setPos({ x: 0, ms: 220 })
    },
  }

  const style =
    pos === null
      ? undefined
      : {
          transform: `translateX(${pos.x}px)${tilt ? ` rotate(${Math.max(-8, Math.min(8, pos.x * 0.03))}deg)` : ''}`,
          transition: pos.ms ? `transform ${pos.ms}ms cubic-bezier(0.2, 0.8, 0.2, 1)` : 'none',
        }

  return { handlers, style }
}
