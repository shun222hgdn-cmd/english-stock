import { SpeakerIcon, SpeakerOffIcon } from './Icons'
import { isSpeechSupported } from '../utils/speech'
import { POS_SHORT, isLongText } from '../utils/validation'
import { useSwipe } from '../hooks/useSwipe'

/**
 * ランダム出題の単語カード。
 * 上に「問題の欄」、下に「答えの欄」を最初から用意しておき、答えはその欄に出すだけにする。
 * こうすることで、答えを出しても隠しても、問題の位置・カードの大きさ・下のボタンの位置が動かない。
 * カードを押すと答えが出て、もう一度押すと次の問題に進む（押すだけでどんどん進める）。
 *
 * カードの右上の 🔊 は「自動読み上げ」のオン / オフ。オンのときは、英語が出たら自動で読む
 * （英語 → 日本語 は問題が出たとき、日本語 → 英語 は答えを開いたとき。先に答えが聞こえないように）。
 *
 * @param {{
 *   question: string,        // 問題文
 *   answer: string,          // 解答
 *   questionLang: string,    // 問題文の言語（読み上げ・書体用）
 *   answerLang: string,
 *   autoSpeak: boolean,      // 自動読み上げがオンか
 *   onToggleAutoSpeak: () => void,
 *   showAnswer: boolean,
 *   categoryLabel: string,   // 左上の小さな種類（単語 / フレーズ / 例文）
 *   partOfSpeech?: string,   // 品詞（単語のときだけ）。問題の少し左に1文字の略（形・動など）で出す
 *   onToggle: () => void,    // カードを押したとき（答えを出す → 次の問題へ）
 *   onSwipeLeft?: () => void,  // スマホで左へスワイプ（次の問題）
 *   onSwipeRight?: () => void, // スマホで右へスワイプ（前の問題）
 * }} props
 */
export default function QuizCard({
  question,
  answer,
  questionLang,
  answerLang,
  autoSpeak,
  onToggleAutoSpeak,
  showAnswer,
  categoryLabel,
  partOfSpeech,
  onToggle,
  onSwipeLeft,
  onSwipeRight,
}) {
  const swipe = useSwipe({ onLeft: onSwipeLeft, onRight: onSwipeRight })

  return (
    <div
      className="quiz-card-wrap"
      {...swipe.handlers}
      style={swipe.style}
    >
      <button
        type="button"
        className="quiz-card"
        onClick={onToggle}
        aria-expanded={showAnswer}
        aria-label={showAnswer ? '問題（押すと次の問題へ）' : '問題（押すと答えを表示）'}
      >
        <span className="quiz-badge">{categoryLabel}</span>

        {/* 問題の欄（高さ固定・この中で上下中央） */}
        <span className="quiz-q-area">
          {/* 問題は真ん中のまま、品詞の印はそのすぐ左（少しあけて）に添える */}
          <span key={question} className="quiz-question-wrap">
            {partOfSpeech && (
              <span className="quiz-pos" title={partOfSpeech} aria-label={partOfSpeech}>
                {POS_SHORT[partOfSpeech] ?? partOfSpeech}
              </span>
            )}
            <span className={`quiz-question${isLongText(question) ? ' is-long' : ''}`} lang={questionLang}>
              {question}
            </span>
          </span>
        </span>

        {/* 答えの欄（高さ固定）。答えはここに出すだけなので、問題の位置は動かない */}
        <span className="quiz-a-area" aria-live="polite">
          <span className="quiz-a-label">答え</span>
          {showAnswer && (
            <span className={`quiz-answer${isLongText(answer) ? ' is-long' : ''}`} lang={answerLang}>
              {answer}
            </span>
          )}
        </span>
      </button>

      {/* 自動読み上げのオン / オフ（カードの外の要素として右上に重ねる。ボタンの中にボタンを入れないため） */}
      {isSpeechSupported() && (
        <button
          type="button"
          className={`icon-btn quiz-speak${autoSpeak ? '' : ' is-off'}`}
          onClick={onToggleAutoSpeak}
          aria-pressed={autoSpeak}
          aria-label={autoSpeak ? '自動読み上げ：オン（押すとオフ）' : '自動読み上げ：オフ（押すとオン）'}
          title={autoSpeak ? '自動読み上げ：オン' : '自動読み上げ：オフ'}
        >
          {autoSpeak ? <SpeakerIcon size={20} /> : <SpeakerOffIcon size={20} />}
        </button>
      )}
    </div>
  )
}
