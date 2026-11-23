import { ChevronRightIcon } from '../components/Icons'

/**
 * ホーム画面。復習の開始ボタンと、登録件数（実データから計算した値）を表示する。
 * 件数の行を押すと、その種類でストック画面を開く。
 *
 * @param {{ wordCount: number, phraseCount: number, onNavigate: (page: string) => void }} props
 */
export default function Home({ wordCount, phraseCount, onNavigate }) {
  return (
    <section className="page">
      <h1 className="visually-hidden">ホーム</h1>

      <button type="button" className="btn btn-primary btn-block btn-large" onClick={() => onNavigate('quiz')}>
        勉強をはじめる
      </button>

      <p className="section-label">ストック</p>
      <ul className="ruled-list">
        <li>
          <button type="button" className="count-row" onClick={() => onNavigate('words')}>
            <span className="count-row-label">単語</span>
            <span className="count-row-value">{wordCount}</span>
            <ChevronRightIcon size={18} className="count-row-arrow" />
          </button>
        </li>
        <li>
          <button type="button" className="count-row" onClick={() => onNavigate('phrases')}>
            <span className="count-row-label">フレーズ</span>
            <span className="count-row-value">{phraseCount}</span>
            <ChevronRightIcon size={18} className="count-row-arrow" />
          </button>
        </li>
      </ul>
    </section>
  )
}
