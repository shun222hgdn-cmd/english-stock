import StockPage from './StockPage'

/** 英単語ストック画面（共通の StockPage をカテゴリー「word」で使う） */
export default function Words(props) {
  return <StockPage category="word" title="Words" singular="Word" noun="英単語" {...props} />
}
