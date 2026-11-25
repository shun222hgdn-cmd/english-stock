import { useEffect, useMemo, useRef, useState } from 'react'
import QuizCard from '../components/QuizCard'
import Choice from '../components/Choice'
import Modal from '../components/Modal'
import LearnedButton from '../components/LearnedButton'
import { SlidersIcon } from '../components/Icons'
import {
  QUIZ_CATEGORIES,
  QUIZ_DIRECTIONS,
  QUIZ_OPTIONS,
  filterByCategory,
  getQuestionAndAnswer,
  loadQuizOptions,
  pickNextStock,
} from '../utils/quiz'
import { loadChoice, saveValue } from '../lib/preferences'
import {
  SPEECH_ACCENTS,
  SPEECH_RATES,
  isSpeechSupported,
  loadAutoSpeak,
  loadSpeechSettings,
  saveAutoSpeak,
  speakEnglish,
  stopSpeaking,
} from '../utils/speech'
import { categoryLabel } from '../utils/validation'

/**
 * 暗記。取得済みの stocks から出すので、出題のたびに通信はしない。
 * カードを押すと答え → もう一度で次の問題。「前の問題」で戻れる。
 * 右上の調整ボタンで「暗記の設定」（表示・順番・覚えたもの・自動で進む・発音）を変えられる。設定は端末に保存。
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
  const [options, setOptions] = useState(loadQuizOptions) // { display, order, learned, auto }
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentId, setCurrentId] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [history, setHistory] = useState([]) // これまでに出した問題の id（「前の問題」で戻る用）
  const [autoSpeak, setAutoSpeak] = useState(loadAutoSpeak) // 英語が出たら自動で読むか
  // 発音（アメリカ / イギリス、速さ）。選ぶとその場で見本を読む。ref は続けて押しても最新の組み合わせで読むため
  const [speech, setSpeech] = useState(loadSpeechSettings)
  const speechRef = useRef(speech)

  const inCategory = useMemo(() => filterByCategory(stocks, quizCategory), [stocks, quizCategory])
  // 「覚えたものは出さない」のときは除く
  const candidates = useMemo(
    () => (options.learned === 'hide' ? inCategory.filter((stock) => !stock.learned) : inCategory),
    [inCategory, options.learned],
  )
  const current = candidates.find((stock) => stock.id === currentId) ?? null
  const learnedCount = inCategory.filter((stock) => stock.learned).length
  const previousIds = history.filter((id) => candidates.some((stock) => stock.id === id))
  const isBoth = options.display === 'both'
  const answerVisible = isBoth || showAnswer
  const isJaToEn = quizDirection === 'ja-en'

  /**
   * 問題を出したときの自動読み上げ：英語が見えていれば読む（EN → JP、または「両方表示」）。
   * スマホでは押した操作の中で読み上げないと鳴らないことがあるので、ボタンの処理から直接呼ぶ。
   */
  function speakShown(stock, direction = quizDirection, both = isBoth, on = autoSpeak) {
    stopSpeaking()
    if (on && stock && (direction === 'en-ja' || both)) speakEnglish(stock.english)
  }

  /** 次の問題（ランダム / ABC順）。答えは隠す */
  function pickNext(pool = candidates) {
    if (current) setHistory((list) => [...list, current.id].slice(-50))
    const next = pickNextStock(pool, currentId, options.order)
    setCurrentId(next?.id ?? null)
    setShowAnswer(false)
    speakShown(next)
  }

  function goBack() {
    const previousId = previousIds[previousIds.length - 1]
    setHistory(previousIds.slice(0, -1))
    setCurrentId(previousId)
    setShowAnswer(false)
    speakShown(candidates.find((stock) => stock.id === previousId))
  }

  /** 答えを出す。英語が答えのとき（JP → EN）は、出したときに読む */
  function revealAnswer() {
    setShowAnswer(true)
    stopSpeaking()
    if (autoSpeak && current && isJaToEn) speakEnglish(current.english)
  }

  function toggleAutoSpeak() {
    const on = !autoSpeak
    setAutoSpeak(on)
    saveAutoSpeak(on)
    if (!on) return stopSpeaking()
    if (!isJaToEn || answerVisible) speakEnglish(current.english)
  }

  // 最初や、今の問題が候補から無くなったとき（削除・設定の変更など）は選び直す
  useEffect(() => {
    if (current === null && candidates.length > 0) {
      const first = pickNextStock(candidates, currentId, options.order)
      setCurrentId(first.id)
      setShowAnswer(false)
      if (loadAutoSpeak() && (quizDirection === 'en-ja' || options.display === 'both')) speakEnglish(first.english)
    }
  }, [current, candidates, currentId, quizDirection, options.order, options.display])

  // 自動で進む：一定時間ごとに「答えを出す → 次の問題」（両方表示なら次の問題だけ）。設定を開いている間は止める
  useEffect(() => {
    if (options.auto === 'off' || !current || settingsOpen) return
    const timer = setTimeout(answerVisible ? () => pickNext() : revealAnswer, Number(options.auto) * 1000)
    return () => clearTimeout(timer)
    // 問題・答えの表示・向き・読み上げ・順番が変わるたびに、最新の設定で時間を測り直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.auto, options.order, currentId, answerVisible, settingsOpen, quizDirection, autoSpeak])

  function changeCategory(category) {
    if (category === quizCategory) return
    setQuizCategory(category)
    saveValue('quizCategory', category)
    pickNext(filterByCategory(stocks, category).filter((stock) => options.learned !== 'hide' || !stock.learned))
    setHistory([])
  }

  function changeDirection(direction) {
    if (direction === quizDirection) return
    setQuizDirection(direction)
    saveValue('quizDirection', direction)
    setShowAnswer(false)
    speakShown(current, direction)
  }

  function chooseSpeech(key, value, sample) {
    const next = { ...speechRef.current, [key]: value }
    speechRef.current = next
    setSpeech(next)
    saveValue(key === 'accent' ? 'speechAccent' : 'speechRate', value)
    speakEnglish(sample, next)
  }

  function changeOption(key, value) {
    setOptions((prev) => ({ ...prev, [key]: value }))
    saveValue(`quiz_${key}`, value)
  }

  return (
    <section className="page">
      <div className="page-header">
        <h1 className="page-title">暗記</h1>
        <span className="quiz-header-tools">
          <Choice
            variant="lang-switch"
            label="出題方向"
            options={QUIZ_DIRECTIONS.map(({ value, label, description }) => ({ value, label, title: description }))}
            value={quizDirection}
            onChange={changeDirection}
          />
          <button
            type="button"
            className="icon-btn quiz-settings-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="暗記の設定"
            title="暗記の設定"
            aria-haspopup="dialog"
          >
            <SlidersIcon size={20} />
          </button>
        </span>
      </div>

      <Choice label="出題範囲" options={QUIZ_CATEGORIES} value={quizCategory} onChange={changeCategory} />

      {candidates.length === 0 && (
        <p className="empty-state">
          {inCategory.length > 0 ? (
            '覚えていないものはありません。'
          ) : (
            <>
              まだ{quizCategory === 'all' ? '単語・フレーズ・例文' : categoryLabel(quizCategory)}がありません。
              <br />
              単語帳の ＋ から追加すると、ここで出題されます。
            </>
          )}
        </p>
      )}

      {current && (
        <>
          <p className="quiz-progress">
            {options.auto !== 'off' && <span className="quiz-auto-mark">自動 {options.auto}秒</span>}
            覚えた {learnedCount} / {inCategory.length}
          </p>
          <QuizCard
            {...getQuestionAndAnswer(current, quizDirection)}
            questionLang={isJaToEn ? 'ja' : 'en'}
            answerLang={isJaToEn ? 'en' : 'ja'}
            autoSpeak={autoSpeak}
            onToggleAutoSpeak={toggleAutoSpeak}
            showAnswer={answerVisible}
            categoryLabel={categoryLabel(current.category)}
            partOfSpeech={current.category === 'word' ? current.part_of_speech : null}
            // カードを押す：答えが見えていなければ答え、見えていれば次の問題
            onToggle={answerVisible ? () => pickNext() : revealAnswer}
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
          <LearnedButton
            key={current.id}
            className="quiz-learned"
            learned={Boolean(current.learned)}
            onChange={(learned) => onSetLearned(current.id, learned)}
          />
          {answerVisible && current.note && (
            <section className="quiz-comment" aria-label="コメント">
              <p className="quiz-comment-label">コメント</p>
              <p className="quiz-comment-text">{current.note}</p>
            </section>
          )}
          {candidates.length === 1 && <p className="muted center-text">登録が1件のため、同じ問題を出題しています。</p>}
        </>
      )}

      {settingsOpen && (
        <Modal title="暗記の設定" onClose={() => setSettingsOpen(false)}>
          <ul className="settings-group quiz-settings">
            {QUIZ_OPTIONS.map(({ key, label, choices }) => (
              <li key={key} className="quiz-setting">
                <span className="quiz-setting-label">{label}</span>
                <Choice
                  variant="lang-switch"
                  label={label}
                  options={choices}
                  value={options[key]}
                  onChange={(value) => changeOption(key, value)}
                />
              </li>
            ))}
          </ul>

          {/* 発音（⚙ 設定から移した） */}
          <ul className="settings-group quiz-settings">
            {isSpeechSupported() ? (
              <>
                <li className="quiz-setting">
                  <span className="quiz-setting-label">発音</span>
                  <Choice
                    variant="lang-switch"
                    label="発音の種類"
                    options={SPEECH_ACCENTS}
                    value={speech.accent}
                    onChange={(value) => chooseSpeech('accent', value, 'Hello')}
                  />
                </li>
                <li className="quiz-setting">
                  <span className="quiz-setting-label">速さ</span>
                  <Choice
                    variant="lang-switch"
                    label="読む速さ"
                    options={SPEECH_RATES}
                    value={speech.rate}
                    onChange={(value) => chooseSpeech('rate', value, 'Nice to meet you')}
                  />
                </li>
                <li className="quiz-setting">
                  <span className="quiz-setting-label">読み上げ</span>
                  <Choice
                    variant="lang-switch"
                    label="自動読み上げ"
                    options={[
                      { value: 'on', label: '自動で読む' },
                      { value: 'off', label: '押したときだけ' },
                    ]}
                    value={autoSpeak ? 'on' : 'off'}
                    onChange={(value) => {
                      setAutoSpeak(value === 'on')
                      saveAutoSpeak(value === 'on')
                      if (value === 'off') stopSpeaking()
                    }}
                  />
                </li>
              </>
            ) : (
              <li className="quiz-setting">
                <span className="settings-row-sub">この端末・ブラウザでは発音を使えません</span>
              </li>
            )}
          </ul>
        </Modal>
      )}
    </section>
  )
}
