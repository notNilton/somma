import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { importApi } from '../api'
import { useLocale } from '../i18n'
import type { ImportRow } from '../types'

export default function ImportPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [rows, setRows] = useState<ImportRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const preview = await importApi.preview(file)
      setRows(preview.rows)
      setParseErrors(preview.errors)
      // pre-deselect potential duplicates
      setSelected(new Set(preview.rows.map((_, i) => i).filter(i => !preview.rows[i].potentialDuplicate)))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function toggleRow(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set())
    else setSelected(new Set(rows.map((_, i) => i)))
  }

  async function handleConfirm() {
    const toImport = rows.filter((_, i) => selected.has(i))
    if (toImport.length === 0) return
    setConfirmLoading(true)
    setError('')
    try {
      const res = await importApi.confirm(toImport)
      setResult(res.imported)
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setConfirmLoading(false)
    }
  }

  function reset() {
    setRows([])
    setParseErrors([])
    setSelected(new Set())
    setResult(null)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="import-page">
      <div className="import-header">
        <button className="import-back" onClick={() => navigate('/config')}>←</button>
        <h2 className="import-title">{t.import.title}</h2>
      </div>

      {result !== null ? (
        <div className="import-success">
          <div className="import-success-icon">✓</div>
          <p>{t.import.success.replace('{n}', String(result))}</p>
          <button className="btn-action-sm" onClick={reset}>{t.import.importMore}</button>
          <button className="btn-action-sm" onClick={() => navigate('/')}>{t.import.goToTx}</button>
        </div>
      ) : (
        <>
          <div className="import-drop-zone">
            <p className="import-hint">{t.import.hint}</p>
            <label className="import-file-label">
              {t.import.chooseFile}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.ofx,.ofc"
                className="import-file-input"
                onChange={handleFile}
              />
            </label>
          </div>

          {parseErrors.length > 0 && (
            <div className="import-parse-errors">
              {parseErrors.map((e, i) => <p key={i} className="import-parse-error">{e}</p>)}
            </div>
          )}

          {error && <p className="import-error">{error}</p>}
          {loading && <p className="import-loading">{t.import.parsing}</p>}

          {rows.length > 0 && (
            <>
              <div className="import-table-wrap">
                <table className="import-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={selected.size === rows.length}
                          onChange={toggleAll}
                        />
                      </th>
                      <th>{t.import.colDate}</th>
                      <th>{t.import.colDesc}</th>
                      <th>{t.import.colAmount}</th>
                      <th>{t.import.colType}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={i}
                        className={selected.has(i) ? '' : 'import-row-deselected'}
                        onClick={() => toggleRow(i)}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.has(i)}
                            onChange={() => toggleRow(i)}
                            onClick={e => e.stopPropagation()}
                          />
                        </td>
                        <td>{row.date}</td>
                        <td>
                          {row.description}
                          {row.potentialDuplicate && (
                            <span className="import-dup-badge">{t.import.potentialDuplicate}</span>
                          )}
                        </td>
                        <td className={`import-amount ${row.type === 'INCOME' ? 'income' : 'expense'}`}>
                          {row.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td>
                          <span className={`import-type-badge ${row.type === 'INCOME' ? 'income' : 'expense'}`}>
                            {row.type === 'INCOME' ? t.filter.income : t.filter.expense}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="import-actions">
                <span className="import-count">{selected.size}/{rows.length} {t.import.selected}</span>
                <button
                  className="budget-modal-btn budget-modal-btn-primary"
                  onClick={handleConfirm}
                  disabled={selected.size === 0 || confirmLoading}
                >
                  {confirmLoading ? t.import.importing : t.import.confirm.replace('{n}', String(selected.size))}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
