import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/planning/reports')({
  component: () => <Outlet />,
});
