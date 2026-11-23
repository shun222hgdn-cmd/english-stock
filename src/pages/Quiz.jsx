import { useEffect, useMemo, useState } from 'react'
import QuizCard from '../components/QuizCard'
import {
  QUIZ_CATEGORIES,
  QUIZ_DIRECTIONS,
  filterByCategory,
  getQuestionAndAnswer,
  pickRandomStock,
} from '../utils/quiz'
import { loadChoice, saveChoice } from '../lib/preferences'
import { stopSpeaking } from '../utils/speech'

// 出題範囲・出題方向として許可する値（保存された設定の確認用）
const CATEGORY_VALUES = QUIZ_CATEGORIES.map((item) => item.value)
const DIRECTION_VALUES = QUIZ_DIRECTIONS.map((item) => item.value)

/**
 * ランダム出題画面。
 * 出題のたびにデータベースへ問い合わせず、取得済みの stocks から JavaScript で選ぶ。
 * 出題範囲・出題方向は端末に保存し、画面を移動したり開き直したりしても前回の設定で始める。
 *
 * @param {{ stocks: Array<object> }} props
 */
export default function Quiz({ stocks }) {
  // 出題範囲（前回の設定。初めては「すべて」）
  const [quizCategory, setQuizCategory] = useState(() => loadChoice('quizCategory', CATEGORY_VALUES, 'all'))
  // 出題方向（前回の設定。初めては「日本語 → 英語」）
  const [quizDirection, setQuizDirection] = useState(() =>
    loadChoice('quizDirection', DIRECTION_VALUES, 'ja-en'),
  )
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
    stopSpeaking()
    const next = pickRandomStock(candidates, currentId)
    setCurrentId(next ? next.id : null)
    setShowAnswer(false)
  }

  // 出題範囲の変更：変更後の範囲からランダムに選び直す
  function handleCategoryChange(category) {
    if (category === quizCategory) return
    setQuizCategory(category)
    saveChoice('quizCategory', category)
    const next = pickRandomStock(filterByCategory(stocks, category), currentId)
    setCurrentId(next ? next.id : null)
    setShowAnswer(false)
  }

  // 出題方向の変更：同じ問題のまま問題面と解答面を入れ替え、解答を隠す
  function handleDirectionChange(direction) {
    if (direction === quizDirection) return
    setQuizDirection(direction)
    saveChoice('quizDirection', direction)
    setShowAnswer(false)
  }

  const isJaToEn = quizDirection === 'ja-en'
  // 出題方向に応じた「問題」と「答え」
  const qa = currentQuestion ? getQuestionAndAnswer(currentQuestion, quizDirection) : null

  return (
    <section className="page">
      <div className="page-header">
        <h1 className="page-title">暗記</h1>

        {/* 出題方向：JP → EN（日本語を見て英語を答える）/ EN → JP。選んでいる方が濃く表示される */}
        <div className="lang-switch" role="group" aria-label="出題方向">
          {QUIZ_DIRECTIONS.map(({ value, label, description }) => (
            <button
              key={value}
              type="button"
              className={`lang-switch-btn${quizDirection === value ? ' is-active' : ''}`}
              aria-pressed={quizDirection === value}
              title={description}
              onClick={() => handleDirectionChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

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

      {/* 出題範囲に登録が0件のときは、問題カードを表示しない */}
      {qa ? (
        <>
          <QuizCard
            question={qa.question}
            answer={qa.answer}
            questionLang={isJaToEn ? 'ja' : 'en'}
            answerLang={isJaToEn ? 'en' : 'ja'}
            english={currentQuestion.english}
            showAnswer={showAnswer}
            categoryLabel={
              currentQuestion.category === 'word'
                ? ['単語', currentQuestion.part_of_speech].filter(Boolean).join('・')
                : 'フレーズ'
            }
            onToggle={() => setShowAnswer((value) => !value)}
          />
          <div className="quiz-actions">
            <button
              type="button"
              className="btn btn-secondary btn-block btn-large"
              onClick={() => setShowAnswer((value) => !value)}
              aria-expanded={showAnswer}
            >
              {showAnswer ? '答えを隠す' : '答えを見る'}
            </button>
            <button type="button" className="btn btn-primary btn-block btn-large" onClick={handleNext}>
              次の問題
            </button>
          </div>
          {/* コメント：答えを開いているときだけ、ボタンの下の空いているところに出す（上の位置は動かない） */}
          {showAnswer && currentQuestion.note && (
            <section className="quiz-comment" aria-label="コメント">
              <p className="quiz-comment-label">コメント</p>
              <p className="quiz-comment-text">{currentQuestion.note}</p>
            </section>
          )}
          {candidates.length === 1 && (
            <p className="muted center-text">登録が1件のため、同じ問題を出題しています。</p>
          )}
        </>
      ) : null}
    </section>
  )
}
