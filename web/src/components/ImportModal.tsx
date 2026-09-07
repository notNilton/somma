import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface Props {
  onClose: () => void
}

interface ImportRow {
  date: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  potentialDuplicate: boolean
  selected?: boolean
}

export default function ImportModal({ onClose }: Props) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [successCount, setSuccessCount] = useState<number | null>(null)

  const previewMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      const formData = new FormData()
      formData.append('file', selectedFile)
      const res = await fetch('/api/v1/import/preview', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao processar arquivo')
      }
      return (await res.json()) as { rows: ImportRow[]; errors: string[] }
    },
    onSuccess: data => {
      // Por padrão seleciona os que não são duplicados potenciais
      setRows(data.rows.map(r => ({ ...r, selected: !r.potentialDuplicate })))
      setErrors(data.errors || [])
      setErrorMessage('')
    },
    onError: (err: Error) => {
      setErrorMessage(err.message)
    },
  })

  const confirmMutation = useMutation({
    mutationFn: async (selectedRows: ImportRow[]) => {
      const res = await fetch('/api/v1/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedRows),
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao salvar lançamentos importados')
      }
      return (await res.json()) as { imported: number }
    },
    onSuccess: data => {
      setSuccessCount(data.imported)
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
    },
    onError: (err: Error) => {
      setErrorMessage(err.message)
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      previewMutation.mutate(f)
    }
  }

  function toggleRow(index: number) {
    setRows(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], selected: !updated[index].selected }
      return updated
    })
  }

  function handleConfirm() {
    const activeRows = rows.filter(r => r.selected)
    if (activeRows.length === 0) {
      setErrorMessage('Nenhum lançamento selecionado para importação')
      return
    }
    confirmMutation.mutate(activeRows)
  }

  return (
    <div className="budget-modal-backdrop" onClick={onClose}>
      <div
        className="budget-modal"
        style={{ maxWidth: '720px', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="budget-modal-header">
          <div>
            <div className="budget-modal-kicker">Automação de Dados</div>
            <div className="budget-modal-title">Importação de Extrato Bancário (OFX & CSV)</div>
            <div className="budget-modal-subtitle">
              Faça upload do extrato para pré-visualização, conferência e detecção de duplicidades
            </div>
          </div>
          <button type="button" className="budget-modal-close" onClick={onClose}>×</button>
        </div>

        {errorMessage && <div className="budget-modal-error">{errorMessage}</div>}

        {successCount !== null ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h4 style={{ color: '#10b981', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              ✓ Importação Concluída com Sucesso!
            </h4>
            <p style={{ color: 'var(--text-muted)' }}>
              {successCount} lançamento(s) foram adicionados às suas transações.
            </p>
            <div className="budget-modal-actions" style={{ marginTop: '1.5rem', justifyContent: 'center' }}>
              <button type="button" onClick={onClose} className="budget-modal-btn budget-modal-btn-primary">
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            {rows.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".ofx,.ofc,.csv"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className="btn-action-sm"
                  style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={previewMutation.isPending}
                >
                  {previewMutation.isPending ? 'Analisando arquivo...' : '📁 Selecionar Arquivo (.OFX ou .CSV)'}
                </button>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  Suporta arquivos de extrato dos principais bancos (Nubank, Itaú, Bradesco, Inter, Santander).
                </p>
              </div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {rows.length} lançamentos encontrados ({rows.filter(r => r.selected).length} selecionados)
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-action-sm btn-action-ghost"
                      onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: true })))}
                    >
                      Marcar Todos
                    </button>
                    <button
                      type="button"
                      className="btn-action-sm btn-action-ghost"
                      onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: !r.potentialDuplicate })))}
                    >
                      Desmarcar Duplicados
                    </button>
                  </div>
                </div>

                {errors.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginBottom: '0.5rem' }}>
                    ⚠️ Avisos durante a leitura: {errors.slice(0, 3).join('; ')}
                  </div>
                )}

                <div
                  style={{
                    maxHeight: '340px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '8px',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-subtle, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'center', width: '40px' }}>✓</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Data</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Descrição</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Valor</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Alerta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid var(--border-color, #e2e8f0)',
                            background: r.potentialDuplicate ? 'rgba(245, 158, 11, 0.08)' : 'inherit',
                          }}
                        >
                          <td style={{ textAlign: 'center', padding: '0.4rem' }}>
                            <input
                              type="checkbox"
                              checked={!!r.selected}
                              onChange={() => toggleRow(idx)}
                            />
                          </td>
                          <td style={{ padding: '0.4rem' }}>{r.date}</td>
                          <td style={{ padding: '0.4rem' }}>{r.description}</td>
                          <td
                            style={{
                              padding: '0.4rem',
                              textAlign: 'right',
                              fontWeight: 600,
                              color: r.type === 'INCOME' ? '#10b981' : '#ef4444',
                            }}
                          >
                            {r.type === 'INCOME' ? '+' : '-'} R$ {r.amount.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.4rem' }}>
                            {r.potentialDuplicate && (
                              <span className="pill pill-warning" style={{ fontSize: '0.7rem' }}>
                                Possível Duplicata
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="budget-modal-actions" style={{ marginTop: '1.2rem' }}>
                  <button
                    type="button"
                    onClick={() => { setRows([]); setFile(null) }}
                    className="budget-modal-btn budget-modal-btn-secondary"
                  >
                    Trocar Arquivo
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={confirmMutation.isPending}
                    className="budget-modal-btn budget-modal-btn-primary"
                  >
                    {confirmMutation.isPending ? 'Importando...' : `Confirmar Importação (${rows.filter(r => r.selected).length})`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
