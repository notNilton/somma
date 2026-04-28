import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/wallet/vehicles/')({
  beforeLoad: () => {
    throw redirect({ to: '/wallet/accounts' });
  },
});
