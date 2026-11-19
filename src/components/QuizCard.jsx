/**
 * ランダム出題の問題カード。問題を中央に大きく表示し、解答は showAnswer が true のときだけ表示する。
 *
 * @param {{
 *   prompt: string,          // 「英語で何と言う？」などの問いかけ
 *   question: string,        // 問題文
 *   answer: string,          // 解答
 *   questionLang: string,    // 問題文の言語（読み上げ・フォント用）
 *   answerLang: string,
 *   showAnswer: boolean,
 *   categoryLabel: string,   // Word / Phrase
 * }} props
 */
export default function QuizCard({
  prompt,
  question,
  answer,
  questionLang,
  answerLang,
  showAnswer,
  categoryLabel,
}) {
  return (
    <section className="card quiz-card" aria-label="問題">
      <span className="quiz-badge">{categoryLabel}</span>
      <p className="quiz-prompt">{prompt}</p>
      <p className="quiz-question" lang={questionLang}>
        {question}
      </p>

      {/* aria-live で、解答が表示されたことをスクリーンリーダーにも伝える */}
      <div className="quiz-answer-area" aria-live="polite">
        {showAnswer && (
          <p className="quiz-answer" lang={answerLang}>
            {answer}
          </p>
        )}
      </div>
    </section>
  )
}
