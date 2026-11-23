// アプリで使うシンプルなアイコン（外部ライブラリを使わず SVG で描画）
// 色は文字色（currentColor）に合わせて変わる。装飾目的なので読み上げ対象外（aria-hidden）にしている。

function Icon({ children, size = 22, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function HomeIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9v11a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9" />
    </Icon>
  )
}

export function BookIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
      <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
    </Icon>
  )
}

export function ShuffleIcon(props) {
  return (
    <Icon {...props}>
      <path d="M16 3h5v5" />
      <path d="M4 20 21 3" />
      <path d="M21 16v5h-5" />
      <path d="m15 15 6 6" />
      <path d="M4 4l5 5" />
    </Icon>
  )
}

export function PlusIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function PencilIcon(props) {
  return (
    <Icon {...props}>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Icon>
  )
}

export function TrashIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </Icon>
  )
}

export function SearchIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  )
}

export function LogoutIcon(props) {
  return (
    <Icon {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </Icon>
  )
}

export function LogoIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2.5 6c3-1.4 6.2-1.4 9.5.8 3.3-2.2 6.5-2.2 9.5-.8v13c-3-1.4-6.2-1.4-9.5.8-3.3-2.2-6.5-2.2-9.5-.8z" />
      <path d="M12 6.8v13" />
    </Icon>
  )
}

export function CloseIcon(props) {
  return (
    <Icon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  )
}

export function CheckIcon(props) {
  return (
    <Icon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Icon>
  )
}

export function FolderIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
    </Icon>
  )
}

export function ChevronDownIcon(props) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  )
}

export function KeyIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.8 12.2 8.7-8.7" />
      <path d="m17 6 2.5 2.5" />
      <path d="m14.5 8.5 2 2" />
    </Icon>
  )
}

export function EyeIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  )
}

export function EyeOffIcon(props) {
  return (
    <Icon {...props}>
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </Icon>
  )
}

export function ChevronRightIcon(props) {
  return (
    <Icon {...props}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  )
}

export function SwapIcon(props) {
  return (
    <Icon {...props}>
      <path d="M7 7h12l-3-3M17 17H5l3 3" />
    </Icon>
  )
}

export function GearIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Icon>
  )
}

/** 暗記タブ用：重ねた単語カード */
export function CardsIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="7" width="14" height="13" rx="1.5" />
      <path d="M7 4h12.5A1.5 1.5 0 0 1 21 5.5V16" />
    </Icon>
  )
}

export function LockIcon(props) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="1.5" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </Icon>
  )
}

export function UnlockIcon(props) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="1.5" />
      <path d="M8 11V7.5a4 4 0 0 1 7.6-1.7" />
    </Icon>
  )
}

export function DownloadIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 4v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </Icon>
  )
}
