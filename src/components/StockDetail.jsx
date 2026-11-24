import { useId } from 'react'
import Modal, { CloseButton } from './Modal'
import SpeakButton from './SpeakButton'
import { PencilIcon } from './Icons'
import { categoryLabel, isLongText } from '../utils/validation'

/**
 * 単語・フレーズ・例文の詳細（一覧の行を押すと開く）。英語を大きく、日本語訳・品詞・コメントを省略せずに表示し、
 * 右上の「編集」から編集画面に進む（いきなり編集画面にならないので、見るだけのときに安心）。
 *
 * @param {{ stock: object, onEdit: () => void, onClose: () => void }} props
 */
export default function StockDetail({ stock, onEdit, onClose }) {
  const titleId = useId()

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
    </Modal>
  )
}
