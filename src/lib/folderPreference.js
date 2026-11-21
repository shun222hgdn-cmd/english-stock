// 「この端末で最後に選んだフォルダ」を覚えておくための処理。
// ブラウザの localStorage に保存する（端末ごとの便利機能なので、消えても困らない）。
// プライベートモードなどで使えない場合もあるため、失敗しても動き続けるようにしている。

const key = (userId) => `english-stock:folder:${userId}`

/** 前回選んだフォルダIDを読み込む（無ければ null） */
export function loadFolderPreference(userId) {
  try {
    return window.localStorage.getItem(key(userId))
  } catch {
    return null
  }
}

/** 選んだフォルダIDを保存する */
export function saveFolderPreference(userId, folderId) {
  try {
    window.localStorage.setItem(key(userId), folderId)
  } catch {
    // 保存できなくても、次回は先頭のフォルダが表示されるだけなので問題ない
  }
}
