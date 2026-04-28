import { createFileRoute } from '@tanstack/react-router';
import { TransactionsPage } from '../activity/transactions/index';

export const Route = createFileRoute('/transactions/')({
  component: TransactionsPage,
});
