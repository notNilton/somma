import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cardsApi } from '../api'
import type { Account, CreditCard } from '../types'

interface Props {
  card: CreditCard
  accounts: Account[]
  onClose: () => void
}

export default function CardInvoicesModal({ card, accounts, onClose }: Props) {
  const qc = useQueryClient()
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [payAccountModalMonth, setPayAccountModalMonth] = useState<string | null>(null)
  const [payAccountId, setPayAccountId] = useState(accounts[0]?.id ?? '')
  const [actionError, setActionError] = useState('')

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['card-invoices', card.id],
    queryFn: () => cardsApi.listInvoices(card.id, 6),
  })

  const { data: invoiceTxs = [], isLoading: txsLoading } = useQuery({
    queryKey: ['card-invoice-txs', card.id, selectedMonth],
    queryFn: () => (selectedMonth ? cardsApi.listInvoiceTransactions(card.id, selectedMonth) : Promise.resolve([])),
    enabled: !!selectedMonth,
  })

  const payMutation = useMutation({
    mutationFn: ({ month, accountId }: { month: string; accountId?: string }) =>
      cardsApi.payInvoice(card.id, month, { accountId: accountId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['card-invoices', card.id] })
      qc.invalidateQueries({ queryKey: ['cards'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      setPayAccountModalMonth(null)
      setActionError('')
    },
    onError: (err: Error) => {
      setActionError(err.message || 'Erro ao pagar fatura')
    },
  })

  return (
    <div className="budget-modal-backdrop" onClick={onClose}>
      <div
        className="budget-modal invoices-modal"
        style={{ maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="budget-modal-header">
          <div>
            <div className="budget-modal-kicker">Ciclo de Cartão de Crédito</div>
            <div className="budget-modal-title">Faturas — {card.name}</div>
            <div className="budget-modal-subtitle">
              Limite: R$ {card.creditLimit.toFixed(2)} | Disponível: R$ {card.availableLimit.toFixed(2)} | Fecha dia {card.closingDay}, Vence dia {card.dueDay}
            </div>
          </div>
          <button type="button" className="budget-modal-close" onClick={onClose}>×</button>
        </div>

        {actionError && <div className="budget-modal-error">{actionError}</div>}

        {invoicesLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando faturas...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhum lançamento ou fatura para este cartão ainda.
          </div>
        ) : (
          <div className="invoices-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {invoices.map(inv => {
              const isOpen = inv.status === 'OPEN'
              const isPaid = inv.status === 'PAID'
              const isClosed = inv.status === 'CLOSED'
              const isViewingTxs = selectedMonth === inv.referenceMonth

              return (
                <div
                  key={inv.referenceMonth}
                  className={`invoice-item-card ${isPaid ? 'invoice-paid' : isOpen ? 'invoice-open' : 'invoice-closed'}`}
                  style={{
                    padding: '0.85rem 1rem',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '8px',
                    background: 'var(--card-bg, #fff)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '1.05rem' }}>Fatura {inv.referenceMonth}</strong>
                        <span
                          className={`pill ${isPaid ? 'pill-positive' : isClosed ? 'pill-warning' : 'pill-neutral'}`}
                          style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
                        >
                          {isPaid ? '✓ Paga' : isClosed ? 'Fechada' : 'Aberta'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Corte: {inv.closingDate} • Vencimento: {inv.dueDate} • {inv.transactionCount} lançamento(s)
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 600 }}>
                        R$ {inv.total.toFixed(2)}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn-action-sm btn-action-ghost"
                          onClick={() => setSelectedMonth(isViewingTxs ? null : inv.referenceMonth)}
                        >
                          {isViewingTxs ? 'Fechar itens ▴' : 'Ver itens ▾'}
                        </button>

                        {!isPaid && inv.total > 0 && (
                          <button
                            type="button"
                            className="btn-action-sm btn-action-ok"
                            onClick={() => setPayAccountModalMonth(inv.referenceMonth)}
                          >
                            Pagar Fatura
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Confirmação de Pagamento */}
                  {payAccountModalMonth === inv.referenceMonth && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
                        Confirmar pagamento de R$ {inv.total.toFixed(2)} da fatura {inv.referenceMonth}:
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          className="budget-input"
                          style={{ flex: 1, height: '36px' }}
                          value={payAccountId}
                          onChange={e => setPayAccountId(e.target.value)}
                        >
                          <option value="">— Sem débito em conta —</option>
                          {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              Debitar de: {acc.name} (Saldo: R$ {acc.balance.toFixed(2)})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-action-sm btn-action-ok"
                          disabled={payMutation.isPending}
                          onClick={() => payMutation.mutate({ month: inv.referenceMonth, accountId: payAccountId })}
                        >
                          {payMutation.isPending ? 'Confirmando...' : 'Confirmar'}
                        </button>
                        <button
                          type="button"
                          className="btn-action-sm btn-action-ghost"
                          onClick={() => setPayAccountModalMonth(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista de transações da fatura selecionada */}
                  {isViewingTxs && (
                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '0.75rem' }}>
                      {txsLoading ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Carregando lançamentos...</div>
                      ) : invoiceTxs.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhum lançamento nesta fatura.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {invoiceTxs.map(t => (
                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                              <span>
                                {t.date.slice(0, 10)} — {t.description}
                                {t.totalInstallments && t.totalInstallments > 1 && (
                                  <span style={{ marginLeft: '0.3rem', color: 'var(--text-muted)' }}>
                                    ({t.installmentNumber ?? 1}/{t.totalInstallments})
                                  </span>
                                )}
                              </span>
                              <strong>R$ {t.amount.toFixed(2)}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="budget-modal-actions" style={{ marginTop: '1.5rem' }}>
          <button type="button" onClick={onClose} className="budget-modal-btn budget-modal-btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
