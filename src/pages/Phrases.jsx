import StockPage from './StockPage'

/** フレーズストック画面（共通の StockPage をカテゴリー「phrase」で使う） */
export default function Phrases(props) {
  return <StockPage category="phrase" title="Phrases" singular="Phrase" noun="フレーズ" {...props} />
}
