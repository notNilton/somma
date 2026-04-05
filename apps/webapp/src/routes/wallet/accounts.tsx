import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/wallet/accounts')({
  component: () => <Outlet />,
});
