import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { api } from '../lib/api';
import type {
  Account,
  Category,
  Transaction,
  TransactionModalProps,
  Vehicle,
} from './TransactionModal';

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

type BaseClassification = 'COMMON' | 'MAINTENANCE';
type Classification = BaseClassification | 'TRANSFER';

type TransactionModalTab = 'expense' | 'income' | 'bill_payment';

type ExpenseKind = 'CREDIT' | 'DEBIT' | 'PIX' | 'BANK' | 'CASH';

function expenseKindToChannel(kind: ExpenseKind) {
  if (kind === 'CREDIT') return 'CARD_CREDIT';
  if (kind === 'DEBIT') return 'CARD_DEBIT';
  if (kind === 'PIX') return 'PIX';
  return 'BANK';
}

function inferClassificationFromCategory({
  isExpense,
  filteredCategories,
  categoryId,
  currentClassification,
}: {
  isExpense: boolean;
  filteredCategories: Category[];
  categoryId: string;
  currentClassification: BaseClassification;
}): BaseClassification {
  if (!isExpense || filteredCategories.length === 0) return 'COMMON';

  const currentCat = filteredCategories.find((c) => c.id === categoryId);
  if (!currentCat) return 'COMMON';

  const norm = normalize(currentCat.name);

  if (norm === 'veiculo-manutencao' || norm.includes('manutencao')) return 'MAINTENANCE';

  return currentClassification !== 'COMMON' ? 'COMMON' : currentClassification;
}

function buildTransactionPayload({
  isEditing,
  initialData,
  classification,
  expenseKind,
  amountInCents,
  date,
  isExpense,
  isRecurring,
  totalInstallments,
  hasPaidInstallments,
  paidInstallments,
  categoryId,
  accountId,
  vehicleId,
  currentKm,
  description,
}: {
  isEditing: boolean;
  initialData?: Transaction | null;
  classification: Classification;
  expenseKind: ExpenseKind;
  amountInCents: number;
  date: string;
  isExpense: boolean;
  isRecurring: boolean;
  totalInstallments: number;
  hasPaidInstallments: boolean;
  paidInstallments: number;
  categoryId: string;
  accountId: string;
  vehicleId: string;
  currentKm: number;
  description: string;
}) {
  const actualAmount = amountInCents / 100;
  const channel = expenseKindToChannel(expenseKind);

  const payload = {
    description:
      classification === 'MAINTENANCE'
          ? 'Manutenção veicular'
          : description,
    amount: actualAmount,
    date,
    type: isExpense ? 'EXPENSE' : 'INCOME',
    isRecurring: totalInstallments > 1 ? false : isRecurring,
    categoryId: categoryId || undefined,
    accountId,
    channel,
    classification,
    ...(!isEditing && totalInstallments > 1 && { totalInstallments }),
    ...(!isEditing && totalInstallments > 1 && hasPaidInstallments && { paidInstallments }),
    ...(classification === 'MAINTENANCE' && {
      vehicleId,
      currentKm,
      maintenanceType: 'OTHER',
    }),
  };

  return {
    payload,
    transactionId: isEditing && initialData ? initialData.id : undefined,
  };
}

function useTransactionModalQueries({
  isOpen,
  isExpense,
}: {
  isOpen: boolean;
  isExpense: boolean;
}) {
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/v1/categories'),
    staleTime: 1000 * 60 * 5,
    enabled: isOpen,
  });

  const filteredCategories = categories.filter(
    (cat) => cat.type === (isExpense ? 'EXPENSE' : 'INCOME'),
  );

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/api/v1/accounts'),
    staleTime: 1000 * 60 * 5,
    enabled: isOpen,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<Vehicle[]>('/api/v1/vehicles'),
    staleTime: 1000 * 60 * 5,
    enabled: isOpen,
  });

  return { filteredCategories, accounts, vehicles };
}

