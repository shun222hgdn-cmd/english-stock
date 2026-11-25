import { useEffect, useMemo, useState } from 'react'
import QuizCard from '../components/QuizCard'
import Choice from '../components/Choice'
import LearnedButton from '../components/LearnedButton'
import { QUIZ_CATEGORIES, QUIZ_DIRECTIONS, filterByCategory, getQuestionAndAnswer, pickRandomStock } from '../utils/quiz'
import { loadChoice, saveValue } from '../lib/preferences'
import { loadAutoSpeak, saveAutoSpeak, speakEnglish, stopSpeaking } from '../utils/speech'
import { categoryLabel } from '../utils/validation'

/**
 * 暗記（ランダム出題）。取得済みの stocks から選ぶので、出題のたびに通信はしない。
 * 「覚えた」を付けたものは出にくくなる。答えはカードを押すと出る。「前の問題」で、さっきの問題に戻れる。
 * 出題範囲・出題方向は端末に保存し、次も前回の設定で始める。
 *
 * @param {{ stocks: Array<object>, onSetLearned: (id: string, learned: boolean) => Promise<void> }} props
 */
export default function Quiz({ stocks, onSetLearned }) {
  const [quizCategory, setQuizCategory] = useState(() =>
    loadChoice('quizCategory', QUIZ_CATEGORIES.map((c) => c.value), 'all'),
  )
  const [quizDirection, setQuizDirection] = useState(() =>
    loadChoice('quizDirection', QUIZ_DIRECTIONS.map((d) => d.value), 'ja-en'),
  )
  const [currentId, setCurrentId] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [history, setHistory] = useState([]) // これまでに出した問題の id（「前の問題」で戻る用）
  const [autoSpeak, setAutoSpeak] = useState(loadAutoSpeak) // 英語が出たら自動で読むか

  const candidates = useMemo(() => filterByCategory(stocks, quizCategory), [stocks, quizCategory])
  const current = candidates.find((stock) => stock.id === currentId) ?? null
  const learnedCount = candidates.filter((stock) => stock.learned).length
  // 戻れる問題（削除されたものや、今の出題範囲に無いものは飛ばす）
  const previousIds = history.filter((id) => candidates.some((stock) => stock.id === id))

  /**
   * 問題を表示したときの自動読み上げ。英語が問題のとき（EN → JP）だけ読む。
   * スマホでは押した操作の中で読み上げないと鳴らないことがあるので、ボタンの処理から直接呼ぶ。
   */
  function speakQuestion(stock, direction = quizDirection, on = autoSpeak) {
    stopSpeaking()
    if (on && stock && direction === 'en-ja') speakEnglish(stock.english)
  }

  /** 直前と同じ問題を避けてランダムに選び、答えを隠す */
  function pickNext(pool = candidates) {
    if (current) setHistory((list) => [...list, current.id].slice(-50))
    const next = pickRandomStock(pool, currentId)
    setCurrentId(next?.id ?? null)
    setShowAnswer(false)
    speakQuestion(next)
  }

  /** 前の問題に戻る（答えは隠した状態で） */
  function goBack() {
    const previousId = previousIds[previousIds.length - 1]
    setHistory(previousIds.slice(0, -1))
    setCurrentId(previousId)
    setShowAnswer(false)
    speakQuestion(candidates.find((stock) => stock.id === previousId))
  }

  /** 答えを開く・隠す。英語が答えのとき（JP → EN）は、開いたときに読む */
  function toggleAnswer() {
    const opening = !showAnswer
    setShowAnswer(opening)
    stopSpeaking()
    if (opening && autoSpeak && current && quizDirection === 'ja-en') speakEnglish(current.english)
  }

  /** 🔊：自動読み上げのオン / オフ。オンにしたら、今読める英語をすぐ読む */
  function toggleAutoSpeak() {
    const on = !autoSpeak
    setAutoSpeak(on)
    saveAutoSpeak(on)
    if (!on) return stopSpeaking()
    if (quizDirection === 'en-ja' || showAnswer) speakEnglish(current.english)
  }

  // 最初や、今の問題が候補から無くなったとき（削除など）は選び直す
  useEffect(() => {
    if (current === null && candidates.length > 0) {
      const first = pickRandomStock(candidates, currentId)
      setCurrentId(first.id)
      setShowAnswer(false)
      if (quizDirection === 'en-ja' && loadAutoSpeak()) speakEnglish(first.english)
    }
  }, [current, candidates, currentId, quizDirection])

  function changeCategory(category) {
    if (category === quizCategory) return
    setQuizCategory(category)
    saveValue('quizCategory', category)
    pickNext(filterByCategory(stocks, category))
    setHistory([]) // 範囲を変えたら、戻る先はリセット
  }

  // 出題方向を変えても同じ問題のまま、問題と答えを入れ替える
  function changeDirection(direction) {
    if (direction === quizDirection) return
    setQuizDirection(direction)
    saveValue('quizDirection', direction)
    setShowAnswer(false)
    speakQuestion(current, direction)
  }

  const isJaToEn = quizDirection === 'ja-en'

  return (
    <section className="page">
      <div className="page-header">
        <h1 className="page-title">暗記</h1>
        <Choice
          variant="lang-switch"
          label="出題方向"
          options={QUIZ_DIRECTIONS.map(({ value, label, description }) => ({ value, label, title: description }))}
          value={quizDirection}
          onChange={changeDirection}
        />
      </div>

      <Choice label="出題範囲" options={QUIZ_CATEGORIES} value={quizCategory} onChange={changeCategory} />

      {candidates.length === 0 && (
        <p className="empty-state">
          まだ{quizCategory === 'all' ? '単語・フレーズ・例文' : categoryLabel(quizCategory)}がありません。
          <br />
          単語帳の ＋ から追加すると、ここで出題されます。
        </p>
      )}

      {current && (
        <>
          <p className="quiz-progress">
            覚えた {learnedCount} / {candidates.length}
          </p>
          <QuizCard
            {...getQuestionAndAnswer(current, quizDirection)}
            questionLang={isJaToEn ? 'ja' : 'en'}
            answerLang={isJaToEn ? 'en' : 'ja'}
            autoSpeak={autoSpeak}
            onToggleAutoSpeak={toggleAutoSpeak}
            showAnswer={showAnswer}
            categoryLabel={categoryLabel(current.category)}
            partOfSpeech={current.category === 'word' ? current.part_of_speech : null}
            // カードを押す：1回目で答え、もう1回で次の問題（押すだけでどんどん進める）
            onToggle={showAnswer ? () => pickNext() : toggleAnswer}
          />
          <div className="quiz-actions">
            <button
              type="button"
              className="btn btn-secondary btn-block btn-large"
              onClick={goBack}
              disabled={previousIds.length === 0}
            >
              前の問題
            </button>
            <button type="button" className="btn btn-primary btn-block btn-large" onClick={() => pickNext()}>
              次の問題
            </button>
          </div>
          {/* key：問題が変わったら、前の問題のエラー表示などを持ち越さない */}
          <LearnedButton
            key={current.id}
            className="quiz-learned"
            learned={Boolean(current.learned)}
            onChange={(learned) => onSetLearned(current.id, learned)}
          />
          {/* コメント：答えを開いているときだけ、ボタンの下に出す（上の位置は動かない） */}
          {showAnswer && current.note && (
            <section className="quiz-comment" aria-label="コメント">
              <p className="quiz-comment-label">コメント</p>
              <p className="quiz-comment-text">{current.note}</p>
            </section>
          )}
          {candidates.length === 1 && <p className="muted center-text">登録が1件のため、同じ問題を出題しています。</p>}
        </>
      )}
    </section>
  )
}
