import { createFileRoute } from '@tanstack/react-router';
import { CrudTransactionsPage } from '../activity/transactions/crud-transactions';

export const Route = createFileRoute('/transactions/crud-transactions')({
  validateSearch: (search: Record<string, unknown>) => ({
    transactionId: typeof search.transactionId === 'string' ? search.transactionId : undefined,
    vehicleId: typeof search.vehicleId === 'string' ? search.vehicleId : undefined,
    mode:
      search.mode === 'expense' ||
      search.mode === 'income' ||
      search.mode === 'fuel'
        ? search.mode
        : undefined,
  }),
  component: CrudTransactionsPage,
});
