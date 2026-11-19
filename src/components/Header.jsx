import { LogoIcon, LogoutIcon } from './Icons'

/**
 * 画面上部のヘッダー（アプリ名とログアウトボタン）。
 * @param {{ onSignOut: () => void, signingOut: boolean }} props
 */
export default function Header({ onSignOut, signingOut }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <p className="brand">
          <LogoIcon size={20} />
          <span>English Stock</span>
        </p>
        <button type="button" className="btn btn-ghost btn-small" onClick={onSignOut} disabled={signingOut}>
          <LogoutIcon size={16} />
          <span>{signingOut ? 'Logging out…' : 'Logout'}</span>
        </button>
      </div>
    </header>
  )
}
