import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi, cardsApi } from '../api'
import type { Account, AccountCardInput, AccountType, CreateAccountInput } from '../types'
import { BANKS, formatDocument, maskDocument, onlyDigits } from '../lib/banks'
import { ACCOUNT_GROUPS, groupAccounts } from '../lib/accountGroups'
import { formatMoney } from '../lib/format'
import MoneyInput from './MoneyInput'

const OTHER_BANK = 'OTHER'


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
  // bankCode: código COMPE da lista, OTHER_BANK para nome livre, '' para nenhum
  const [bankCode, setBankCode] = useState('')
  const [otherBankName, setOtherBankName] = useState('')
  const [holderName, setHolderName] = useState('')
  const [holderDocument, setHolderDocument] = useState('')
  // Cartão de crédito da conta
  const [cardLimit, setCardLimit] = useState('')
  const [closingDay, setClosingDay] = useState('5')
  const [dueDay, setDueDay] = useState('15')
  const [error, setError] = useState('')

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  })

  const { data: cards = [] } = useQuery({
    queryKey: ['cards'],
    queryFn: () => cardsApi.list(),
  })
  const cardByAccount = new Map(cards.filter(c => c.accountId).map(c => [c.accountId!, c]))

  const groups = groupAccounts(accounts)
  const total = accounts.reduce((sum, a) => sum + a.balance, 0)

  // Salva a conta e, se pedido, o cartão de crédito dela.
  const createMutation = useMutation({
    mutationFn: async ({ input, card }: { input: CreateAccountInput; card?: AccountCardInput }) => {
      const acc = await accountsApi.create(input)
      if (card) await accountsApi.saveCard(acc.id, card)
      return acc
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      resetForm()
    },
    onError: (err: Error) => setError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, input, card }: { id: string; input: any; card?: AccountCardInput }) => {
      const acc = await accountsApi.update(id, input)
      if (card) await accountsApi.saveCard(id, card)
      return acc
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
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
    setBankCode('')
    setOtherBankName('')
    setHolderName('')
    setHolderDocument('')
    setCardLimit('')
    setClosingDay('5')
    setDueDay('15')
    setError('')
    setOpenNew(false)
    setEditingId(null)
  }

  function handleStartEdit(acc: Account) {
    setEditingId(acc.id)
    setName(acc.name)
    setType(acc.type)
    const known = BANKS.find(b => b.code === acc.bankCode)
    setBankCode(known ? known.code : acc.bankName ? OTHER_BANK : '')
    setOtherBankName(known ? '' : acc.bankName ?? '')
    setHolderName(acc.holderName ?? '')
    setHolderDocument(formatDocument(acc.holderDocument ?? ''))
    const card = cardByAccount.get(acc.id)
    setCardLimit(card && card.creditLimit > 0 ? String(card.creditLimit) : '')
    setClosingDay(String(card?.closingDay ?? 5))
    setDueDay(String(card?.dueDay ?? 15))
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

  function selectedBank() {
    if (bankCode === OTHER_BANK) return { code: '', name: otherBankName.trim() }
    const bank = BANKS.find(b => b.code === bankCode)
    return bank ? { code: bank.code, name: bank.name } : { code: '', name: '' }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const bank = selectedBank()
    // Sem nome próprio, a conta leva o nome do banco.
    const accountName = name.trim() || bank.name
    if (!accountName) {
      setError('Escolha um banco ou dê um nome à conta')
      return
    }
    const doc = onlyDigits(holderDocument)
    if (doc && doc.length !== 11 && doc.length !== 14) {
      setError('CPF deve ter 11 dígitos e CNPJ 14')
      return
    }
    const closing = parseInt(closingDay, 10)
    const due = parseInt(dueDay, 10)
    if (!(closing >= 1 && closing <= 31 && due >= 1 && due <= 31)) {
      setError('Fechamento e vencimento do cartão devem ser dias entre 1 e 31')
      return
    }
    const input = {
      name: accountName,
      type,
      bankCode: bank.code,
      bankName: bank.name,
      holderName: holderName.trim(),
      holderDocument: doc,
    }
    // O cartão só é gravado se já existir ou se um limite foi informado;
    // sem isso ele nasce sozinho na primeira compra no crédito.
    const limit = parseFloat(cardLimit) || 0
    const hasCard = editingId ? cardByAccount.has(editingId) : false
    const card = hasCard || limit > 0 ? { creditLimit: limit, closingDay: closing, dueDay: due } : undefined
    if (editingId) {
      updateMutation.mutate({ id: editingId, input, card })
    } else {
      createMutation.mutate({ input, card })
    }
  }

  return (
    <section className="config-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="config-section-title">Suas contas</h3>
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
            <MoneyInput
              className="config-inline-input"
              placeholder="0,00"
              value={realBalanceInput}
              onChange={setRealBalanceInput}
              allowNegative
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label className="budget-field">
              <span className="budget-field-label">Banco</span>
              <select
                className="budget-input"
                value={bankCode}
                onChange={e => setBankCode(e.target.value)}
                autoFocus
              >
                <option value="">Nenhum (carteira, dinheiro)</option>
                {BANKS.map(b => (
                  <option key={b.code} value={b.code}>{b.code} · {b.name}</option>
                ))}
                <option value={OTHER_BANK}>Outro…</option>
              </select>
            </label>

            <label className="budget-field">
              <span className="budget-field-label">Tipo de conta</span>
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
          </div>

          {bankCode === OTHER_BANK && (
            <label className="budget-field">
              <span className="budget-field-label">Nome do banco</span>
              <input
                className="config-inline-input"
                placeholder="Ex: Banco Pan"
                value={otherBankName}
                onChange={e => setOtherBankName(e.target.value)}
                required
              />
            </label>
          )}

          <label className="budget-field">
            <span className="budget-field-label">Nome da conta (opcional)</span>
            <input
              className="config-inline-input"
              placeholder={selectedBank().name || 'Ex: Carteira física'}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label className="budget-field">
              <span className="budget-field-label">Titular (opcional)</span>
              <input
                className="config-inline-input"
                placeholder="Nome ou razão social"
                value={holderName}
                onChange={e => setHolderName(e.target.value)}
              />
            </label>

            <label className="budget-field">
              <span className="budget-field-label">CPF ou CNPJ (opcional)</span>
              <input
                className="config-inline-input"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={holderDocument}
                onChange={e => setHolderDocument(formatDocument(e.target.value))}
              />
            </label>
          </div>

          <div className="acc-card-fields">
            <span className="acc-card-fields-title">Cartão de crédito</span>
            <span className="config-hint">Compras no crédito feitas nesta conta usam este cartão.</span>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
              <label className="budget-field">
                <span className="budget-field-label">Limite (opcional)</span>
                <MoneyInput
                  className="config-inline-input"
                  placeholder="0,00"
                  value={cardLimit}
                  onChange={setCardLimit}
                />
              </label>
              <label className="budget-field">
                <span className="budget-field-label">Fecha dia</span>
                <input
                  className="config-inline-input"
                  type="number"
                  min={1}
                  max={31}
                  value={closingDay}
                  onChange={e => setClosingDay(e.target.value)}
                />
              </label>
              <label className="budget-field">
                <span className="budget-field-label">Vence dia</span>
                <input
                  className="config-inline-input"
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={e => setDueDay(e.target.value)}
                />
              </label>
            </div>
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
        ACCOUNT_GROUPS.map(g => {
          const group = groups.get(g.key)
          if (!group || group.accounts.length === 0) return null
          return (
            <div key={g.key} className="acc-group">
              <div className="acc-group-head">
                <span><span className={`acc-swatch ${g.key}`} aria-hidden="true" />{g.label}</span>
                <span className="acc-num">{formatMoney(group.total)}</span>
              </div>
              {group.accounts.map(acc => (
                <div key={acc.id} className="acc-row">
                  <div className="acc-row-main">
                    <div className="acc-row-name">
                      {acc.bankCode && <span className="acc-bank-code">{acc.bankCode}</span>}
                      <strong>{acc.name}</strong>
                      <span className="acc-row-type">
                        {accountTypes.find(t => t.value === acc.type)?.label ?? acc.type}
                      </span>
                    </div>
                    {(acc.bankName || acc.holderName || acc.holderDocument) && (
                      <div className="acc-row-meta">
                        {[
                          acc.bankName !== acc.name && acc.bankName,
                          acc.holderName,
                          acc.holderDocument &&
                            `${acc.holderDocumentType} ${maskDocument(acc.holderDocument, acc.holderDocumentType)}`,
                        ].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {(() => {
                      const card = cardByAccount.get(acc.id)
                      if (!card) return null
                      const used = card.creditLimit - card.availableLimit
                      return (
                        <div className="acc-row-meta acc-row-card">
                          Cartão ·{' '}
                          {card.creditLimit > 0
                            ? `disponível ${formatMoney(card.availableLimit)} de ${formatMoney(card.creditLimit)}`
                            : `usado ${formatMoney(used)} · sem limite definido`}
                          {` · fecha dia ${card.closingDay} · vence dia ${card.dueDay}`}
                        </div>
                      )
                    })()}
                  </div>

                  <div className="acc-row-values">
                    <strong className="acc-num">{formatMoney(acc.balance)}</strong>
                    <span className="acc-row-meta">
                      {total > 0 ? `${((acc.balance / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do total` : ''}
                    </span>
                  </div>

                  <div className="acc-row-actions">
                    <button
                      type="button"
                      className="btn-action-sm btn-action-ghost"
                      title="Ajustar ao saldo do extrato bancário"
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
                      className="btn-action-sm btn-action-ghost btn-action-danger"
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
          )
        })
      )}
    </section>
  )
}
