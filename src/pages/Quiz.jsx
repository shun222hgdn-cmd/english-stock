import { useEffect, useMemo, useState } from 'react'
import QuizCard from '../components/QuizCard'
import Choice from '../components/Choice'
import { QUIZ_CATEGORIES, QUIZ_DIRECTIONS, filterByCategory, getQuestionAndAnswer, pickRandomStock } from '../utils/quiz'
import { loadChoice, saveValue } from '../lib/preferences'
import { stopSpeaking } from '../utils/speech'
import { categoryWithPos } from '../utils/validation'

/**
 * 暗記（ランダム出題）。取得済みの stocks から選ぶので、出題のたびに通信はしない。
 * 出題範囲・出題方向は端末に保存し、次に開いたときも前回の設定で始める。
 *
 * @param {{ stocks: Array<object> }} props
 */
export default function Quiz({ stocks }) {
  const [quizCategory, setQuizCategory] = useState(() =>
    loadChoice('quizCategory', QUIZ_CATEGORIES.map((c) => c.value), 'all'),
  )
  const [quizDirection, setQuizDirection] = useState(() =>
    loadChoice('quizDirection', QUIZ_DIRECTIONS.map((d) => d.value), 'ja-en'),
  )
  const [currentId, setCurrentId] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)

  const candidates = useMemo(() => filterByCategory(stocks, quizCategory), [stocks, quizCategory])
  const current = candidates.find((stock) => stock.id === currentId) ?? null

  /** 直前と同じ問題を避けてランダムに選び、答えを隠す */
  function pickNext(pool = candidates) {
    stopSpeaking()
    setCurrentId(pickRandomStock(pool, currentId)?.id ?? null)
    setShowAnswer(false)
  }

  // 最初や、今の問題が候補から無くなったとき（削除など）は選び直す
  useEffect(() => {
    if (current === null && candidates.length > 0) {
      setCurrentId(pickRandomStock(candidates, currentId).id)
      setShowAnswer(false)
    }
  }, [current, candidates, currentId])

  function changeCategory(category) {
    if (category === quizCategory) return
    setQuizCategory(category)
    saveValue('quizCategory', category)
    pickNext(filterByCategory(stocks, category))
  }

  // 出題方向を変えても同じ問題のまま、問題と答えを入れ替える
  function changeDirection(direction) {
    if (direction === quizDirection) return
    setQuizDirection(direction)
    saveValue('quizDirection', direction)
    setShowAnswer(false)
  }

  const isJaToEn = quizDirection === 'ja-en'
  const toggleAnswer = () => setShowAnswer((value) => !value)

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

      {current && (
        <>
          <QuizCard
            {...getQuestionAndAnswer(current, quizDirection)}
            questionLang={isJaToEn ? 'ja' : 'en'}
            answerLang={isJaToEn ? 'en' : 'ja'}
            english={current.english}
            showAnswer={showAnswer}
            categoryLabel={categoryWithPos(current)}
            onToggle={toggleAnswer}
          />
          <div className="quiz-actions">
            <button type="button" className="btn btn-secondary btn-block btn-large" onClick={toggleAnswer} aria-expanded={showAnswer}>
              {showAnswer ? '答えを隠す' : '答えを見る'}
            </button>
            <button type="button" className="btn btn-primary btn-block btn-large" onClick={() => pickNext()}>
              次の問題
            </button>
          </div>
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
