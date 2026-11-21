import { useState } from 'react'
import { FolderIcon } from '../components/Icons'
import { cleanFolderName } from '../utils/folders'
import { toErrorMessage } from '../utils/errors'

/**
 * フォルダが1つも無いとき（新しいアカウントの初回）に表示する、最初のフォルダ作成画面。
 * @param {{ onCreate: (name: string) => Promise<void> }} props
 */
export default function FolderSetup({ onCreate }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return
    const { value, error: nameError } = cleanFolderName(name)
    setError(nameError)
    if (nameError) return

    setSaving(true)
    try {
      await onCreate(value)
      // 成功するとフォルダが追加され、自動的にホーム画面に切り替わる
    } catch (err) {
      setError(toErrorMessage(err, 'フォルダを作成できませんでした。'))
      setSaving(false)
    }
  }

  return (
    <section className="page">
      <h1 className="hero-title">Create your folder.</h1>
      <form className="card folder-setup" onSubmit={handleSubmit} noValidate>
        <p className="folder-setup-icon" aria-hidden="true">
          <FolderIcon size={28} />
        </p>
        <p>
          単語・フレーズはフォルダに保存します。
          <br />
          使う人ごとにフォルダを分けられます。
        </p>
        <div className="field">
          <label htmlFor="first-folder">最初のフォルダ名（例：自分の名前）</label>
          <input
            id="first-folder"
            className="input"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (error) setError('')
            }}
            autoComplete="off"
            enterKeyHint="done"
            aria-invalid={Boolean(error)}
            disabled={saving}
            autoFocus
          />
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? '作成中…' : 'フォルダを作成'}
        </button>
      </form>
    </section>
  )
}
