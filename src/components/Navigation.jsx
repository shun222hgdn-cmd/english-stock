import { BookIcon, ChatIcon, HomeIcon, ShuffleIcon } from './Icons'

// 画面下部の固定ナビゲーションに並べる項目
const NAV_ITEMS = [
  { page: 'home', label: 'Home', Icon: HomeIcon },
  { page: 'words', label: 'Words', Icon: BookIcon },
  { page: 'phrases', label: 'Phrases', Icon: ChatIcon },
  { page: 'quiz', label: 'Review', Icon: ShuffleIcon },
]

/**
 * 画面下部の固定ナビゲーション。表示中の画面はアクセントカラーで強調する。
 * @param {{ activePage: string, onNavigate: (page: string) => void }} props
 */
export default function Navigation({ activePage, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="メインメニュー">
      <ul className="bottom-nav-list">
        {NAV_ITEMS.map(({ page, label, Icon }) => {
          const isActive = page === activePage
          return (
            <li key={page}>
              <button
                type="button"
                className={`nav-btn${isActive ? ' is-active' : ''}`}
                onClick={() => onNavigate(page)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={24} />
                <span className="nav-label">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
