import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages の公開パス（https://ユーザー名.github.io/english-stock/）
// リポジトリ名を変えた場合は、ここも同じ名前に変更してください。
const GITHUB_PAGES_BASE = '/english-stock/'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // 開発サーバー（npm run dev）は http://localhost:5173/ で開けるように '/' にし、
  // ビルド時（npm run build）だけ GitHub Pages 用のパスにする
  base: command === 'build' ? GITHUB_PAGES_BASE : '/',
}))
