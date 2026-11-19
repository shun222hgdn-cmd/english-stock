import { ShuffleIcon } from '../components/Icons'

/**
 * ホーム画面。登録件数（実データから計算した値）と、ランダム出題の開始ボタンを表示する。
 * @param {{ wordCount: number, phraseCount: number, onNavigate: (page: string) => void }} props
 */
export default function Home({ wordCount, phraseCount, onNavigate }) {
  return (
    <section className="page">
      <h1 className="hero-title">Make English yours.</h1>

      <div className="stat-grid">
        {/* カードを押すと各ストック画面へ移動する */}
        <button type="button" className="card stat-card" onClick={() => onNavigate('words')}>
          <span className="stat-label">Words</span>
          <span className="stat-value">{wordCount}</span>
          <span className="visually-hidden">件。英単語ストックを開く</span>
        </button>
        <button type="button" className="card stat-card" onClick={() => onNavigate('phrases')}>
          <span className="stat-label">Phrases</span>
          <span className="stat-value">{phraseCount}</span>
          <span className="visually-hidden">件。フレーズストックを開く</span>
        </button>
      </div>

      <button type="button" className="btn btn-primary btn-block btn-large" onClick={() => onNavigate('quiz')}>
        <ShuffleIcon size={20} />
        <span>Start Review</span>
      </button>
    </section>
  )
}
