import { useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react'

/**
 * 入力した文字数に合わせて高さが自動で伸び縮みするテキストエリア。
 * 短い単語なら1行、長いフレーズなら複数行になり、スクロールせずに全文が見える。
 * （React 19 では ref を通常の props として受け取れる）
 */
export default function AutoTextarea({ ref, value, ...props }) {
  const innerRef = useRef(null)
  // 親コンポーネントからも focus() などができるように、実際の要素を渡す
  useImperativeHandle(ref, () => innerRef.current, [])

  // 値が変わるたびに高さを内容に合わせる（描画前に行うのでちらつかない）
  useLayoutEffect(() => {
    fitHeight(innerRef.current)
  }, [value])

  // 画面の幅が変わる（スマホの回転など）と折り返し位置が変わるので、高さを合わせ直す
  useEffect(() => {
    const handleResize = () => fitHeight(innerRef.current)
    window.addEventListener('resize', handleResize)
    // モーダルの中では、表示される前だと高さを測れないため、表示後にもう一度合わせる
    const frame = requestAnimationFrame(handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frame)
    }
  }, [])

  return <textarea ref={innerRef} value={value} rows={1} {...props} />
}

/** テキストエリアの高さを、中身の文字がちょうど収まる高さにする */
function fitHeight(el) {
  if (!el) return
  el.style.height = 'auto'
  const border = el.offsetHeight - el.clientHeight
  el.style.height = `${el.scrollHeight + border}px`
}
