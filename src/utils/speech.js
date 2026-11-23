// 英語の発音（読み上げ）。スマホ・パソコンのブラウザに最初から入っている音声合成（Web Speech API）を使う。
// 外部のサービスや API キーは使わない。端末によって声は少し違う。

import { loadChoice } from '../lib/preferences.js'

/** 発音の設定で選べる値 */
export const SPEECH_ACCENTS = [
  { value: 'en-US', label: 'アメリカ英語' },
  { value: 'en-GB', label: 'イギリス英語' },
]
export const SPEECH_RATES = [
  { value: 'normal', label: 'ふつう', rate: 0.95 },
  { value: 'slow', label: 'ゆっくり', rate: 0.7 },
]

/** ⚙ 設定で選んだ発音（この端末に保存） */
export function loadSpeechSettings() {
  return {
    accent: loadChoice('speechAccent', SPEECH_ACCENTS.map((a) => a.value), 'en-US'),
    rate: loadChoice('speechRate', SPEECH_RATES.map((r) => r.value), 'normal'),
  }
}

/** この端末・ブラウザで読み上げが使えるか */
export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

/**
 * 端末に入っている声の中から、英語の声を1つ選ぶ（純粋な関数なので自動テストできる）。
 * 優先順位：指定した地域（en-US / en-GB）> そのほかの英語。
 * 同じ条件なら、自然に聞こえることが多い声（Google・Siri・Natural・Samantha など）を優先する。
 *
 * @param {Array<{ name: string, lang: string, localService?: boolean, default?: boolean }>} voices
 * @param {'en-US' | 'en-GB'} accent
 * @returns {object | null}
 */
export function pickVoice(voices, accent = 'en-US') {
  const wanted = accent.toLowerCase()
  const score = (voice) => {
    const lang = String(voice.lang ?? '').replace('_', '-').toLowerCase()
    if (!lang.startsWith('en')) return -1
    let points = lang === wanted ? 100 : 10
    if (/google|siri|natural|neural|samantha|daniel|karen|serena|aria|jenny|sonia|libby/i.test(voice.name)) points += 20
    if (/compact|novelty|whisper|bad news|bells|boing|bubbles|cellos|zarvox|trinoids|albert|jester|organ|superstar/i.test(voice.name)) points -= 50
    if (voice.default) points += 1
    return points
  }
  let best = null
  let bestScore = -1
  for (const voice of voices) {
    const s = score(voice)
    if (s > bestScore) {
      best = voice
      bestScore = s
    }
  }
  return bestScore >= 0 ? best : null
}

/** 設定の「速さ」を、読み上げの速度の数値にする */
export function rateOf(value) {
  return (SPEECH_RATES.find((item) => item.value === value) ?? SPEECH_RATES[0]).rate
}

/**
 * 英語を読み上げる。前の読み上げが続いていれば止めてから読む。
 * @param {string} text
 * @param {{ accent: 'en-US' | 'en-GB', rate: 'normal' | 'slow' }} settings 省略時は ⚙ で選んだもの
 */
export function speakEnglish(text, { accent, rate } = loadSpeechSettings()) {
  if (!isSpeechSupported() || !String(text ?? '').trim()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new window.SpeechSynthesisUtterance(String(text))
  utterance.lang = accent
  utterance.rate = rateOf(rate)
  const voice = pickVoice(synth.getVoices(), accent)
  if (voice) utterance.voice = voice
  synth.speak(utterance)
}

/** 読み上げを止める（画面を切り替えたときなど） */
export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}
