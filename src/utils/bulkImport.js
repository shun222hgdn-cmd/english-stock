// 「まとめて追加」：貼り付けた文章から、単語・フレーズ・例文を読み取る処理
// （画面に依存しない純粋な関数なので、自動テストしやすい）
//
// 読み取れる形式
//   1. 1行に1件：英語 | 日本語訳 | 品詞 | コメント（「|」の代わりにタブでもよい。品詞・コメントは省略可）
//   2. ChatGPT がよく出す表（| 英語 | 日本語訳 | … |）。見出しの行と区切りの行（|---|）は読み飛ばす
//   3. このアプリの「CSVで書き出す」で作った CSV（1行目が 種類,英語,日本語訳,品詞,コメント）
// ``` で囲まれたコードブロックや、空の行は読み飛ばす。

import { NOTE_MAX_LENGTH, PARTS_OF_SPEECH, guessCategory } from './validation.js'
import { CSV_HEADERS } from './csv.js'

/** 1回に取り込める最大件数 */
export const BULK_MAX_ROWS = 300

/** 英語・日本語訳の最大文字数 */
const TEXT_MAX_LENGTH = 500

const CATEGORY_FROM_LABEL = { 単語: 'word', フレーズ: 'phrase', 例文: 'sentence', word: 'word', phrase: 'phrase', sentence: 'sentence' }

/** ChatGPT に貼り付けてもらう「頼む文」 */
export const CHATGPT_PROMPT = `次の英単語・英語フレーズ・例文を、English Stock に取り込める形にしてください。
・1行に1つ、「英語 | 日本語訳 | 品詞 | コメント」の形で書く
・日本語訳は自然で短く
・品詞は単語のときだけ、名詞・代名詞・動詞・形容詞・副詞・助動詞・前置詞・冠詞・接続詞・間投詞 から1つ（フレーズ・例文や迷うときは空欄）
・例文は文の終わりに . ? ! を付ける
・コメントは必要なときだけ（例文は入れない）
・見出しや説明は書かず、コードブロックの中に結果だけを書く

（ここに単語・フレーズ・例文を書く）`

/** 書き出し時に付けた「数式よけ」の ' を外す（'=SUM → =SUM） */
const unguard = (value) => (/^'[=+\-@]/.test(value) ? value.slice(1) : value)

/**
 * CSV の文字列を、行ごとのセルの配列にする（"" で囲まれた値・"" のエスケープ・セル内の改行に対応）。
 * @returns {Array<{ cells: string[], line: number }>}
 */
export function parseCsv(text) {
  const rows = []
  let cells = []
  let cell = ''
  let quoted = false
  let line = 1
  let rowStart = 1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else {
        if (ch === '\n') line++
        cell += ch
      }
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      cells.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      cells.push(cell)
      rows.push({ cells, line: rowStart })
      cells = []
      cell = ''
      line++
      rowStart = line
    } else cell += ch
  }
  if (cell !== '' || cells.length > 0) {
    cells.push(cell)
    rows.push({ cells, line: rowStart })
  }
  return rows
}

/** 区切り（| またはタブ）の行を、セルの配列にする。表の行（| a | b |）の両端の | も外す */
function splitLine(line) {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim())
  let text = line.trim()
  if (text.startsWith('|')) text = text.slice(1)
  if (text.endsWith('|')) text = text.slice(0, -1)
  return text.split('|').map((c) => c.trim())
}

/** 見出しの行か（「英語」「English」「種類」などで始まる） */
const isHeader = (cells) => /^(英語|english|種類|category)$/i.test(cells[0] ?? '')

/**
 * 1件分のセル（英語・日本語訳・品詞・コメント、または 種類・英語・…）を、登録できる形にする。
 * @returns {{ row?: object, reason?: string }}
 */
