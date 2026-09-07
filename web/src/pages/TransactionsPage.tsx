import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi, cardsApi, categoriesApi, transactionsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n'
import { groupByDay } from '../lib/groupByDay'
import DayGroupComponent from '../components/DayGroup'
import TransactionModal from '../components/TransactionModal'
import EmptyState from '../components/EmptyState'
import UndoToast from '../components/UndoToast'
import ShortcutsHint from '../components/ShortcutsHint'
import AccountsSummaryCard from '../components/AccountsSummaryCard'
import CashflowRunwaySimulator from '../components/CashflowRunwaySimulator'
import TransferModal from '../components/TransferModal'
import ImportModal from '../components/ImportModal'
import AnalyticsModal from '../components/AnalyticsModal'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import type { CreateInput, Transaction, TxKind, UpdateInput, TransferInput } from '../types'

interface ModalState {
  open: boolean
  date: string
  kind: TxKind
  transaction?: Transaction
}
type UiFilterType = 'ALL' | 'INCOME' | 'EXPENSE'

function pad(n: number) { return String(n).padStart(2, '0') }

export default function TransactionsPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useLocale()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [filterType, setFilterType] = useState<UiFilterType>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false)

  // Seleção múltipla para bulk actions
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set())

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }
  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  const lastDay = new Date(year, month + 1, 0).getDate()
  const from = `${year}-${pad(month + 1)}-01`
  const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`
  const txKey = ['transactions', year, month]

  const { data: txs = [], error: txError } = useQuery({
    queryKey: txKey,
    queryFn: () => transactionsApi.list(from, to),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  })

  const { data: cards = [] } = useQuery({
    queryKey: ['cards'],
    queryFn: () => cardsApi.list(),
  })

  useEffect(() => {
    if ((txError as Error)?.message === 'UNAUTHORIZED') {
      logout()
      navigate('/login', { replace: true })
    }
  }, [txError, logout, navigate])

  const createMutation = useMutation({
    mutationFn: (input: CreateInput) => transactionsApi.create(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: txKey })
      const previous = qc.getQueryData<Transaction[]>(txKey)
      qc.setQueryData<Transaction[]>(txKey, (old = []) => [
        ...old,
        {
          id: 'optimistic-' + Date.now(),
          type: input.type,
          kind: input.kind ?? (input.type === 'INCOME' ? 'INCOME' : 'EXPENSE'),
          status: input.status ?? 'COMPLETED',
          amount: input.amount,
          description: input.description,
          date: input.date + 'T00:00:00Z',
          categoryId: input.categoryId,
        },
      ])
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(txKey, ctx.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: txKey })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInput }) =>
      transactionsApi.update(id, input),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: txKey })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: txKey })
      const previous = qc.getQueryData<Transaction[]>(txKey)
      const deleted = previous?.find(tx => tx.id === id)
      qc.setQueryData<Transaction[]>(txKey, (old = []) => old.filter(tx => tx.id !== id))
      if (deleted) setUndoState({ id, label: deleted.description || 'Transação' })
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(txKey, ctx.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: txKey })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.restore(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: txKey })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
    },
  })

  const transferMutation = useMutation({
    mutationFn: (input: TransferInput) => accountsApi.transfer(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: txKey })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setTransferModalOpen(false)
    },
  })

  // Bulk Actions
  async function handleBulkDelete() {
    if (selectedTxIds.size === 0) return
    if (!confirm(`Deseja excluir as ${selectedTxIds.size} transações selecionadas?`)) return
    const ids = Array.from(selectedTxIds)
    for (const id of ids) {
      await transactionsApi.remove(id).catch(() => {})
    }
    setSelectedTxIds(new Set())
    qc.invalidateQueries({ queryKey: txKey })
    qc.invalidateQueries({ queryKey: ['accounts'] })
    qc.invalidateQueries({ queryKey: ['cards'] })
  }

  // Exportação CSV
  function handleExportCSV() {
    const headers = ['ID', 'Data', 'Tipo', 'Descrição', 'Valor (R$)', 'Status', 'Categoria']
    const rows = filteredTxs.map(t => [
      t.id,
      t.date.slice(0, 10),
      t.type,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      t.status,
      `"${(t.category?.name || '').replace(/"/g, '""')}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `somma_transacoes_${year}_${month + 1}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function handleExportPDF() {
    window.print()
  }

  const [undoState, setUndoState] = useState<{ id: string; label: string } | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false, date: '', kind: 'EXPENSE' })
  const dialogRef = useRef<HTMLDialogElement>(null)

  useKeyboardShortcuts({
    onNewTransaction: () => {
      const todayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      openModal(todayDate, 'EXPENSE')
    },
    onToggleFilter: () => {
      setFilterType(current => {
        if (current === 'ALL') return 'INCOME'
        if (current === 'INCOME') return 'EXPENSE'
        return 'ALL'
      })
    },
  })

  function openModal(date: string, kind: TxKind, transaction?: Transaction) {
    setModal({ open: true, date, kind, transaction })
  }

  function closeModal() {
    setModal(m => ({ ...m, open: false }))
  }

  function handleCreate(input: CreateInput) {
    createMutation.mutate(input, {
      onSuccess: () => closeModal(),
    })
  }

  function handleUpdate(input: CreateInput) {
    if (!modal.transaction) return
    updateMutation.mutate(
      { id: modal.transaction.id, input },
      { onSuccess: () => closeModal() }
    )
  }

  function handleEdit(t: Transaction) {
    const d = t.date.slice(0, 10)
    openModal(d, t.kind, t)
  }

  function handleUndo() {
    if (!undoState) return
    restoreMutation.mutate(undoState.id)
    setUndoState(null)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (modal.open && !dialog.open) {
      dialog.showModal()
    } else if (!modal.open && dialog.open) {
      dialog.close()
    }
  }, [modal.open])

  // Filtragem combinada
  const filteredTxs = txs.filter(t => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const descMatch = (t.description || '').toLowerCase().includes(q)
      const catMatch = (t.category?.name || '').toLowerCase().includes(q)
      if (!descMatch && !catMatch) return false
    }
    if (selectedAccountId && t.accountId !== selectedAccountId) {
      return false
    }
    if (selectedCategoryId && t.categoryId !== selectedCategoryId) {
      return false
    }
    return true
  })

  const groups = groupByDay(filteredTxs, year, month)
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  return (
    <>
      <div className="tx-page">
        {/* Painel de saldos consolidados por conta e cartão */}
        <AccountsSummaryCard
          accounts={accounts}
          cards={cards}
          onOpenTransfer={() => setTransferModalOpen(true)}
        />

        {/* Projeção Preditiva e Fluxo de Caixa Futuro (Runway) */}
        <CashflowRunwaySimulator
          accounts={accounts}
          cards={cards}
          transactions={txs}
        />

        {/* Barra de Ferramentas: Importação, Analytics e Exportações */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.6rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-action-sm"
              onClick={() => setImportModalOpen(true)}
            >
              📥 Importar Extrato (OFX/CSV)
            </button>
            <button
              type="button"
              className="btn-action-sm btn-action-ghost"
              onClick={() => setAnalyticsModalOpen(true)}
            >
              📊 Relatórios & MoM
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-action-sm btn-action-ghost"
              title="Exportar dados do mês em planilha CSV"
              onClick={handleExportCSV}
            >
              📄 CSV
            </button>
            <button
              type="button"
              className="btn-action-sm btn-action-ghost"
              title="Exportar / Imprimir relatório em PDF"
              onClick={handleExportPDF}
            >
              🖨️ PDF
            </button>
          </div>
        </div>

        {/* Filtros Avançados e Busca Global */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.5rem',
            marginBottom: '1.25rem',
            background: 'var(--card-bg, #fff)',
            padding: '0.75rem',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
          }}
        >
          <input
            className="config-inline-input"
            style={{ width: '100%' }}
            type="text"
            placeholder="🔍 Buscar descrição ou categoria..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />

          <select
            className="budget-input"
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
          >
            <option value="">Todas as Contas</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select
            className="budget-input"
            value={selectedCategoryId}
            onChange={e => setSelectedCategoryId(e.target.value)}
          >
            <option value="">Todas as Categorias</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Barra de Ações em Lote (Bulk Actions) */}
        {selectedTxIds.size > 0 && (
          <div
            style={{
              padding: '0.6rem 1rem',
              background: 'var(--bg-subtle, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {selectedTxIds.size} lançamento(s) selecionado(s)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-action-sm btn-action-danger"
                onClick={handleBulkDelete}
              >
                Excluir em Lote
              </button>
              <button
                type="button"
                className="btn-action-sm btn-action-ghost"
                onClick={() => setSelectedTxIds(new Set())}
              >
                Desmarcar
              </button>
            </div>
          </div>
        )}

        <div className="month-nav">
          <button className="today-chip" onClick={goToday} title="hoje">
            {now.getDate()}
          </button>
          <button className="month-arrow" onClick={prevMonth}>‹</button>
          <span className="month-label">{t.months[month]}/{String(year).slice(2)}</span>
          <button className="month-arrow" onClick={nextMonth}>›</button>
        </div>

        <div className="tx-table-header">
          <span className="th-dia">{t.table.day}</span>
          <span className="th-filter">
            <select
              className="type-filter-select"
              value={filterType}
              onChange={e => setFilterType(e.target.value as UiFilterType)}
            >
              <option value="ALL">{t.filter.all}</option>
              <option value="INCOME">{t.filter.income}</option>
              <option value="EXPENSE">{t.filter.expense}</option>
            </select>
          </span>
          <span className="th-total">{t.table.total}</span>
        </div>

        {groups.map(g => (
          <DayGroupComponent
            key={g.dateStr}
            group={g}
            filterType={filterType}
            isToday={g.dateStr === todayStr}
            selectedTxIds={selectedTxIds}
            onToggleSelectTx={id => {
              setSelectedTxIds(prev => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }}
            onAdd={openModal}
            onDelete={id => deleteMutation.mutate(id)}
            onEdit={handleEdit}
          />
        ))}
        {groups.length === 0 && (
          <EmptyState
            icon="💸"
            title={t.emptyState.title}
            hint={t.emptyState.hint}
            action={{
              label: `+ ${t.modal.title}`,
              onClick: () => {
                const todayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
                openModal(todayDate, 'EXPENSE')
              },
            }}
          />
        )}

        <button
          type="button"
          className="fab-add"
          onClick={() => {
            const todayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
            openModal(todayDate, 'EXPENSE')
          }}
          aria-label="Novo lançamento"
          title="Novo lançamento"
        >
          +
        </button>
      </div>

      <dialog
        className="budget-dialog"
        ref={dialogRef}
        onClick={e => { if (e.target === dialogRef.current) closeModal() }}
      >
        {modal.open && (
          <TransactionModal
            date={modal.date}
            kind={modal.kind}
            categories={categories}
            accounts={accounts}
            cards={cards}
            transaction={modal.transaction}
            onClose={closeModal}
            onSubmit={modal.transaction ? handleUpdate : handleCreate}
            error={createMutation.error?.message ?? updateMutation.error?.message}
          />
        )}
      </dialog>

      {transferModalOpen && (
        <TransferModal
          accounts={accounts}
          onClose={() => setTransferModalOpen(false)}
          onSubmit={input => transferMutation.mutate(input)}
          error={transferMutation.error?.message}
        />
      )}

      {importModalOpen && (
        <ImportModal
          onClose={() => setImportModalOpen(false)}
        />
      )}

      {analyticsModalOpen && (
        <AnalyticsModal
          transactions={txs}
          onClose={() => setAnalyticsModalOpen(false)}
        />
      )}

      {undoState && (
        <UndoToast
          message={`"${undoState.label}" removida`}
          onUndo={handleUndo}
          onDismiss={() => setUndoState(null)}
        />
      )}
      <ShortcutsHint />
    </>
  )
}
