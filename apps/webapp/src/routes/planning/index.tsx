import { createFileRoute } from '@tanstack/react-router';
import { ChartColumn, LineChart, PiggyBank, PieChart, Target, TrendingUp } from 'lucide-react';
import PlanningShell from '../../components/PlanningShell';
import SectionHub from '../../components/SectionHub';

export const Route = createFileRoute('/planning/')({
  component: PlanejamentoHubPage,
});

function PlanejamentoHubPage() {
  return (
    <PlanningShell>
      <SectionHub
        title="Planejamento"
        description="Acompanhamento de metas, orcamentos e leitura dos indicadores do periodo."
        items={[
          {
            title: 'Planejamentos',
            description: 'Objetivos como viagem, reforma ou compras grandes com itens e aportes.',
            to: '/planning/plans',
            icon: PiggyBank,
            eyebrow: 'Objetivos',
          },
          {
            title: 'Orcamentos',
            description: 'Metas mensais por categoria com status de uso e alertas de excesso.',
            to: '/planning/budgets',
            icon: Target,
            eyebrow: 'Controle',
          },
          {
            title: 'Relatorios',
            description: 'Indicadores consolidados para entender categorias e evolucao recente.',
            to: '/planning/reports',
            icon: LineChart,
            eyebrow: 'Analise',
          },
        ]}
      />
    </PlanningShell>
  );
}
