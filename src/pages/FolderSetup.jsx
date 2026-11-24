import { useState } from 'react'
import { FolderIcon } from '../components/Icons'
import { cleanFolderName } from '../utils/folders'
import { useBusy } from '../hooks/useBusy'

/**
 * フォルダが1つも無いとき（新しいアカウントの初回）に出す、最初のフォルダ作成画面。
 * @param {{ onCreate: (name: string) => Promise<void> }} props
 */
export default function FolderSetup({ onCreate }) {
  const [name, setName] = useState('')
  const { busy, error, setError, run } = useBusy('フォルダを作成できませんでした。')

  function handleSubmit(event) {
    event.preventDefault()
    const { value, error: nameError } = cleanFolderName(name)
    if (nameError) return setError(nameError)
    run(() => onCreate(value)) // 成功するとフォルダが追加され、単語帳に切り替わる
  }

  return (
    <section className="page">
      <h1 className="page-title">フォルダを作成</h1>
      <form className="card folder-setup" onSubmit={handleSubmit} noValidate>
        <p className="folder-setup-icon" aria-hidden="true">
          <FolderIcon size={28} />
        </p>
        <p>
          単語・フレーズ・例文はフォルダに保存します。
          <br />
          使う人ごとにフォルダを分けられます。
        </p>
        <div className="field">
          <label htmlFor="first-folder">最初のフォルダ名</label>
          <input
            id="first-folder"
            className="input"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            autoComplete="off"
            enterKeyHint="done"
            aria-invalid={Boolean(error)}
            disabled={busy}
            autoFocus
          />
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? '作成中…' : 'フォルダを作成'}
        </button>
      </form>
    </section>
  )
}