function toRow(cells, hasCategoryColumn) {
  let [category, english, japanese, pos, note] = hasCategoryColumn
    ? cells
    : [undefined, cells[0], cells[1], cells[2], cells.slice(3).join(' | ')]
  english = unguard(String(english ?? '').trim())
  japanese = unguard(String(japanese ?? '').trim())
  pos = String(pos ?? '').trim()
  note = unguard(String(note ?? '').trim())

  if (!english || !japanese) return { reason: '英語と日本語訳の両方が必要です' }
  if ([...english].length > TEXT_MAX_LENGTH || [...japanese].length > TEXT_MAX_LENGTH) {
    return { reason: `英語・日本語訳は${TEXT_MAX_LENGTH}文字以内にしてください` }
  }

  const resolvedCategory = CATEGORY_FROM_LABEL[String(category ?? '').trim()] ?? guessCategory(english)
  // 3番目が品詞として読めないときは、コメントとして扱う（品詞を省いてコメントだけ書いた場合など）
  if (pos && !PARTS_OF_SPEECH.includes(pos)) {
    note = note ? `${pos} | ${note}` : pos
    pos = ''
  }
  const part_of_speech = resolvedCategory === 'word' && pos ? pos : null
  if ([...note].length > NOTE_MAX_LENGTH) note = [...note].slice(0, NOTE_MAX_LENGTH).join('')

  return { row: { category: resolvedCategory, english, japanese, part_of_speech, note: note || null } }
}

/**
 * 貼り付けた文章を読み取る。
 * @param {string} text
 * @returns {{ rows: Array<{ line: number, category: string, english: string, japanese: string, part_of_speech: string|null, note: string|null }>,
 *             errors: Array<{ line: number, text: string, reason: string }>, tooMany: boolean }}
 */
export function parseBulkText(text) {
  const source = String(text ?? '').replace(/^﻿/, '')
  const rows = []
  const errors = []

  // このアプリの CSV（1行目が見出し）なら CSV として読む
  const firstLine = source.split(/\r?\n/).find((l) => l.trim() !== '') ?? ''
  if (firstLine.trim() === CSV_HEADERS.join(',')) {
    const csvRows = parseCsv(source.trim())
    for (const { cells, line } of csvRows.slice(1)) {
      if (cells.every((c) => c.trim() === '')) continue
      const { row, reason } = toRow(cells, true)
      if (row) rows.push({ line, ...row })
      else errors.push({ line, text: cells.join(','), reason })
    }
  } else {
    source.split(/\r?\n/).forEach((raw, index) => {
      const line = index + 1
      const trimmed = raw.trim()
      // 空の行・コードブロックの印・表の区切りの行（|---|---|）は読み飛ばす
      if (!trimmed || trimmed.startsWith('```') || /^\|?[\s:|-]+\|?$/.test(trimmed)) return
      const cells = splitLine(trimmed)
      if (isHeader(cells)) return
      if (cells.length < 2) {
        errors.push({ line, text: trimmed, reason: '「英語 | 日本語訳」の形になっていません' })
        return
      }
      const { row, reason } = toRow(cells, false)
      if (row) rows.push({ line, ...row })
      else errors.push({ line, text: trimmed, reason })
    })
  }

  return { rows: rows.slice(0, BULK_MAX_ROWS), errors, tooMany: rows.length > BULK_MAX_ROWS }
}

/**
 * 登録済み・貼り付けの中での重複に印を付ける（大文字・小文字と前後の空白は無視）。
 * duplicate が true のものは追加しない。
 *
 * @param {Array<{ english: string }>} rows parseBulkText の rows
 * @param {Array<{ english: string }>} existingStocks 追加先フォルダの登録データ
 */
export function markDuplicates(rows, existingStocks) {
  const seen = new Set(existingStocks.map((s) => s.english.trim().toLowerCase()))
  return rows.map((row) => {
    const key = row.english.trim().toLowerCase()
    const duplicate = seen.has(key)
    seen.add(key)
    return { ...row, duplicate }
  })
}
