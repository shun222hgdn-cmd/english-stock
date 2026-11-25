/**
 * 切り替えボタンの並び（すべて / 単語 / フレーズ / 例文、JP → EN / EN → JP など）。選んでいる方が濃く表示される。
 * 見た目は variant で選ぶ：'segmented'（下線のタブ） / 'lang-switch'（枠つきの2択）。
 * segmented は、選んでいる印（薄い下地と下線）が選んだタブへすべって動く。
 *
 * @param {{
 *   options: Array<{ value: string, label: string, count?: number, title?: string }>,
 *   value: string,
 *   onChange: (value: string) => void,
 *   label: string,          // 読み上げ用のグループ名
 *   variant?: 'segmented' | 'lang-switch',
 *   className?: string,
 *   disabled?: boolean,
 * }} props
 */
export default function Choice({ options, value, onChange, label, variant = 'segmented', className = '', disabled }) {
  const activeIndex = options.findIndex((option) => option.value === value)
  const isSegmented = variant === 'segmented'

  return (
    <div
      className={`${variant} ${className}`.trim()}
      role="group"
      aria-label={label}
      style={isSegmented ? { '--count': options.length, '--index': Math.max(activeIndex, 0) } : undefined}
    >
      {isSegmented && activeIndex >= 0 && <span className="segmented-indicator" aria-hidden="true" />}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${variant}-btn${value === option.value ? ' is-active' : ''}`}
          aria-pressed={value === option.value}
          aria-label={option.count === undefined ? undefined : `${option.label} ${option.count}件`}
          title={option.title}
          onClick={() => onChange(option.value)}
          disabled={disabled}
        >
          {option.label}
          {option.count !== undefined && <span className="segmented-count">{option.count}</span>}
        </button>
      ))}
    </div>
  )
}
