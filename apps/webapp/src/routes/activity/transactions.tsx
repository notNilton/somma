import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/activity/transactions')({
  component: () => <Outlet />,
});
