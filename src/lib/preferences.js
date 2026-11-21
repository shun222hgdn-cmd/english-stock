// 画面の設定（Review の出題範囲・出題方向、Stock の表示切り替えなど）を端末ごとに覚えておく処理。
// ブラウザの localStorage に保存する（端末ごとの便利機能なので、消えても困らない）。
// プライベートモードなどで使えない場合もあるため、失敗しても動き続けるようにしている。

const PREFIX = 'english-stock:'

/**
 * 保存した設定を読み込む。
 * 保存されていない・想定外の値が入っている場合は fallback を返す。
 *
 * @param {string} name 設定の名前
 * @param {string[]} allowed 許可する値の一覧
 * @param {string} fallback 既定値
 */
export function loadChoice(name, allowed, fallback) {
  try {
    const value = window.localStorage.getItem(PREFIX + name)
    return allowed.includes(value) ? value : fallback
  } catch {
    return fallback
  }
}

/** 設定を保存する */
export function saveChoice(name, value) {
  try {
    window.localStorage.setItem(PREFIX + name, value)
  } catch {
    // 保存できなくても、次回は既定値で始まるだけなので問題ない
  }
}
