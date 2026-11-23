// ChatGPT 連携の受け口（Edge Function）で使う、入力チェックなどの処理。
// 通信やデータベースを使わない純粋な関数だけをここに置き、Node.js の自動テストで確かめる。

/** 1回に追加できる最大件数 */
export const MAX_ITEMS = 50

/** 英語・日本語訳・コメントの最大文字数 */
export const MAX_TEXT_LENGTH = 500

/** 品詞の一覧（アプリ・データベースと同じ） */
export const PARTS_OF_SPEECH = ['名詞', '代名詞', '動詞', '形容詞', '副詞', '助動詞', '前置詞', '冠詞', '接続詞', '間投詞']

const length = (text) => [...text].length

/** 英語の内容から種類を推測する（スペースを含めばフレーズ）。アプリと同じ規則 */
export function guessCategory(english) {
  return /\s/.test(String(english ?? '').trim()) ? 'phrase' : 'word'
}

/** 重複チェック用のキー（大文字・小文字と前後の空白を無視） */
export const duplicateKey = (english) => String(english ?? '').trim().toLowerCase()

/**
 * ChatGPT から送られてきた追加データを、保存できる形に整える。
 * 保存しないもの（空欄・長すぎる・すでに登録済み・同じ依頼の中で重複）は理由付きで skipped に入れる。
 *
 * @param {unknown} items 送られてきた items
 * @param {Set<string>} existingKeys そのフォルダに登録済みの英語（duplicateKey 済み）
 * @returns {{ error?: string, valid: Array<object>, skipped: Array<{ english: string, reason: string }> }}
 */
export function normalizeItems(items, existingKeys = new Set()) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'items に追加する単語・フレーズを1件以上入れてください。', valid: [], skipped: [] }
  }
  if (items.length > MAX_ITEMS) {
    return { error: `1回に追加できるのは${MAX_ITEMS}件までです。分けて送ってください。`, valid: [], skipped: [] }
  }

  const valid = []
  const skipped = []
  const seen = new Set(existingKeys)

  for (const raw of items) {
    const item = raw && typeof raw === 'object' ? raw : {}
    const english = String(item.english ?? '').trim()
    const japanese = String(item.japanese ?? '').trim()

    if (!english || !japanese) {
      skipped.push({ english, reason: '英語と日本語訳の両方が必要です' })
      continue
    }
    if (length(english) > MAX_TEXT_LENGTH || length(japanese) > MAX_TEXT_LENGTH) {
      skipped.push({ english, reason: `英語・日本語訳は${MAX_TEXT_LENGTH}文字以内にしてください` })
      continue
    }
    const key = duplicateKey(english)
    if (seen.has(key)) {
      skipped.push({ english, reason: 'すでに登録済みです' })
      continue
    }

    const category = item.category === 'word' || item.category === 'phrase' ? item.category : guessCategory(english)
    const part_of_speech =
      category === 'word' && PARTS_OF_SPEECH.includes(item.part_of_speech) ? item.part_of_speech : null
    let note = String(item.note ?? '').trim()
    if (length(note) > MAX_TEXT_LENGTH) note = [...note].slice(0, MAX_TEXT_LENGTH).join('')

    seen.add(key)
    valid.push({ category, english, japanese, part_of_speech, note: note || null })
  }

  return { valid, skipped }
}

/**
 * 追加先のフォルダを決める。
 * - folder（名前・大文字小文字は無視）または folder_id で指定されたもの
 * - 指定がなく、フォルダが1つだけならそれ
 * 鍵のかかったフォルダには追加しない。
 *
 * @param {Array<{ id: string, name: string, lock_hash?: string|null }>} folders
 * @param {{ folder?: string, folder_id?: string }} request
 * @returns {{ folder?: object, error?: string }}
 */
export function pickFolder(folders, { folder, folder_id } = {}) {
  const names = folders.map((f) => f.name).join('、')
  let target = null
  if (folder_id) target = folders.find((f) => f.id === folder_id) ?? null
  else if (folder) {
    const key = String(folder).trim().toLowerCase()
    target = folders.find((f) => f.name.toLowerCase() === key) ?? null
  } else if (folders.length === 1) target = folders[0]
  else return { error: `追加先のフォルダを folder で指定してください。フォルダ：${names}` }

  if (!target) return { error: `そのフォルダは見つかりませんでした。フォルダ：${names || '（なし）'}` }
  if (target.lock_hash) return { error: `「${target.name}」は鍵がかかっているため、ChatGPT からは追加できません。` }
  return { folder: target }
}

/** Authorization: Bearer es_... からキーを取り出す（形式が違えば null） */
export function readBearerToken(header) {
  const match = /^Bearer\s+(es_[0-9a-f]{64})$/.exec(String(header ?? '').trim())
  return match ? match[1] : null
}

/** 文字列の SHA-256（16進数）。データベースに保存したハッシュと比べるために使う */
export async function sha256Hex(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
