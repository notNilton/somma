import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '../api'
import type { Account, AccountType } from '../types'

const accountTypes: Array<{ value: AccountType; label: string }> = [
  { value: 'CHECKING', label: 'Conta Corrente' },
  { value: 'WALLET', label: 'Carteira / Dinheiro' },
  { value: 'EMERGENCY', label: 'Reserva de Emergência' },
  { value: 'INVESTMENT', label: 'Investimentos' },
]

export default function AccountsSettingsSection() {
  const qc = useQueryClient()
  const [openNew, setOpenNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [reconcilingAccount, setReconcilingAccount] = useState<Account | null>(null)
  const [realBalanceInput, setRealBalanceInput] = useState('')

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('CHECKING')
  const [initialBalance, setInitialBalance] = useState('')
  const [error, setError] = useState('')

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      resetForm()
    },
    onError: (err: Error) => setError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => accountsApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      resetForm()
      setReconcilingAccount(null)
    },
    onError: (err: Error) => setError(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: accountsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })

  function resetForm() {
    setName('')
    setType('CHECKING')
    setInitialBalance('')
    setError('')
    setOpenNew(false)
    setEditingId(null)
  }

  function handleStartEdit(acc: Account) {
    setEditingId(acc.id)
    setName(acc.name)
    setType(acc.type)
    setInitialBalance(String(acc.initialBalance))
    setOpenNew(true)
  }

  function handleStartReconcile(acc: Account) {
    setReconcilingAccount(acc)
    setRealBalanceInput(String(acc.balance))
  }

  function handleConfirmReconcile(e: React.FormEvent) {
    e.preventDefault()
    if (!reconcilingAccount) return
    const targetRealBalance = parseFloat(realBalanceInput)
    if (isNaN(targetRealBalance)) return

    // Ajusta o saldo inicial pela diferença para que o saldo calculado bata exatamente com o saldo real
    const diff = targetRealBalance - reconcilingAccount.balance
    const newInitialBalance = reconcilingAccount.initialBalance + diff

    updateMutation.mutate({
      id: reconcilingAccount.id,
      input: { initialBalance: newInitialBalance },
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nome é obrigatório')
      return
    }
    const balanceNum = parseFloat(initialBalance) || 0
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        input: { name, type, initialBalance: balanceNum },
      })
    } else {
      createMutation.mutate({
        name,
        type,
        initialBalance: balanceNum,
      })
    }
  }

  return (
    <section className="config-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="config-section-title">Contas Bancárias & Carteiras</h3>
        {!openNew && (
          <button
            type="button"
            className="btn-action-sm"
            onClick={() => { resetForm(); setOpenNew(true) }}
          >
            + Nova Conta
          </button>
        )}
      </div>

      {/* Modal / Bloco de Reconciliação Rápida */}
      {reconcilingAccount && (
        <form
          className="config-pwd-form"
          onSubmit={handleConfirmReconcile}
          style={{ marginTop: '1rem', marginBottom: '1rem', background: 'var(--bg-subtle, #f8fafc)' }}
        >
          <h4>Reconciliação Rápida de Saldo Real — {reconcilingAccount.name}</h4>
          <p className="config-hint" style={{ marginBottom: '0.75rem' }}>
            Informe o saldo real exibido no aplicativo do seu banco para ajustar a reconciliação do saldo:
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              className="config-inline-input"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={realBalanceInput}
              onChange={e => setRealBalanceInput(e.target.value)}
              required
              autoFocus
            />
            <button
              type="submit"
              className="btn-action-sm btn-action-ok"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Reconciliando...' : 'Ajustar Saldo'}
            </button>
            <button
              type="button"
              className="btn-action-sm btn-action-ghost"
              onClick={() => setReconcilingAccount(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {openNew && (
        <form className="config-pwd-form" onSubmit={handleSubmit} style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <h4>{editingId ? 'Editar Conta' : 'Cadastrar Nova Conta'}</h4>
          {error && <div className="config-form-error">{error}</div>}

          <label className="budget-field">
            <span className="budget-field-label">Nome da Conta / Banco</span>
            <input
              className="config-inline-input"
              placeholder="Ex: Nubank, Itaú, Carteira física"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label className="budget-field">
              <span className="budget-field-label">Tipo de Conta</span>
              <select
                className="budget-input"
                value={type}
                onChange={e => setType(e.target.value as AccountType)}
              >
                {accountTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>

            <label className="budget-field">
              <span className="budget-field-label">Saldo Inicial (R$)</span>
              <input
                className="config-inline-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={initialBalance}
                onChange={e => setInitialBalance(e.target.value)}
              />
            </label>
          </div>

          <div className="config-form-actions">
            <button type="button" className="btn-action-sm btn-action-ghost" onClick={resetForm}>
              Cancelar
            </button>
            <button type="submit" className="btn-action-sm" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Salvar Alterações' : 'Cadastrar Conta'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Carregando contas...</div>
      ) : accounts.length === 0 ? (
        <div style={{ padding: '0.75rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Nenhuma conta bancária cadastrada. Adicione sua conta corrente, poupança ou dinheiro físico.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
          {accounts.map(acc => (
            <div
              key={acc.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.6rem 0.8rem',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '6px',
              }}
            >
              <div>
                <strong>{acc.name}</strong>
                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ({accountTypes.find(t => t.value === acc.type)?.label ?? acc.type})
                </span>
                <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Saldo Calculado: <strong>R$ {acc.balance.toFixed(2)}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                    (Inicial: R$ {acc.initialBalance.toFixed(2)})
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn-action-sm"
                  title="Reconciliar com saldo do extrato bancário"
                  onClick={() => handleStartReconcile(acc)}
                >
                  Reconciliar
                </button>
                <button
                  type="button"
                  className="btn-action-sm btn-action-ghost"
                  onClick={() => handleStartEdit(acc)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn-action-sm btn-action-danger"
                  onClick={() => {
                    if (confirm(`Deseja realmente remover a conta "${acc.name}"?`)) {
                      removeMutation.mutate(acc.id)
                    }
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
