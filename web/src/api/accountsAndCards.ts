import { req } from './client'
import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  TransferInput,
  TransferResponse,
  CreditCard,
  CreateCardInput,
  UpdateCardInput,
  CardInvoice,
  PayInvoiceInput,
  PayInvoiceResponse,
  Transaction,
} from '../types'

export const accountsApi = {
  list: () => req<Account[]>('/api/v1/accounts'),
  create: (input: CreateAccountInput) =>
    req<Account>('/api/v1/accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateAccountInput) =>
    req<Account>(`/api/v1/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    req<void>(`/api/v1/accounts/${id}`, {
      method: 'DELETE',
    }),
  transfer: (input: TransferInput) =>
    req<TransferResponse>('/api/v1/transfers', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
}

export const cardsApi = {
  list: () => req<CreditCard[]>('/api/v1/cards'),
  create: (input: CreateCardInput) =>
    req<CreditCard>('/api/v1/cards', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateCardInput) =>
    req<CreditCard>(`/api/v1/cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    req<void>(`/api/v1/cards/${id}`, {
      method: 'DELETE',
    }),
  listInvoices: (cardId: string, months = 6) =>
    req<CardInvoice[]>(`/api/v1/cards/${cardId}/invoices?months=${months}`),
  listInvoiceTransactions: (cardId: string, month: string) =>
    req<Transaction[]>(`/api/v1/cards/${cardId}/invoices/${month}`),
  payInvoice: (cardId: string, month: string, input?: PayInvoiceInput) =>
    req<PayInvoiceResponse>(`/api/v1/cards/${cardId}/invoices/${month}/pay`, {
      method: 'POST',
      body: JSON.stringify(input ?? {}),
    }),
}