function useTransactionModalFormState({
  initialData,
  defaultVehicleId,
  defaultClassification,
  isOpen,
}: {
  initialData?: Transaction | null;
  defaultVehicleId?: string;
  defaultClassification?: Classification;
  isOpen: boolean;
}) {
  const [isExpense, setIsExpense] = useState(initialData ? initialData.type === 'EXPENSE' : true);
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring ?? false);
  const [date, setDate] = useState(() => {
    if (initialData?.date) return new Date(initialData.date).toISOString().split('T')[0];
    const today = new Date();
    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
  });
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [amount, setAmount] = useState(
    initialData ? Math.floor(Math.abs(Number(initialData.amount)) * 100).toString() : '0',
  );
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? '');
  const [accountId, setAccountId] = useState(
    initialData?.accountId ?? initialData?.account?.id ?? '',
  );
  const [totalInstallments, setTotalInstallments] = useState(1);
  const [hasPaidInstallments, setHasPaidInstallments] = useState(false);
  const [paidInstallments, setPaidInstallments] = useState(1);
  const [classification, setClassification] = useState<Classification>(
    (initialData?.classification as Classification | undefined) ??
      defaultClassification ??
      'COMMON',
  );
  const [vehicleId, setVehicleId] = useState(
    initialData?.vehicleId ?? defaultVehicleId ?? '',
  );
  const [currentKm, setCurrentKm] = useState(
    initialData?.currentKm
        ? Math.floor(Number(initialData.currentKm)).toString()
        : '0',
  );

  useEffect(() => {
    if (!isOpen || initialData) return;
    setTotalInstallments(1);
  }, [isOpen, initialData]);

  useEffect(() => {
    if (totalInstallments > 1) setIsRecurring(false);
  }, [totalInstallments]);

  useEffect(() => {
    if (totalInstallments <= 1) {
      setHasPaidInstallments(false);
      setPaidInstallments(1);
      return;
    }
    setPaidInstallments((prev) => Math.min(prev, totalInstallments));
  }, [totalInstallments]);

  useEffect(() => {
    if (!hasPaidInstallments) setPaidInstallments(1);
  }, [hasPaidInstallments]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setAmount(e.target.value.replace(/\D/g, ''));
  const handleKmChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setCurrentKm(e.target.value.replace(/\D/g, ''));

  const formattedAmount = (Number(amount) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const amountValue = Number(amount) / 100;
  const installmentValue = totalInstallments > 1 ? amountValue / totalInstallments : amountValue;
  const formattedInstallment = installmentValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const formattedKm = Number(currentKm).toLocaleString('pt-BR');

  return {
    isExpense,
    setIsExpense,
    isRecurring,
    setIsRecurring,
    date,
    setDate,
    description,
    setDescription,
    amount,
    setAmount,
    categoryId,
    setCategoryId,
    accountId,
    setAccountId,
    totalInstallments,
    setTotalInstallments,
    hasPaidInstallments,
    setHasPaidInstallments,
    paidInstallments,
    setPaidInstallments,
    classification,
    setClassification,
    vehicleId,
    setVehicleId,
    currentKm,
    setCurrentKm,
    handleAmountChange,
    handleKmChange,
    formattedAmount,
    amountValue,
    installmentValue,
    formattedInstallment,
    formattedKm,
  };
}

export function useTransactionModalModel({
  isOpen,
  onClose,
  onSuccess,
  mode = 'create',
  initialData,
  defaultVehicleId,
  defaultClassification,
}: TransactionModalProps) {
  const isEditing = mode === 'edit';

  const [activeTab, setActiveTab] = useState<TransactionModalTab>(() => {
    if (initialData?.classification === 'TRANSFER') return 'bill_payment';
    if (initialData?.type === 'INCOME') return 'income';
    return 'expense';
  });

  const [expenseKind, setExpenseKind] = useState<ExpenseKind>(() => {
    const channel = initialData?.channel;
    if (channel === 'CARD_CREDIT') return 'CREDIT';
    if (channel === 'CARD_DEBIT') return 'DEBIT';
    if (channel === 'PIX') return 'PIX';
    return 'BANK';
  });

  const form = useTransactionModalFormState({
    initialData,
    defaultVehicleId,
    defaultClassification: defaultClassification as Classification | undefined,
    isOpen,
  });

  const {
    isExpense,
    setIsExpense,
    isRecurring,
    setIsRecurring,
    date,
    setDate,
    description,
    setDescription,
    amount,
    categoryId,
    setCategoryId,
    accountId,
    setAccountId,
    totalInstallments,
    setTotalInstallments,
    hasPaidInstallments,
    setHasPaidInstallments,
    paidInstallments,
    setPaidInstallments,
    classification,
    setClassification,
    vehicleId,
    setVehicleId,
    currentKm,
    handleKmChange,
    handleAmountChange,
    formattedAmount,
    installmentValue,
    formattedInstallment,
    formattedKm,
  } = form;

  const { filteredCategories, accounts, vehicles } =
    useTransactionModalQueries({ isOpen, isExpense });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'bill_payment') {
      setIsExpense(true);
      setIsRecurring(false);
      setTotalInstallments(1);
      setHasPaidInstallments(false);
      setPaidInstallments(1);
      setCategoryId('');
      setClassification('TRANSFER');
      setDescription((prev) => (prev.trim().length ? prev : 'Pagamento de fatura'));
      return;
    }
    setIsExpense(activeTab === 'expense');
    setTotalInstallments(1);
    setIsRecurring(false);
    setHasPaidInstallments(false);
    setPaidInstallments(1);
    setClassification((prev) =>
      prev === 'TRANSFER' ? ((defaultClassification ?? 'COMMON') as BaseClassification) : prev,
    );
  }, [
    activeTab,
    setIsExpense,
    setIsRecurring,
    setHasPaidInstallments,
    setPaidInstallments,
    setCategoryId,
    setClassification,
    setDescription,
    defaultClassification,
  ]);

  const prevCategoryIdRef = React.useRef(categoryId);

  useEffect(() => {
    if (prevCategoryIdRef.current === categoryId) return;
    prevCategoryIdRef.current = categoryId;

    const nextClassification = inferClassificationFromCategory({
      isExpense,
      filteredCategories,
      categoryId,
      currentClassification:
        classification === 'TRANSFER' ? 'COMMON' : (classification as BaseClassification),
    });

    setClassification(nextClassification);
  }, [isExpense, filteredCategories, categoryId]);

  const isVehicleCategory = React.useMemo(() => {
    const c = filteredCategories.find((cat) => cat.id === categoryId);
    if (!c) return false;
    const n = normalize(c.name);
    return n === 'veiculo' || n === 'mobilidade';
  }, [filteredCategories, categoryId]);

  const isMaintenance = classification === 'MAINTENANCE';

  const isSubmitDisabled = Number(amount) <= 0 || !date || !accountId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { payload, transactionId } = buildTransactionPayload({
        isEditing,
        initialData,
        classification: classification as Classification,
        expenseKind,
        amountInCents: Number(amount),
        date,
        isExpense,
        isRecurring,
        totalInstallments,
        hasPaidInstallments,
        paidInstallments,
        categoryId,
        accountId,
        vehicleId,
        currentKm: Number(currentKm),
        description,
      } as any);

      if (isEditing && transactionId) {
        await api.patch(`/api/v1/transactions/${transactionId}`, payload);
      } else {
        await api.post('/api/v1/transactions', payload);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar transação.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isEditing,
    isMaintenance,
    activeTab,
    setActiveTab,
    expenseKind,
    setExpenseKind,
    isExpense,
    setIsExpense,
    isRecurring,
    setIsRecurring,
    date,
    setDate,
    description,
    setDescription,
    amount,
    handleAmountChange,
    categoryId,
    setCategoryId,
    accountId,
    setAccountId,
    totalInstallments,
    setTotalInstallments,
    hasPaidInstallments,
    setHasPaidInstallments,
    paidInstallments,
    setPaidInstallments,
    classification,
    setClassification,
    vehicleId,
    setVehicleId,
    currentKm,
    handleKmChange,
    formattedAmount,
    installmentValue,
    formattedInstallment,
    formattedKm,
    isVehicleCategory,
    filteredCategories,
    accounts,
    vehicles,
    isLoading,
    isSubmitDisabled,
    error,
    handleSubmit,
  };
}
