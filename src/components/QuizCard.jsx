/**
 * ランダム出題の単語カード。問題を中央に大きく表示し、解答は showAnswer が true のときだけ表示する。
 * カードそのものを押しても、答えの表示・非表示を切り替えられる（紙の単語カードをめくる感覚）。
 *
 * @param {{
 *   question: string,        // 問題文
 *   answer: string,          // 解答
 *   questionLang: string,    // 問題文の言語（読み上げ・書体用）
 *   answerLang: string,
 *   showAnswer: boolean,
 *   categoryLabel: string,   // 単語 / フレーズ（品詞があれば「単語・形容詞」のように）
 *   note?: string | null,    // コメント（答えを開いたときに表示）
 *   onToggle: () => void,    // カードを押したとき
 * }} props
 */
export default function QuizCard({
  question,
  answer,
  questionLang,
  answerLang,
  showAnswer,
  categoryLabel,
  note,
  onToggle,
}) {
  return (
    <button
      type="button"
      className="quiz-card"
      onClick={onToggle}
      aria-expanded={showAnswer}
      aria-label={showAnswer ? '問題（押すと答えを隠す）' : '問題（押すと答えを表示）'}
    >
      <span className="quiz-badge">{categoryLabel}</span>
      <span className="quiz-question" lang={questionLang}>
        {question}
      </span>

      {/* aria-live で、解答が表示されたことをスクリーンリーダーにも伝える */}
      <span className="quiz-answer-area" aria-live="polite">
        {showAnswer ? (
          <>
            <span className="quiz-answer" lang={answerLang}>
              {answer}
            </span>
            {note && <span className="quiz-note">{note}</span>}
          </>
        ) : (
          <span className="quiz-tap-hint">タップで答え</span>
        )}
      </span>
    </button>
  )
}
