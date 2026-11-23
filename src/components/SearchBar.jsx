import { SearchIcon } from './Icons'

/**
 * 検索欄。入力するたびに一覧が絞り込まれる。
 * @param {{ value: string, onChange: (value: string) => void, label: string }} props
 */
export default function SearchBar({ value, onChange, label }) {
  return (
    <div className="search-bar">
      <SearchIcon size={18} />
      <input
        type="search"
        className="search-input"
        placeholder="英語・日本語で検索"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        autoComplete="off"
        enterKeyHint="search"
      />
    </div>
  )
}
