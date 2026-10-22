import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi } from '../api'
import { formatMoney } from '../lib/format'
import { useLocale } from '../i18n'

interface ImportRow {
  date: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  potentialDuplicate: boolean
  selected?: boolean
}

interface TrendItem {
  categoryId?: string
  categoryName?: string
  categoryColor?: string
  total: number
  movingAvg: number
  deltaPct?: number
  prevMonth: number
}

type ActiveTab = 'import' | 'reports' | 'export'

export default function ReportsPage() {
  const { t } = useLocale()
  const qc = useQueryClient()
  const now = new Date()

  const [activeTab, setActiveTab] = useState<ActiveTab>('import')
  const [exportYear, setExportYear] = useState(now.getFullYear())
  const [exportMonth, setExportMonth] = useState(now.getMonth())

  // --- IMPORT STATE & MUTATIONS ---
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importErrorMessage, setImportErrorMessage] = useState('')
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null)

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
      setRows(data.rows.map(r => ({ ...r, selected: !r.potentialDuplicate })))
      setImportErrors(data.errors || [])
      setImportErrorMessage('')
    },
    onError: (err: Error) => {
      setImportErrorMessage(err.message)
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
      setImportSuccessCount(data.imported)
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
    },
    onError: (err: Error) => {
      setImportErrorMessage(err.message)
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setImportSuccessCount(null)
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

  function handleConfirmImport() {
    const activeRows = rows.filter(r => r.selected)
    if (activeRows.length === 0) {
      setImportErrorMessage('Nenhum lançamento selecionado para importação')
      return
    }
    confirmMutation.mutate(activeRows)
  }

  // --- ANALYTICS / TRENDS QUERY ---
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['analytics-trends'],
    queryFn: async () => {
      const res = await fetch('/api/v1/analytics/trends?type=EXPENSE', { credentials: 'include' })
      if (!res.ok) return { items: [] }
      return (await res.json()) as { items: TrendItem[] }
    },
  })

  // Transações do mês selecionado para exportação e análise
  const fromDate = `${exportYear}-${String(exportMonth + 1).padStart(2, '0')}-01`
  const lastDay = new Date(exportYear, exportMonth + 1, 0).getDate()
  const toDate = `${exportYear}-${String(exportMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data: exportTxs = [], isLoading: exportTxsLoading } = useQuery({
    queryKey: ['export-transactions', exportYear, exportMonth],
    queryFn: () => transactionsApi.list(fromDate, toDate),
  })

  // Radar de assinaturas e despesas recorrentes
  const expenseMap: Record<string, { count: number; total: number; amount: number }> = {}
  for (const t of exportTxs) {
    if (t.type === 'EXPENSE' && t.status !== 'CANCELED') {
      const key = (t.description || '').toLowerCase().trim()
      if (!expenseMap[key]) {
        expenseMap[key] = { count: 0, total: 0, amount: t.amount }
      }
      expenseMap[key].count++
      expenseMap[key].total += t.amount
    }
  }

  const subscriptions = Object.entries(expenseMap)
    .filter(([_, data]) => data.count >= 1)
    .map(([desc, data]) => ({
      description: desc.charAt(0).toUpperCase() + desc.slice(1),
      monthlyCost: data.amount,
      annualCost: data.amount * 12,
    }))
    .slice(0, 10)

  // --- CSV EXPORT ---
  function handleDownloadCSV() {
    const headers = ['ID', 'Data', 'Tipo', 'Descrição', 'Valor (R$)', 'Status', 'Categoria']
    const rowsCSV = exportTxs.map(t => [
      t.id,
      t.date.slice(0, 10),
      t.type,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      t.status,
      `"${(t.category?.name || '').replace(/"/g, '""')}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rowsCSV.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `somma_transacoes_${exportYear}_${exportMonth + 1}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function handlePrintPDF() {
    window.print()
  }

  return (
    <div className="reports-page" style={{ maxWidth: '1080px', margin: '0 auto', padding: '1.5rem 1rem 3.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem' }}>
          Relatórios & Importação
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
          Central de automação para importar extratos bancários, analisar tendências financeiras e exportar dados.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('import')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'import' ? '2px solid #0ea5e9' : '2px solid transparent',
            color: activeTab === 'import' ? '#0ea5e9' : '#64748b',
            fontWeight: activeTab === 'import' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          📥 Importar Extrato (OFX / CSV)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'reports' ? '2px solid #0ea5e9' : '2px solid transparent',
            color: activeTab === 'reports' ? '#0ea5e9' : '#64748b',
            fontWeight: activeTab === 'reports' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          📊 Relatórios & Comparativo Mensal
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('export')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'export' ? '2px solid #0ea5e9' : '2px solid transparent',
            color: activeTab === 'export' ? '#0ea5e9' : '#64748b',
            fontWeight: activeTab === 'export' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          📄 Exportar Dados
        </button>
      </div>

      {/* TAB 1: IMPORTAÇÃO */}
      {activeTab === 'import' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>
            Upload de Extrato Bancário
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem' }}>
            Envie arquivos no formato <strong>.OFX</strong> ou <strong>.CSV</strong> emitidos pelo seu banco (Nubank, Itaú, Inter, Bradesco, Santander, etc.). O sistema analisa duplicidades automaticamente.
          </p>

          {importErrorMessage && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {importErrorMessage}
            </div>
          )}

          {importSuccessCount !== null ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
              <h3 style={{ color: '#16a34a', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                Importação Concluída com Sucesso!
              </h3>
              <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0 }}>
                {importSuccessCount} lançamento(s) foram inseridos com sucesso no seu extrato financeiro.
              </p>
              <button
                type="button"
                className="btn-primary-add"
                style={{ marginTop: '1.25rem' }}
                onClick={() => {
                  setRows([])
                  setImportSuccessCount(null)
                }}
              >
                Importar Outro Arquivo
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '3rem 1.5rem',
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".ofx,.ofc,.csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📥</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', margin: '0 0 0.4rem' }}>
                Clique para selecionar seu arquivo de extrato
              </h3>
              <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0 0 1rem' }}>
                Formatos suportados: OFX, OFC e CSV
              </p>
              <button
                type="button"
                className="btn-primary-add"
                disabled={previewMutation.isPending}
                onClick={e => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                {previewMutation.isPending ? 'Processando arquivo...' : 'Selecionar Arquivo'}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  {rows.length} lançamentos encontrados ({rows.filter(r => r.selected).length} selecionados)
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-toolbar"
                    onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: true })))}
                  >
                    Marcar Todos
                  </button>
                  <button
                    type="button"
                    className="btn-toolbar"
                    onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: !r.potentialDuplicate })))}
                  >
                    Desmarcar Duplicados
                  </button>
                  <button
                    type="button"
                    className="btn-toolbar"
                    onClick={() => setRows([])}
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              {importErrors.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8rem', color: '#b45309' }}>
                  ⚠️ Avisos no arquivo: {importErrors.join(', ')}
                </div>
              )}

              <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '0.6rem 0.75rem', width: '40px' }}></th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Data</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Descrição</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Valor</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr
                        key={idx}
                        onClick={() => toggleRow(idx)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: row.selected ? '#ffffff' : '#f8fafc',
                          opacity: row.selected ? 1 : 0.6,
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <input
                            type="checkbox"
                            checked={!!row.selected}
                            onChange={() => toggleRow(idx)}
                            onClick={e => e.stopPropagation()}
                          />
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>{row.date.slice(0, 10)}</td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500 }}>{row.description}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 600, color: row.type === 'INCOME' ? '#10b981' : '#ef4444' }}>
                          {row.type === 'INCOME' ? '+' : '-'}{formatMoney(row.amount)}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          {row.potentialDuplicate ? (
                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: '#fffbeb', color: '#b45309', borderRadius: '99px', border: '1px solid #fde68a' }}>
                              Possível duplicata
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: '#f0fdf4', color: '#16a34a', borderRadius: '99px', border: '1px solid #bbf7d0' }}>
                              Novo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-primary-add"
                  disabled={confirmMutation.isPending || rows.filter(r => r.selected).length === 0}
                  onClick={handleConfirmImport}
                >
                  {confirmMutation.isPending ? 'Gravando transações...' : `Confirmar Importação de ${rows.filter(r => r.selected).length} Lançamento(s)`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RELATÓRIOS & MoM */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Radar de Assinaturas */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.35rem', color: '#0f172a' }}>
              📡 Radar de Assinaturas e Gastos Recorrentes
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.25rem' }}>
              Identificação automática de mensalidades, streamings e planos fixos recorrentes.
            </p>

            {subscriptions.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Nenhuma despesa fixa detectada no período selecionado.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                {subscriptions.map((sub, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '1rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{sub.description}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Anual: {formatMoney(sub.annualCost)}</div>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444' }}>
                      {formatMoney(sub.monthlyCost)}/mês
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comparativo de Categorias */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.35rem', color: '#0f172a' }}>
              📊 Comparativo Mensal de Despesas (MoM)
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.25rem' }}>
              Variação dos seus gastos por categoria comparados à média móvel e ao mês anterior.
            </p>

            {trendsLoading ? (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Carregando dados comparativos...</p>
            ) : !trendsData?.items || trendsData.items.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Não há dados comparativos suficientes registrados.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {trendsData.items.map((item, i) => {
                  const delta = item.deltaPct ?? 0
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '0.85rem 1rem',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '3px',
                            background: item.categoryColor || '#94a3b8',
                          }}
                        />
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.categoryName || 'Outros'}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Média: {formatMoney(item.movingAvg)}
                        </span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                          {formatMoney(item.total)}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '99px',
                            background: delta > 0 ? '#fef2f2' : '#f0fdf4',
                            color: delta > 0 ? '#dc2626' : '#16a34a',
                          }}
                        >
                          {delta > 0 ? `+${delta}%` : `${delta}%`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EXPORTAÇÃO */}
      {activeTab === 'export' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>
            Exportar Lançamentos
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem' }}>
            Exporte seus dados financeiros para planilhas (Excel / Google Sheets) ou gere relatórios para impressão em PDF.
          </p>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
                Mês
              </label>
              <select
                className="tx-select-filter"
                value={exportMonth}
                onChange={e => setExportMonth(Number(e.target.value))}
              >
                {t.months.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
                Ano
              </label>
              <select
                className="tx-select-filter"
                value={exportYear}
                onChange={e => setExportYear(Number(e.target.value))}
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div style={{ alignSelf: 'flex-end' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {exportTxsLoading ? 'Consultando...' : `${exportTxs.length} lançamento(s) selecionados`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary-add"
              onClick={handleDownloadCSV}
              disabled={exportTxs.length === 0}
            >
              📄 Baixar Planilha CSV ({exportTxs.length} linhas)
            </button>

            <button
              type="button"
              className="btn-toolbar"
              onClick={handlePrintPDF}
            >
              🖨️ Imprimir / Salvar em PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
