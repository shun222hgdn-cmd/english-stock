import { BookIcon, CardsIcon } from './Icons'

// 画面下部の固定ナビゲーションに並べる項目
const NAV_ITEMS = [
  { page: 'stock', label: '単語帳', Icon: BookIcon },
  { page: 'quiz', label: '暗記', Icon: CardsIcon },
]

/**
 * 画面下部の固定ナビゲーション。表示中の画面はアクセントカラーで強調する。
 * @param {{ activePage: string, onNavigate: (page: string) => void }} props
 */
export default function Navigation({ activePage, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="メインメニュー">
      {/* 選んでいる画面の札（--index の位置へすべって動く） */}
      <ul className="bottom-nav-list" style={{ '--index': NAV_ITEMS.findIndex((item) => item.page === activePage) }}>
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
                <Icon size={22} />
                <span className="nav-label">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
