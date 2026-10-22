import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi, cardsApi, categoriesApi, transactionsApi } from '../api'
import { useLocale } from '../i18n'
import { formatMoney } from '../lib/format'
import MoneyInput from '../components/MoneyInput'
import type { Category, CreateInput, TransferInput, TxKind } from '../types'

function flattenCategories(cats: Category[], indent = false): Array<{ id: string; name: string; indent: boolean }> {
  const result: Array<{ id: string; name: string; indent: boolean }> = []
  for (const c of cats) {
    result.push({ id: c.id, name: c.name, indent })
    if (c.children?.length) result.push(...flattenCategories(c.children, true))
  }
  return result
}

type DrawerTab = 'tx' | 'transfer' | 'invoice'

function typeForKind(kind: TxKind): 'INCOME' | 'EXPENSE' {
  return kind === 'INCOME' ? 'INCOME' : 'EXPENSE'
}

export default function NewTransactionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { id: paramId } = useParams()
  const location = useLocation()
  const qc = useQueryClient()
  const { t } = useLocale()

  const editId = searchParams.get('edit') || paramId
  const isTransferPath = location.pathname.endsWith('/transfer')
  const tabParam = searchParams.get('tab')
  const initialTab: DrawerTab = tabParam === 'invoice' ? 'invoice'
    : (tabParam === 'transfer' || isTransferPath) ? 'transfer' : 'tx'
  const initialDate = searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const initialKind = (searchParams.get('kind') as TxKind) || 'EXPENSE'

  const [activeTab, setActiveTab] = useState<DrawerTab>(initialTab)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        navigate('/app')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const { data: currentTxs = [] } = useQuery({
    queryKey: ['transactions-all-months'],
    queryFn: () => transactionsApi.list('1970-01-01', '2099-12-31'),
    enabled: !!editId,
  })

  const editingTx = editId ? currentTxs.find(tx => tx.id === editId) : undefined
  // Novo lançamento ou um avulso já salvo (não recorrente nem parcelado) podem virar recorrentes.
  const canMakeRecurring = !editId || (!!editingTx && !editingTx.isRecurring && !editingTx.installmentGroupId)

  // Lançamento state
  const [selectedKind, setSelectedKind] = useState<TxKind>(initialKind)
  const [amount, setAmount] = useState('')
  const [txDate, setTxDate] = useState(initialDate)
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [installments, setInstallments] = useState(1)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceEnd, setRecurrenceEnd] = useState('')
  const [formError, setFormError] = useState('')

  // Moeda
  const [currency, setCurrency] = useState<'BRL' | 'USD' | 'EUR'>('BRL')
  const [foreignAmount, setForeignAmount] = useState('')
  const [exchangeRate, setExchangeRate] = useState('5.50')
  const [showCurrencyDetails, setShowCurrencyDetails] = useState(false)
  const iofPct = '3.38'
  const spreadPct = '1.5'

  // Recibo
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)

  // Transferência state
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDate, setTransferDate] = useState(initialDate)
  const [transferDescription, setTransferDescription] = useState('')

  // Pagamento de fatura
  const [invoiceCardAccountId, setInvoiceCardAccountId] = useState('')
  const [invoiceFromAccountId, setInvoiceFromAccountId] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(initialDate)

  const { data: cards = [] } = useQuery({
    queryKey: ['cards'],
    queryFn: () => cardsApi.list(),
    enabled: activeTab === 'invoice',
  })
  const payableCards = cards.filter(c => c.accountId)

  useEffect(() => {
    if (editingTx) {
      setAmount(String(editingTx.amount))
      setDescription(editingTx.description || '')
      setSelectedKind(editingTx.kind)
      setTxDate(editingTx.date.slice(0, 10))
      setCategoryId(editingTx.categoryId || '')
      setAccountId(editingTx.accountId || '')
      if (editingTx.totalInstallments) setInstallments(editingTx.totalInstallments)
    }
  }, [editingTx])

  useEffect(() => {
    if (accounts.length >= 2 && !fromAccountId && !toAccountId) {
      setFromAccountId(accounts[0].id)
      setToAccountId(accounts[1].id)
    } else if (accounts.length >= 1 && !fromAccountId) {
      setFromAccountId(accounts[0].id)
    }
  }, [accounts, fromAccountId, toAccountId])

  const createMutation = useMutation({
    mutationFn: (input: CreateInput) => transactionsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
      navigate('/app')
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateInput> }) =>
      transactionsApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
      navigate('/app')
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, scope }: { id: string; scope?: 'following' }) => transactionsApi.remove(id, scope),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
      navigate('/app')
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const invoiceMutation = useMutation({
    mutationFn: () =>
      accountsApi.payCard(invoiceCardAccountId, {
        amount: parseFloat(invoiceAmount),
        date: invoiceDate,
        fromAccountId: invoiceFromAccountId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
      navigate('/app')
    },
    onError: (err: Error) => setFormError(err.message),
  })

  function selectInvoiceCard(accountId: string) {
    setInvoiceCardAccountId(accountId)
    setInvoiceFromAccountId(accountId)
    const card = payableCards.find(c => c.accountId === accountId)
    const used = card ? Math.max(0, card.creditLimit - card.availableLimit) : 0
    setInvoiceAmount(used > 0 ? used.toFixed(2) : '')
  }

  function handleSubmitInvoice(e: FormEvent) {
    e.preventDefault()
    if (!invoiceCardAccountId) {
      setFormError('Selecione o cartão')
      return
    }
    if (!(parseFloat(invoiceAmount) > 0)) {
      setFormError('Informe um valor maior que zero')
      return
    }
    invoiceMutation.mutate()
  }

  const transferMutation = useMutation({
    mutationFn: (input: TransferInput) => accountsApi.transfer(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      navigate('/app')
    },
    onError: (err: Error) => setFormError(err.message),
  })

  function handleForeignAmountChange(val: string) {
    setForeignAmount(val)
    const fAmt = parseFloat(val)
    const rate = parseFloat(exchangeRate)
    if (!isNaN(fAmt) && !isNaN(rate) && fAmt > 0 && rate > 0) {
      const base = fAmt * rate
      const total = base * (1 + parseFloat(iofPct) / 100) * (1 + parseFloat(spreadPct) / 100)
      setAmount(total.toFixed(2))
    }
  }

  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setReceiptFileName(f.name)
      const reader = new FileReader()
      reader.onloadend = () => setReceiptPreview(reader.result as string)
      reader.readAsDataURL(f)
    }
  }

  function handleDescriptionChange(desc: string) {
    setDescription(desc)
    if (!categoryId) {
      const lower = desc.toLowerCase()
      const found = categories.find(c => {
        const cName = c.name.toLowerCase()
        if (cName.includes('transporte') && (lower.includes('uber') || lower.includes('99') || lower.includes('posto') || lower.includes('combustivel'))) return true
        if (cName.includes('aliment') && (lower.includes('ifood') || lower.includes('mercado') || lower.includes('restaurante') || lower.includes('padaria'))) return true
        if (cName.includes('lazer') && (lower.includes('cinema') || lower.includes('bar') || lower.includes('jogo') || lower.includes('show'))) return true
        if (cName.includes('moradia') && (lower.includes('aluguel') || lower.includes('condominio') || lower.includes('luz') || lower.includes('energia') || lower.includes('agua'))) return true
        return false
      })
      if (found) setCategoryId(found.id)
    }
  }

  function handleSubmitTransaction(e: FormEvent) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Informe um valor maior que zero')
      return
    }

    const payload: CreateInput = {
      type: typeForKind(selectedKind),
      kind: selectedKind,
      amount: parsedAmount,
      description: description.trim(),
      date: txDate,
      categoryId: categoryId || undefined,
      accountId: accountId || undefined,
      totalInstallments: selectedKind === 'CREDIT' && installments > 1 && !isRecurring ? installments : undefined,
      isRecurring: canMakeRecurring && isRecurring ? true : undefined,
      recurrenceEndDate: canMakeRecurring && isRecurring && recurrenceEnd ? recurrenceEnd : undefined,
    }

    if (editId) {
      updateMutation.mutate({ id: editId, input: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleSubmitTransfer(e: FormEvent) {
    e.preventDefault()
    if (!fromAccountId || !toAccountId) {
      setFormError('Selecione as contas de origem e destino')
      return
    }
    if (fromAccountId === toAccountId) {
      setFormError('Contas de origem e destino devem ser diferentes')
      return
    }
    const parsedAmount = parseFloat(transferAmount)
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Informe um valor maior que zero')
      return
    }

    transferMutation.mutate({
      fromAccountId,
      toAccountId,
      amount: parsedAmount,
      date: transferDate,
      description: transferDescription.trim() || undefined,
    })
  }

  const filteredCategories = flattenCategories(
    categories.filter(c => c.type === typeForKind(selectedKind))
  )

  const KINDS: Array<{ id: TxKind; label: string; activeColor: string }> = [
    { id: 'INCOME', label: 'Renda', activeColor: '#059669' },
    { id: 'EXPENSE', label: 'Débito', activeColor: '#dc2626' },
    { id: 'CREDIT', label: 'Crédito', activeColor: '#d97706' },
    { id: 'SAVING', label: 'Poupança', activeColor: '#2563eb' },
    { id: 'BUDGET', label: 'Orçamento', activeColor: '#7c3aed' },
  ]

  return (
    <div className="drawer-backdrop" onClick={() => navigate('/app')}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-header-top">
            <div>
              <h2 className="drawer-title">
                {editId ? 'Editar lançamento'
                  : activeTab === 'tx' ? 'Novo lançamento'
                  : activeTab === 'transfer' ? 'Transferência' : 'Pagar fatura'}
              </h2>
              <span className="drawer-subtitle">
                {(activeTab === 'tx' ? txDate : activeTab === 'transfer' ? transferDate : invoiceDate)
                  ?.split('-').reverse().join('/')}
              </span>
            </div>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={() => navigate('/app')}
              aria-label="Fechar"
              title="Fechar (ESC)"
            >
              ✕
            </button>
          </div>

          {!editId && (
            <div className="drawer-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'tx'}
                className={`drawer-tab ${activeTab === 'tx' ? 'active' : ''}`}
                onClick={() => { setActiveTab('tx'); setFormError('') }}
              >
                Lançamento
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'transfer'}
                className={`drawer-tab ${activeTab === 'transfer' ? 'active' : ''}`}
                onClick={() => { setActiveTab('transfer'); setFormError('') }}
              >
                Transferência
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'invoice'}
                className={`drawer-tab ${activeTab === 'invoice' ? 'active' : ''}`}
                onClick={() => { setActiveTab('invoice'); setFormError('') }}
              >
                Pagar fatura
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Lançamento */}
        {activeTab === 'tx' && (
          <form
            onSubmit={handleSubmitTransaction}
            style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
          >
            <div className="drawer-body">
              {formError && (
                <div className="drawer-error">{formError}</div>
              )}

              {/* Kind selector */}
              <div className="drawer-field">
                <label className="drawer-label">Tipo</label>
                <div className="drawer-kind-grid">
                  {KINDS.map(k => {
                    const isSelected = selectedKind === k.id
                    return (
                      <button
                        key={k.id}
                        type="button"
                        className={`drawer-kind-btn${isSelected ? ' active' : ''}`}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedKind(k.id)}
                      >
                        <span className="drawer-kind-dot" style={{ background: k.activeColor }} aria-hidden="true" />
                        {k.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Amount & Date side-by-side */}
              <div className="drawer-row">
                <div className="drawer-field">
                  <label className="drawer-label">Valor</label>
                  <div className="drawer-amount-box">
                    <span className="drawer-amount-sym">
                      {currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : '€'}
                    </span>
                    <MoneyInput
                      placeholder="0,00"
                      value={currency === 'BRL' ? amount : foreignAmount}
                      onChange={v => currency === 'BRL' ? setAmount(v) : handleForeignAmountChange(v)}
                      className="drawer-amount-field"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrencyDetails(v => !v)}
                      className="drawer-currency-toggle"
                    >
                      {currency} ▾
                    </button>
                  </div>
                </div>

                <div className="drawer-field">
                  <label className="drawer-label">Data</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={e => setTxDate(e.target.value)}
                    className="drawer-input"
                    required
                  />
                </div>
              </div>

              {/* Currency details drawer (if foreign) */}
              {showCurrencyDetails && (
                <div className="drawer-currency-row">
                  <select
                    value={currency}
                    onChange={e => {
                      setCurrency(e.target.value as any)
                      if (e.target.value === 'BRL') setShowCurrencyDetails(false)
                    }}
                    className="drawer-select drawer-select-sm"
                  >
                    <option value="BRL">Real (BRL)</option>
                    <option value="USD">Dólar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>

                  {currency !== 'BRL' && (
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flex: 1 }}>
                      <span>Cotação</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={exchangeRate}
                        onChange={e => {
                          setExchangeRate(e.target.value)
                          handleForeignAmountChange(foreignAmount)
                        }}
                        className="drawer-input drawer-input-sm"
                      />
                      <span className="drawer-currency-result">= {formatMoney(parseFloat(amount) || 0)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Descrição */}
              <div className="drawer-field">
                <label className="drawer-label">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel, Supermercado, Salário..."
                  value={description}
                  onChange={e => handleDescriptionChange(e.target.value)}
                  maxLength={255}
                  className="drawer-input"
                />
              </div>

              {/* Categoria */}
              <div className="drawer-field">
                <label className="drawer-label">Categoria</label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="drawer-select"
                >
                  <option value="">Sem categoria</option>
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.indent ? '  ↳ ' : ''}{c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conta bancária; no crédito, a compra vai para o cartão dessa conta */}
              <div className="drawer-field">
                <label className="drawer-label">
                  {selectedKind === 'CREDIT' ? 'Cartão de crédito da conta' : 'Conta bancária'}
                </label>
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="drawer-select"
                  required={selectedKind === 'CREDIT'}
                >
                  <option value="">{selectedKind === 'CREDIT' ? 'Selecione a conta' : 'Sem conta vinculada'}</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
                {selectedKind === 'CREDIT' && accounts.length === 0 && (
                  <span className="drawer-hint">
                    Nenhuma conta cadastrada. <Link to="/app/accounts">Cadastre em Contas</Link>.
                  </span>
                )}
              </div>

              {/* Recorrência mensal */}
              {editingTx?.isRecurring && (
                <span className="drawer-hint">Faz parte de uma recorrência mensal. As alterações valem só para este mês.</span>
              )}
              {canMakeRecurring && (
                <div className="drawer-field drawer-recurring">
                  <label className="drawer-check">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={e => setIsRecurring(e.target.checked)}
                    />
                    <span>Repetir todo mês</span>
                  </label>
                  {isRecurring && (
                    <div className="drawer-recurring-end">
                      <label className="drawer-label">Até <span className="drawer-optional">opcional</span></label>
                      <input
                        type="date"
                        value={recurrenceEnd}
                        min={txDate}
                        onChange={e => setRecurrenceEnd(e.target.value)}
                        className="drawer-input"
                      />
                      <span className="drawer-hint">
                        {recurrenceEnd
                          ? 'Um lançamento por mês, no mesmo dia, até essa data.'
                          : 'Sem data final, cria os próximos 12 meses.'}
                        {editId && ' Este lançamento vira o primeiro da série.'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Parcelamento para cartão */}
              {selectedKind === 'CREDIT' && !editId && !isRecurring && (
                <div className="drawer-field">
                  <label className="drawer-label">Parcelamento</label>
                  <select
                    value={installments}
                    onChange={e => setInstallments(parseInt(e.target.value, 10))}
                    className="drawer-select"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(n => {
                      const amt = parseFloat(amount) || 0
                      const parcelVal = formatMoney(amt > 0 ? amt / n : 0)
                      return (
                        <option key={n} value={n}>
                          {n === 1 ? '1x à vista' : `${n}x de ${parcelVal}`}
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              {/* Recibo inline compacto */}
              <div className="drawer-attach">
                <label>
                  <span>{receiptFileName ? receiptFileName : '+ Anexar comprovante'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleReceiptChange}
                    style={{ display: 'none' }}
                  />
                </label>

                {receiptPreview && (
                  <span className="drawer-attach-ok">Anexado</span>
                )}
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="drawer-footer">
              {editId ? (
                <div className="drawer-footer-actions">
                  <button
                    type="button"
                    className="drawer-btn-delete"
                    onClick={() => {
                      if (window.confirm('Deseja realmente excluir este lançamento?')) {
                        deleteMutation.mutate({ id: editId })
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
                  </button>
                  {editingTx?.isRecurring && (
                    <button
                      type="button"
                      className="drawer-btn-delete"
                      onClick={() => {
                        if (window.confirm('Excluir este lançamento e todos os próximos desta recorrência?')) {
                          deleteMutation.mutate({ id: editId, scope: 'following' })
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      Excluir esta e as próximas
                    </button>
                  )}
                </div>
              ) : (
                <div />
              )}

              <div className="drawer-footer-actions">
                <button
                  type="button"
                  className="drawer-btn-cancel"
                  onClick={() => navigate('/app')}
                >
                  {t.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="drawer-btn-submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Salvando...'
                    : editId
                    ? 'Salvar'
                    : 'Salvar'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 3: Pagar fatura */}
        {activeTab === 'invoice' && (
          <form
            onSubmit={handleSubmitInvoice}
            style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
          >
            <div className="drawer-body">
              {formError && <div className="drawer-error">{formError}</div>}

              <div className="drawer-field">
                <label className="drawer-label">Cartão</label>
                <select
                  value={invoiceCardAccountId}
                  onChange={e => selectInvoiceCard(e.target.value)}
                  className="drawer-select"
                  required
                >
                  <option value="">Selecione o cartão</option>
                  {payableCards.map(c => (
                    <option key={c.id} value={c.accountId!}>
                      {c.name} · usado {formatMoney(Math.max(0, c.creditLimit - c.availableLimit))}
                    </option>
                  ))}
                </select>
                {payableCards.length === 0 && (
                  <span className="drawer-hint">Nenhum cartão em uso ainda.</span>
                )}
              </div>

              <div className="drawer-row">
                <div className="drawer-field">
                  <label className="drawer-label">Valor pago</label>
                  <div className="drawer-amount-box">
                    <span className="drawer-amount-sym">R$</span>
                    <MoneyInput
                      placeholder="0,00"
                      value={invoiceAmount}
                      onChange={setInvoiceAmount}
                      className="drawer-amount-field"
                      required
                    />
                  </div>
                </div>
                <div className="drawer-field">
                  <label className="drawer-label">Data</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="drawer-input"
                    required
                  />
                </div>
              </div>

              <div className="drawer-field">
                <label className="drawer-label">Pagar com a conta</label>
                <select
                  value={invoiceFromAccountId}
                  onChange={e => setInvoiceFromAccountId(e.target.value)}
                  className="drawer-select"
                  required
                >
                  <option value="">Selecione a conta</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                <span className="drawer-hint">
                  O valor sai do saldo dessa conta e volta como limite do cartão.
                </span>
              </div>
            </div>

            <div className="drawer-footer">
              <div />
              <div className="drawer-footer-actions">
                <button type="button" className="drawer-btn-cancel" onClick={() => navigate('/app')}>
                  {t.modal.cancel}
                </button>
                <button type="submit" className="drawer-btn-submit" disabled={invoiceMutation.isPending}>
                  {invoiceMutation.isPending ? 'Pagando...' : 'Registrar pagamento'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Transferência */}
        {activeTab === 'transfer' && (
          <form
            onSubmit={handleSubmitTransfer}
            style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
          >
            <div className="drawer-body">
              {formError && (
                <div className="drawer-error">{formError}</div>
              )}

              {/* Origem & Destino */}
              <div className="drawer-field">
                <label className="drawer-label">De</label>
                <select
                  value={fromAccountId}
                  onChange={e => setFromAccountId(e.target.value)}
                  className="drawer-select"
                  required
                >
                  <option value="">Selecione a conta de origem</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="drawer-field">
                <label className="drawer-label">Para</label>
                <select
                  value={toAccountId}
                  onChange={e => setToAccountId(e.target.value)}
                  className="drawer-select"
                  required
                >
                  <option value="">Selecione a conta de destino</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} disabled={acc.id === fromAccountId}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor & Data */}
              <div className="drawer-row">
                <div className="drawer-field">
                  <label className="drawer-label">Valor</label>
                  <div className="drawer-amount-box">
                    <span className="drawer-amount-sym">R$</span>
                    <MoneyInput
                      placeholder="0,00"
                      value={transferAmount}
                      onChange={setTransferAmount}
                      className="drawer-amount-field"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="drawer-field">
                  <label className="drawer-label">Data</label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={e => setTransferDate(e.target.value)}
                    className="drawer-input"
                    required
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="drawer-field">
                <label className="drawer-label">Descrição <span className="drawer-optional">opcional</span></label>
                <input
                  type="text"
                  placeholder="Ex: Reserva, Pix para poupança..."
                  value={transferDescription}
                  onChange={e => setTransferDescription(e.target.value)}
                  className="drawer-input"
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="drawer-footer">
              <div />
              <div className="drawer-footer-actions">
                <button
                  type="button"
                  className="drawer-btn-cancel"
                  onClick={() => navigate('/app')}
                >
                  {t.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="drawer-btn-submit"
                  disabled={transferMutation.isPending}
                >
                  {transferMutation.isPending ? 'Transferindo...' : 'Transferir'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
