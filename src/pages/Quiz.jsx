import { useEffect, useMemo, useState } from 'react'
import QuizCard from '../components/QuizCard'
import {
  QUIZ_CATEGORIES,
  QUIZ_DIRECTIONS,
  filterByCategory,
  getQuestionAndAnswer,
  pickRandomStock,
} from '../utils/quiz'

/**
 * ランダム出題画面。
 * 出題のたびにデータベースへ問い合わせず、取得済みの stocks から JavaScript で選ぶ。
 *
 * @param {{ stocks: Array<object> }} props
 */
export default function Quiz({ stocks }) {
  const [quizCategory, setQuizCategory] = useState('all') // 出題範囲（初期値：すべて）
  const [quizDirection, setQuizDirection] = useState('ja-en') // 出題方向（初期値：日本語 → 英語）
  const [currentId, setCurrentId] = useState(null) // 現在の問題のID
  const [showAnswer, setShowAnswer] = useState(false) // 解答を表示しているか

  // 出題範囲で絞り込んだ候補
  const candidates = useMemo(() => filterByCategory(stocks, quizCategory), [stocks, quizCategory])
  const currentQuestion = candidates.find((stock) => stock.id === currentId) ?? null

  // 初回表示時や、現在の問題が候補から無くなったとき（データ削除など）は、ランダムに選び直す
  useEffect(() => {
    if (currentQuestion === null && candidates.length > 0) {
      setCurrentId(pickRandomStock(candidates, currentId).id)
      setShowAnswer(false)
    }
  }, [currentQuestion, candidates, currentId])

  // 次の問題：直前と同じ問題を避けてランダムに選び、解答を隠す
  function handleNext() {
    const next = pickRandomStock(candidates, currentId)
    setCurrentId(next ? next.id : null)
    setShowAnswer(false)
  }

  // 出題範囲の変更：変更後の範囲からランダムに選び直す
  function handleCategoryChange(category) {
    if (category === quizCategory) return
    setQuizCategory(category)
    const next = pickRandomStock(filterByCategory(stocks, category), currentId)
    setCurrentId(next ? next.id : null)
    setShowAnswer(false)
  }

  // 出題方向の変更：同じ問題のまま問題面と解答面を入れ替え、解答を隠す
  function handleDirectionChange(direction) {
    if (direction === quizDirection) return
    setQuizDirection(direction)
    setShowAnswer(false)
  }

  const isJaToEn = quizDirection === 'ja-en'
  // 出題方向に応じた「問題」と「答え」
  const qa = currentQuestion ? getQuestionAndAnswer(currentQuestion, quizDirection) : null

  return (
    <section className="page">
      <h1 className="page-title">Review</h1>

      {/* 出題範囲 */}
      <div className="segmented" role="group" aria-label="出題範囲">
        {QUIZ_CATEGORIES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`segmented-btn${quizCategory === value ? ' is-active' : ''}`}
            aria-pressed={quizCategory === value}
            onClick={() => handleCategoryChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 出題方向 */}
      <div className="segmented segmented-sub" role="group" aria-label="出題方向">
        {QUIZ_DIRECTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`segmented-btn${quizDirection === value ? ' is-active' : ''}`}
            aria-pressed={quizDirection === value}
            onClick={() => handleDirectionChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 出題範囲に登録が0件のときは、問題カードを表示しない */}
      {qa ? (
        <>
          <QuizCard
            question={qa.question}
            answer={qa.answer}
            questionLang={isJaToEn ? 'ja' : 'en'}
            answerLang={isJaToEn ? 'en' : 'ja'}
            showAnswer={showAnswer}
            categoryLabel={currentQuestion.category === 'word' ? 'Word' : 'Phrase'}
          />
          <div className="quiz-actions">
            <button
              type="button"
              className="btn btn-secondary btn-block btn-large"
              onClick={() => setShowAnswer((value) => !value)}
              aria-expanded={showAnswer}
            >
              {showAnswer ? 'Hide Answer' : 'Show Answer'}
            </button>
            <button type="button" className="btn btn-primary btn-block btn-large" onClick={handleNext}>
              Next Question
            </button>
          </div>
          {candidates.length === 1 && (
            <p className="muted center-text">登録が1件のため、同じ問題を出題しています。</p>
          )}
        </>
      ) : null}
    </section>
  )
}
