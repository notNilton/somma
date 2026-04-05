import { createFileRoute } from '@tanstack/react-router';
import { Banknote, CarFront, CreditCard, Landmark, Wallet } from 'lucide-react';
import WalletShell from '../../components/WalletShell';
import SectionHub from '../../components/SectionHub';

export const Route = createFileRoute('/wallet/')({
  component: CarteiraHubPage,
});

function CarteiraHubPage() {
  return (
    <WalletShell>
      <SectionHub
        title="Carteira"
        description="Suas fontes de saldo, meios de pagamento e ativos operacionais em um mesmo lugar."
        items={[
          {
            title: 'Contas',
            description: 'Saldo, tipos de conta e administracao da estrutura financeira base.',
            to: '/wallet/accounts',
            icon: Wallet,
            eyebrow: 'Base financeira',
          },
          {
            title: 'Cartoes',
            description: 'Gestao de limites, faturas e acompanhamento dos gastos no credito.',
            to: '/wallet/cards',
            icon: CreditCard,
            eyebrow: 'Meios de pagamento',
          },
          {
            title: 'Veiculos',
            description: 'Abastecimentos, manutencoes e custos recorrentes da sua frota.',
            to: '/wallet/vehicles',
            icon: CarFront,
            eyebrow: 'Patrimonio operacional',
          },
        ]}
      />
    </WalletShell>
  );
}
