import { useEffect, useId } from 'react'
import Modal, { CloseButton } from './Modal'
import SpeakButton from './SpeakButton'
import LearnedButton from './LearnedButton'
import { ChevronRightIcon, PencilIcon } from './Icons'
import { categoryLabel, isLongText } from '../utils/validation'

/**
 * 単語・フレーズ・例文の詳細（一覧の行を押すと開く）。英語を大きく、日本語訳・品詞・コメントを省略せずに表示し、
 * 右上の「編集」から編集画面に進む（いきなり編集画面にならないので、見るだけのときに安心）。
 * 下の「前へ / 次へ」（キーボードの ← →）で、一覧の並び順のまま隣のものに移れる。
 *
 * @param {{
 *   stock: object,
 *   position?: { index: number, total: number }, // 一覧の中での位置（一覧に無いときは省略）
 *   onPrev?: () => void,
 *   onNext?: () => void,
 *   onSetLearned: (learned: boolean) => Promise<void>,
 *   onEdit: () => void,
 *   onClose: () => void,
 * }} props
 */
export default function StockDetail({ stock, position, onPrev, onNext, onSetLearned, onEdit, onClose }) {
  const titleId = useId()

  // キーボードの ← → で前後に移る
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'ArrowLeft' && onPrev) onPrev()
      if (event.key === 'ArrowRight' && onNext) onNext()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onPrev, onNext])

  const header = (
    <div className="modal-header">
      <p className="detail-kind">
        {categoryLabel(stock.category)}
        {stock.part_of_speech && <span className="detail-pos">{stock.part_of_speech}</span>}
      </p>
      <span className="detail-header-actions">
        <button type="button" className="btn btn-secondary btn-small detail-edit" onClick={onEdit}>
          <PencilIcon size={16} />
          編集
        </button>
        <CloseButton onClick={onClose} />
      </span>
    </div>
  )

  return (
    <Modal header={header} labelId={titleId} onClose={onClose} className="modal-form stock-detail">
      <div className="detail-english-row">
        <h2 id={titleId} className={`detail-english${isLongText(stock.english) ? ' is-long' : ''}`} lang="en">
          {stock.english}
        </h2>
        <SpeakButton text={stock.english} />
      </div>

      <p className="detail-japanese" lang="ja">
        {stock.japanese}
      </p>

      {stock.note && (
        <div className="detail-note">
          <p className="detail-note-label">コメント</p>
          <p className="detail-note-text">{stock.note}</p>
        </div>
      )}

      <LearnedButton key={stock.id} className="detail-learned" learned={Boolean(stock.learned)} onChange={onSetLearned} />

      {position && (
        <nav className="detail-nav" aria-label="前後の移動">
          <button type="button" className="btn btn-text detail-nav-btn" onClick={onPrev} disabled={!onPrev}>
            <ChevronRightIcon size={18} className="flip" />
            前へ
          </button>
          <span className="detail-nav-pos">
            {position.index + 1} / {position.total}
          </span>
          <button type="button" className="btn btn-text detail-nav-btn" onClick={onNext} disabled={!onNext}>
            次へ
            <ChevronRightIcon size={18} />
          </button>
        </nav>
      )}
    </Modal>
  )
}
