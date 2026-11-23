/**
 * ランダム出題の単語カード。
 * 上に「問題の欄」、下に「答えの欄」を最初から用意しておき、答えはその欄に出すだけにする。
 * こうすることで、答えを出しても隠しても、問題の位置・カードの大きさ・下のボタンの位置が動かない。
 * カードそのものを押しても、答えの表示・非表示を切り替えられる（紙の単語カードをめくる感覚）。
 *
 * @param {{
 *   question: string,        // 問題文
 *   answer: string,          // 解答
 *   questionLang: string,    // 問題文の言語（読み上げ・書体用）
 *   answerLang: string,
 *   showAnswer: boolean,
 *   categoryLabel: string,   // 単語 / フレーズ（品詞があれば「単語・形容詞」のように）
 *   onToggle: () => void,    // カードを押したとき
 * }} props
 */
export default function QuizCard({ question, answer, questionLang, answerLang, showAnswer, categoryLabel, onToggle }) {
  return (
    <button
      type="button"
      className="quiz-card"
      onClick={onToggle}
      aria-expanded={showAnswer}
      aria-label={showAnswer ? '問題（押すと答えを隠す）' : '問題（押すと答えを表示）'}
    >
      <span className="quiz-badge">{categoryLabel}</span>

      {/* 問題の欄（高さ固定・この中で上下中央） */}
      <span className="quiz-q-area">
        <span className="quiz-question" lang={questionLang}>
          {question}
        </span>
      </span>

      {/* 答えの欄（高さ固定）。答えはここに出すだけなので、問題の位置は動かない */}
      <span className="quiz-a-area" aria-live="polite">
        <span className="quiz-a-label">答え</span>
        {showAnswer && (
          <span className="quiz-answer" lang={answerLang}>
            {answer}
          </span>
        )}
      </span>
    </button>
  )
}
