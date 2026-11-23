import { SpeakerIcon } from './Icons'
import { SPEECH_ACCENTS, SPEECH_RATES, isSpeechSupported, speakEnglish } from '../utils/speech'
import { loadChoice } from '../lib/preferences'

/**
 * 英語を読み上げる 🔊 ボタン。読み上げが使えない端末では表示しない。
 * 発音の設定（アメリカ英語 / イギリス英語、速さ）は ⚙ 設定で選んだものを、押したときに読み込む。
 *
 * @param {{ text: string, className?: string }} props
 */
export default function SpeakButton({ text, className = '' }) {
  if (!isSpeechSupported()) return null

  function handleClick(event) {
    // 行やカードの「押すと編集・押すと答え」の動きを起こさない
    event.stopPropagation()
    speakEnglish(text, {
      accent: loadChoice('speechAccent', SPEECH_ACCENTS.map((a) => a.value), 'en-US'),
      rate: loadChoice('speechRate', SPEECH_RATES.map((r) => r.value), 'normal'),
    })
  }

  return (
    <button
      type="button"
      className={`icon-btn speak-btn ${className}`.trim()}
      onClick={handleClick}
      aria-label={`「${text}」を発音する`}
      title="発音を聞く"
    >
      <SpeakerIcon size={20} />
    </button>
  )
}
