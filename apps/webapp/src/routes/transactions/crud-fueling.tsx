import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/transactions/crud-fueling')({
  validateSearch: (search: Record<string, unknown>) => ({
    transactionId: typeof search.transactionId === 'string' ? search.transactionId : undefined,
    vehicleId: typeof search.vehicleId === 'string' ? search.vehicleId : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/transactions/crud-transactions',
      search: {
        transactionId: search.transactionId,
        vehicleId: search.vehicleId,
        mode: 'fuel',
      },
    });
  },
});
