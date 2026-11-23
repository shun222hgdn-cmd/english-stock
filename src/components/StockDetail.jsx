import { useId } from 'react'
import Modal from './Modal'
import SpeakButton from './SpeakButton'
import { CloseIcon, PencilIcon } from './Icons'

/**
 * 単語・フレーズの詳細（一覧の行を押すと開く）。
 * 英語を大きく、その下に日本語訳・品詞・コメントを省略せずに表示する。
 * 右上の「編集」ボタンから編集画面に進む（いきなり編集画面にならないので、見るだけのときに安心）。
 *
 * @param {{
 *   stock: { category: string, english: string, japanese: string, part_of_speech?: string, note?: string },
 *   onEdit: () => void,
 *   onClose: () => void,
 * }} props
 */
export default function StockDetail({ stock, onEdit, onClose }) {
  const id = useId()
  const categoryLabel = stock.category === 'word' ? '単語' : 'フレーズ'

  return (
    <Modal titleId={`${id}-title`} onRequestClose={onClose} className="modal-form stock-detail">
      <div className="modal-header">
        <p className="detail-kind">
          {categoryLabel}
          {stock.part_of_speech && <span className="detail-pos">{stock.part_of_speech}</span>}
        </p>
        <span className="detail-header-actions">
          <button type="button" className="btn btn-secondary btn-small detail-edit" onClick={onEdit}>
            <PencilIcon size={16} />
            編集
          </button>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="閉じる" title="閉じる（Esc）">
            <CloseIcon size={20} />
          </button>
        </span>
      </div>

      <div className="detail-english-row">
        <h2 id={`${id}-title`} className="detail-english" lang="en">
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
    </Modal>
  )
}
