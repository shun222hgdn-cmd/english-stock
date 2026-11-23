import { SpeakerIcon } from './Icons'
import { isSpeechSupported, speakEnglish } from '../utils/speech'

/**
 * 英語を読み上げる 🔊 ボタン（⚙ で選んだ発音・速さで読む）。読み上げが使えない端末では表示しない。
 * @param {{ text: string, className?: string }} props
 */
export default function SpeakButton({ text, className = '' }) {
  if (!isSpeechSupported()) return null
  return (
    <button
      type="button"
      className={`icon-btn speak-btn ${className}`.trim()}
      onClick={(event) => {
        event.stopPropagation() // 行やカードの「押すと詳細・押すと答え」を起こさない
        speakEnglish(text)
      }}
      aria-label={`「${text}」を発音する`}
      title="発音を聞く"
    >
      <SpeakerIcon size={20} />
    </button>
  )
}
