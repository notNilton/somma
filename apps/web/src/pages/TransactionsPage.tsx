import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi, categoriesApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { groupByDay, computeSummary } from '../lib/groupByDay'
import { flattenCategories } from '../lib/categories'
import DayGroupComponent from '../components/DayGroup'
import SummaryCard from '../components/SummaryCard'
import TransactionModal from '../components/TransactionModal'
import type { Transaction, CreateInput } from '../types'

interface ModalState {
  open: boolean
  date: string
  type: string
}

export default function TransactionsPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const txKey = ['transactions', year, month]

  const { data: txs = [], error: txError } = useQuery({
    queryKey: txKey,
    queryFn: () => transactionsApi.list(from, to),
  })

  const { data: rawCats = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    staleTime: Infinity,
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
          type: input.type as Transaction['type'],
          status: input.status as Transaction['status'],
          channel: input.channel as Transaction['channel'],
          paymentMethod: input.paymentMethod as Transaction['paymentMethod'],
          amount: input.amount,
          description: input.description,
          date: input.date + 'T00:00:00Z',
          isRecurring: false,
        },
      ])
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(txKey, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: txKey }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: txKey })
      const previous = qc.getQueryData<Transaction[]>(txKey)
      qc.setQueryData<Transaction[]>(txKey, (old = []) =>
        old.filter((t) => t.id !== id),
      )
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(txKey, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: txKey }),
  })

  const [modal, setModal] = useState<ModalState>({ open: false, date: '', type: '' })
  const dialogRef = useRef<HTMLDialogElement>(null)

  function openModal(date: string, type: string) {
    setModal({ open: true, date, type })
    dialogRef.current?.showModal()
  }

  function closeModal() {
    dialogRef.current?.close()
    setModal((m) => ({ ...m, open: false }))
  }

  function handleCreate(input: CreateInput) {
    closeModal()
    createMutation.mutate(input)
  }

  const groups = groupByDay(txs, now)
  const summary = computeSummary(txs)
  const categories = flattenCategories(rawCats)

  return (
    <>
      <div className="page-layout">
        <div className="tx-column">
          {groups.map((g) => (
            <DayGroupComponent
              key={g.dateStr}
              group={g}
              onAdd={openModal}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
        <div className="summary-column">
          <SummaryCard summary={summary} />
        </div>
      </div>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeModal()
        }}
      >
        {modal.open && (
          <TransactionModal
            date={modal.date}
            type={modal.type}
            categories={categories}
            onClose={closeModal}
            onSubmit={handleCreate}
            error={createMutation.error?.message}
          />
        )}
      </dialog>
    </>
  )
}
