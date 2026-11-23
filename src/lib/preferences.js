// 端末ごとの設定（選んだフォルダ・表示の切り替え・出題方向・発音など）を localStorage に覚えておく。
// 消えても困らない便利機能なので、プライベートモードなどで使えなくても動き続けるようにしている。

const PREFIX = 'english-stock:'

/** 保存した値を読み込む（無ければ null） */
export function loadValue(name) {
  try {
    return window.localStorage.getItem(PREFIX + name)
  } catch {
    return null
  }
}

/** 値を保存する（保存できなくても、次回は既定値で始まるだけ） */
export function saveValue(name, value) {
  try {
    window.localStorage.setItem(PREFIX + name, value)
  } catch {
    // 何もしない
  }
}

/** 保存した選択肢を読み込む。未保存・想定外の値なら fallback */
export function loadChoice(name, allowed, fallback) {
  const value = loadValue(name)
  return allowed.includes(value) ? value : fallback
}
