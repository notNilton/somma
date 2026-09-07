import type { Release } from "@/types/releases";

export const releasesService = {
  async getReleases(): Promise<Release[]> {
    return RELEASES;
  },
};

const RELEASES: Release[] = [
  {
    version: "1.0.54",
    date: "2026-07-03",
    changes: [
      "Versão do app exibida no perfil e no menu lateral",
      "Verificação automática de atualizações OTA ao entrar no app",
      "Correção: versões das actions do GitHub Actions (checkout@v7 → v4, setup-node@v6 → v4)",
      "Tag de versão gerada após deploy (android + ios) no workflow de release",
      "Testes: PageView web, componentes restantes, máscaras e validadores",
      "Registro de push token com retry e tratamento de erro aprimorado",
    ],
  },
  {
    version: "1.0.4",
    date: "2026-06-25",
    changes: [
      "Menu de histórico de releases no app",
      "Automação de release tag no deploy",
      "Versão sincronizada entre app.json e package.json",
    ],
  },
  {
    version: "1.0.2",
    date: "2026-06-20",
    changes: [
      "Correção do número da versão exibido no app",
      "Sincronização da versão entre app.json e package.json",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-06-01",
    changes: [
      "Lançamento inicial do app Pagah",
      "Dashboard com métricas de vendas",
      "Histórico de pedidos e canais de venda",
      "Sistema de saques e antecipação",
      "Notificações push",
      "Perfil do usuário",
      "Histórico de releases no app",
    ],
  },
];
