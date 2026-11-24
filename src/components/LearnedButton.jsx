import { CheckIcon } from './Icons'
import { useBusy } from '../hooks/useBusy'

/**
 * 「覚えた」の印を付ける・外すボタン（暗記カードの下と詳細で使う）。
 * 覚えたものは暗記で出にくくなる（なくなりはしない）。
 *
 * @param {{ learned: boolean, onChange: (learned: boolean) => Promise<void>, className?: string }} props
 */
export default function LearnedButton({ learned, onChange, className = '' }) {
  const { busy, error, run } = useBusy('保存できませんでした。')

  return (
    <div className={`learned ${className}`.trim()}>
      <button
        type="button"
        className={`learned-btn${learned ? ' is-on' : ''}`}
        aria-pressed={learned}
        onClick={() => run(() => onChange(!learned))}
        disabled={busy}
        title={learned ? '押すと「まだ」に戻す' : '覚えたら押す（暗記で出にくくなる）'}
      >
        <CheckIcon size={16} />
        覚えた
      </button>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
