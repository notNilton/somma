import 'dotenv/config';
import {
  PrismaClient,
  TransactionType,
  TransactionStatus,
  TransactionChannel,
  TransactionClassification,
  PaymentMethod,
  AccountType,
  AccountOwnership,
  FuelType,
} from '@prisma/client';
import { fakerPT_BR as faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

/** Data UTC com horário fixo 12:00 para evitar problemas de fuso */
function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

async function main() {
  console.log('🌱 Iniciando seed...');

  console.log('🧹 Limpando dados antigos...');
  await prisma.transactionTag.deleteMany();
  await prisma.importFingerprint.deleteMany();
  await prisma.importFile.deleteMany();
  await prisma.vehicleMaintenance.deleteMany();
  await prisma.refuelingLog.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.balanceHistory.deleteMany();
  await prisma.card.deleteMany();
  await prisma.accountAccess.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // ─── Usuário ────────────────────────────────────────────────────────────────
  console.log('👤 Criando usuário...');
  const passwordHash = await bcrypt.hash('@2Organela', 10);
  const nilton = await prisma.user.create({
    data: {
      email: 'nilton.naab@gmail.com',
      passwordHash,
      name: 'Nilton Aguiar dos Santos',
      phone: '65992785635',
      avatarUrl: faker.image.avatar(),
      subscriptionTier: 'PREMIUM',
    },
  });

  // ─── Contas ─────────────────────────────────────────────────────────────────
  console.log('🏦 Criando contas...');

  const bb = await prisma.account.create({
    data: {
      userId: nilton.id,
      name: 'Banco do Brasil',
      type: AccountType.CHECKING,
      ownership: AccountOwnership.PERSONAL,
      bankName: 'Banco do Brasil',
      cpf: '06143981183',
      balance: 4320.5,
      hasDebit: true,
      hasPix: true,
      hasCredit: false,
      color: '#F5A623',
      icon: 'Building',
    },
  });

  const nubank = await prisma.account.create({
    data: {
      userId: nilton.id,
      name: 'Nubank',
      type: AccountType.CHECKING,
      ownership: AccountOwnership.PERSONAL,
      bankName: 'Nubank',
      cpf: '06143981183',
      balance: 1870.0,
      creditLimit: 8300,
      hasDebit: true,
      hasPix: true,
      hasCredit: true,
      closingDay: 3,
      dueDay: 10,
      color: '#8A05BE',
      icon: 'Wallet',
    },
  });

  const mercadoPago = await prisma.account.create({
    data: {
      userId: nilton.id,
      name: 'Mercado Pago',
      type: AccountType.WALLET,
      ownership: AccountOwnership.PERSONAL,
      bankName: 'Mercado Pago',
      cpf: '06143981183',
      balance: 340.0,
      creditLimit: 7300,
      hasDebit: true,
      hasPix: true,
      hasCredit: true,
      closingDay: 20,
      dueDay: 27,
      color: '#00B1EA',
      icon: 'Wallet',
    },
  });

  const nubankPj = await prisma.account.create({
    data: {
      userId: nilton.id,
      name: 'Nubank PJ',
      type: AccountType.CHECKING,
      ownership: AccountOwnership.BUSINESS,
      bankName: 'Nubank',
      cnpj: faker.string.numeric(14),
      balance: 12400.0,
      creditLimit: 3200,
      hasDebit: true,
      hasPix: true,
      hasCredit: true,
      closingDay: 15,
      dueDay: 22,
      color: '#8A05BE',
      icon: 'Building',
    },
  });

  await prisma.account.create({
    data: {
      userId: nilton.id,
      name: 'Vuon',
      type: AccountType.CHECKING,
      ownership: AccountOwnership.PERSONAL,
      bankName: 'Vuon',
      cpf: '06143981183',
      balance: 0,
      creditLimit: 5000,
      hasDebit: false,
      hasPix: false,
      hasCredit: true,
      closingDay: 22,
      dueDay: 1,
      color: '#10B981',
      icon: 'CreditCard',
    },
  });

  // ─── Categorias ─────────────────────────────────────────────────────────────
  console.log('📂 Criando categorias...');

  const cats = await Promise.all(
    [
      {
        name: 'Ativa',
        description: 'Salários, freelas e serviços',
        color: '#22C55E',
        type: TransactionType.INCOME,
      },
      {
        name: 'Passiva',
        description: 'Rendimentos, dividendos e aluguéis recebidos',
        color: '#6366F1',
        type: TransactionType.INCOME,
      },
      {
        name: 'Ajustes',
        description: 'Reembolsos, estornos e transferências (entrada)',
        color: '#F59E0B',
        type: TransactionType.INCOME,
      },
      {
        name: 'Outros',
        description: 'Presentes, prêmios ou entradas esporádicas',
        color: '#10B981',
        type: TransactionType.INCOME,
      },
      {
        name: 'Habitação',
        description: 'Aluguel, condomínio, luz, água, internet',
        color: '#3B82F6',
        type: TransactionType.EXPENSE,
      },
      {
        name: 'Essenciais',
        description: 'Supermercado, farmácia, higiene e feira',
        color: '#EF4444',
        type: TransactionType.EXPENSE,
      },
      {
        name: 'Alimentação',
        description: 'Restaurantes, delivery, bares e lanches',
        color: '#F97316',
        type: TransactionType.EXPENSE,
      },
      {
        name: 'Mobilidade',
        description: 'Combustível, Uber, transporte público, manutenção',
        color: '#8B5CF6',
        type: TransactionType.EXPENSE,
      },
      {
        name: 'Saúde',
        description: 'Planos, exames, dentista e terapias',
        color: '#10B981',
        type: TransactionType.EXPENSE,
      },
      {
        name: 'Estilo de Vida',
        description: 'Lazer, assinaturas e viagens',
        color: '#EC4899',
        type: TransactionType.EXPENSE,
      },
      {
        name: 'Compras',
        description: 'Roupas, eletrônicos, presentes e uso pessoal',
        color: '#0EA5E9',
        type: TransactionType.EXPENSE,
      },
      {
        name: 'Financeiro',
        description: 'Impostos, taxas bancárias, juros e seguros',
        color: '#64748B',
        type: TransactionType.EXPENSE,
      },
    ].map((c) => prisma.category.create({ data: { userId: nilton.id, ...c } })),
  );

  const catMap = Object.fromEntries(cats.map((c) => [c.name, c]));

  // ─── Veículos + Abastecimentos ───────────────────────────────────────────────
  console.log('🚗 Criando veículos...');

  const honda = await prisma.vehicle.create({
    data: {
      userId: nilton.id,
      name: 'Honda Civic EXL 2021',
      brand: 'Honda',
      model: 'Civic',
      year: 2021,
      licensePlate: 'QXK4A21',
    },
  });

  const fuelDates = [
    d(2025, 12, 8),
    d(2025, 12, 22),
    d(2026, 1, 6),
    d(2026, 1, 20),
    d(2026, 2, 5),
    d(2026, 2, 19),
    d(2026, 3, 4),
    d(2026, 3, 18),
  ];

  for (let i = 0; i < fuelDates.length; i++) {
    const liters = faker.number.float({ min: 30, max: 50, fractionDigits: 2 });
    const ppl = faker.number.float({ min: 5.4, max: 6.2, fractionDigits: 2 });
    const tx = await prisma.transaction.create({
      data: {
        userId: nilton.id,
        accountId: bb.id,
        categoryId: catMap['Mobilidade']!.id,
        type: TransactionType.EXPENSE,
        amount: liters * ppl,
        date: fuelDates[i]!,
        description: 'Abastecimento — Honda Civic',
        classification: TransactionClassification.FUEL,
        channel: TransactionChannel.CARD_DEBIT,
        status: TransactionStatus.COMPLETED,
      },
    });
    await prisma.refuelingLog.create({
      data: {
        vehicleId: honda.id,
        transactionId: tx.id,
        fuelType: FuelType.GASOLINA_ADITIVADA,
        station: faker.company.name() + ' Posto',
        odometer: 32000 + i * 800,
        fuelLiters: liters,
        pricePerLiter: ppl,
        isFullTank: true,
      },
    });
  }

  // ─── Transações recorrentes (3 meses + atual) ────────────────────────────────
  console.log('🔄 Criando transações recorrentes...');

  const recurringMonths = [
    { year: 2025, month: 12 },
    { year: 2026, month: 1 },
    { year: 2026, month: 2 },
    { year: 2026, month: 3 },
  ];

  for (const { year, month } of recurringMonths) {
    const isCurrent = year === 2026 && month === 3;

    // Salário
    await prisma.transaction.create({
      data: {
        userId: nilton.id,
        accountId: bb.id,
        categoryId: catMap['Ativa']!.id,
        type: TransactionType.INCOME,
        amount: 8000.0,
        date: d(year, month, 5),
        description: 'Salário — Nilbyte Tecnologia',
        channel: TransactionChannel.PIX,
        paymentMethod: PaymentMethod.DEBIT,
        isRecurring: true,
        status: TransactionStatus.COMPLETED,
      },
    });

    // Pró-labore PJ
    await prisma.transaction.create({
      data: {
        userId: nilton.id,
        accountId: nubankPj.id,
        categoryId: catMap['Ativa']!.id,
        type: TransactionType.INCOME,
        amount: 4500.0,
        date: d(year, month, 5),
        description: 'Pró-labore PJ',
        channel: TransactionChannel.PIX,
        paymentMethod: PaymentMethod.DEBIT,
        isRecurring: true,
        status: TransactionStatus.COMPLETED,
      },
    });

    // Aluguel
    await prisma.transaction.create({
      data: {
        userId: nilton.id,
        accountId: bb.id,
        categoryId: catMap['Habitação']!.id,
        type: TransactionType.EXPENSE,
        amount: 2200.0,
        date: d(year, month, 10),
        description: 'Aluguel — Apto 304',
        channel: TransactionChannel.BANK,
        paymentMethod: PaymentMethod.DEBIT,
        isRecurring: true,
        status: isCurrent ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
      },
    });

    // Netflix
    await prisma.transaction.create({
      data: {
        userId: nilton.id,
        accountId: nubank.id,
        categoryId: catMap['Estilo de Vida']!.id,
        type: TransactionType.EXPENSE,
        amount: 55.9,
        date: d(year, month, 15),
        description: 'Netflix',
        channel: TransactionChannel.CARD_CREDIT,
        paymentMethod: PaymentMethod.CREDIT,
        isRecurring: true,
        affectsAccount: false,
        status: isCurrent ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
      },
    });

    // Spotify
    await prisma.transaction.create({
      data: {
        userId: nilton.id,
        accountId: nubank.id,
        categoryId: catMap['Estilo de Vida']!.id,
        type: TransactionType.EXPENSE,
        amount: 21.9,
        date: d(year, month, 15),
        description: 'Spotify Premium',
        channel: TransactionChannel.CARD_CREDIT,
        paymentMethod: PaymentMethod.CREDIT,
        isRecurring: true,
        affectsAccount: false,
        status: isCurrent ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
      },
    });

    // Academia
    await prisma.transaction.create({
      data: {
        userId: nilton.id,
        accountId: nubank.id,
        categoryId: catMap['Saúde']!.id,
        type: TransactionType.EXPENSE,
        amount: 120.0,
        date: d(year, month, 7),
        description: 'Mensalidade Academia Smart Fit',
        channel: TransactionChannel.PIX,
        paymentMethod: PaymentMethod.DEBIT,
        isRecurring: true,
        status: isCurrent ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
      },
    });

    // Plano de saúde
    await prisma.transaction.create({
      data: {
        userId: nilton.id,
        accountId: bb.id,
        categoryId: catMap['Saúde']!.id,
        type: TransactionType.EXPENSE,
        amount: 480.0,
        date: d(year, month, 20),
        description: 'Plano de Saúde Unimed',
        channel: TransactionChannel.BANK,
        paymentMethod: PaymentMethod.DEBIT,
        isRecurring: true,
        status: isCurrent ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
      },
    });
  }

  // ─── Parcelamentos ───────────────────────────────────────────────────────────
  console.log('💳 Criando parcelamentos...');

  // iPhone 15 Pro — 12x R$ 666,58 — início nov/2025
  const iphoneInstallment = await prisma.installment.create({
    data: {
      userId: nilton.id,
      totalAmount: 7999.0,
      totalParts: 12,
      description: 'iPhone 15 Pro 256GB',
      date: d(2025, 11, 20),
    },
  });

  const iphoneMonths = [
    { year: 2025, month: 11, num: 1 },
    { year: 2025, month: 12, num: 2 },
    { year: 2026, month: 1, num: 3 },
    { year: 2026, month: 2, num: 4 },
    { year: 2026, month: 3, num: 5 },
  ];

  for (const { year, month, num } of iphoneMonths) {
    await prisma.transaction.create({
      data: {
        userId: nilton.id,
        accountId: nubank.id,
        categoryId: catMap['Compras']!.id,
        type: TransactionType.EXPENSE,
        amount: 666.58,
        date: d(year, month, 20),
        description: 'iPhone 15 Pro 256GB',
        channel: TransactionChannel.CARD_CREDIT,
        paymentMethod: PaymentMethod.CREDIT,
        affectsAccount: false,
        installmentId: iphoneInstallment.id,
        installmentNum: num,
        totalInstallments: 12,
        status: num <= 4 ? TransactionStatus.COMPLETED : TransactionStatus.PENDING,
      },
    });
  }

  // Notebook Dell — 6x R$ 700 — início dez/2025
  const notebookInstallment = await prisma.installment.create({
    data: {
      userId: nilton.id,
      totalAmount: 4200.0,
      totalParts: 6,
      description: 'Notebook Dell Inspiron 15',
      date: d(2025, 12, 5),
    },
  });

  const notebookMonths = [
    { year: 2025, month: 12, num: 1 },
    { year: 2026, month: 1, num: 2 },
    { year: 2026, month: 2, num: 3 },
    { year: 2026, month: 3, num: 4 },
  ];

  for (const { year, month, num } of notebookMonths) {
    await prisma.transaction.create({
      data: {
        userId: nilton.id,
        accountId: mercadoPago.id,
        categoryId: catMap['Compras']!.id,
        type: TransactionType.EXPENSE,
        amount: 700.0,
        date: d(year, month, 5),
        description: 'Notebook Dell Inspiron 15',
        channel: TransactionChannel.CARD_CREDIT,
        paymentMethod: PaymentMethod.CREDIT,
        affectsAccount: false,
        installmentId: notebookInstallment.id,
        installmentNum: num,
        totalInstallments: 6,
        status: num <= 3 ? TransactionStatus.COMPLETED : TransactionStatus.PENDING,
      },
    });
  }

  // Tênis Nike — 3x R$ 243,33 — início fev/2026
  const nikInstallment = await prisma.installment.create({
    data: {
      userId: nilton.id,
      totalAmount: 730.0,
      totalParts: 3,
      description: 'Tênis Nike Air Max',
      date: d(2026, 2, 14),
    },
  });

  for (let num = 1; num <= 3; num++) {
    const month = num + 1; // 2, 3, 4
    const year = month <= 12 ? 2026 : 2027;
    const adjustedMonth = month <= 12 ? month : month - 12;
    await prisma.transaction.create({
      data: {
        userId: nilton.id,
        accountId: nubank.id,
        categoryId: catMap['Compras']!.id,
        type: TransactionType.EXPENSE,
        amount: 243.33,
        date: d(year, adjustedMonth, 14),
        description: 'Tênis Nike Air Max',
        channel: TransactionChannel.CARD_CREDIT,
        paymentMethod: PaymentMethod.CREDIT,
        affectsAccount: false,
        installmentId: nikInstallment.id,
        installmentNum: num,
        totalInstallments: 3,
        status: num === 1 ? TransactionStatus.COMPLETED : TransactionStatus.PENDING,
      },
    });
  }

  // ─── Transações avulsas por mês ──────────────────────────────────────────────
  console.log('💸 Criando transações avulsas...');

  // Dezembro 2025
  const dez25: Parameters<typeof prisma.transaction.create>[0]['data'][] = [
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Essenciais']!.id,
      type: TransactionType.EXPENSE,
      amount: 380.5,
      date: d(2025, 12, 2),
      description: 'Supermercado Extra',
      channel: TransactionChannel.CARD_DEBIT,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubank.id,
      categoryId: catMap['Alimentação']!.id,
      type: TransactionType.EXPENSE,
      amount: 89.9,
      date: d(2025, 12, 7),
      description: 'iFood — Jantar',
      channel: TransactionChannel.CARD_CREDIT,
      paymentMethod: PaymentMethod.CREDIT,
      affectsAccount: false,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Mobilidade']!.id,
      type: TransactionType.EXPENSE,
      amount: 42.0,
      date: d(2025, 12, 11),
      description: 'Uber',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubank.id,
      categoryId: catMap['Estilo de Vida']!.id,
      type: TransactionType.EXPENSE,
      amount: 240.0,
      date: d(2025, 12, 18),
      description: 'Ingressos Show Capital Inicial',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Essenciais']!.id,
      type: TransactionType.EXPENSE,
      amount: 62.4,
      date: d(2025, 12, 20),
      description: 'Farmácia São João',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Alimentação']!.id,
      type: TransactionType.EXPENSE,
      amount: 158.0,
      date: d(2025, 12, 24),
      description: 'Churrasco Natal — Carrefour',
      channel: TransactionChannel.CARD_DEBIT,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubank.id,
      categoryId: catMap['Compras']!.id,
      type: TransactionType.EXPENSE,
      amount: 320.0,
      date: d(2025, 12, 26),
      description: 'Roupa Renner — Natal',
      channel: TransactionChannel.CARD_CREDIT,
      paymentMethod: PaymentMethod.CREDIT,
      affectsAccount: false,
      status: TransactionStatus.CANCELED,
    },
  ];

  // Janeiro 2026
  const jan26: Parameters<typeof prisma.transaction.create>[0]['data'][] = [
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Habitação']!.id,
      type: TransactionType.EXPENSE,
      amount: 145.6,
      date: d(2026, 1, 3),
      description: 'Conta de Luz — ENERGISA',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Essenciais']!.id,
      type: TransactionType.EXPENSE,
      amount: 420.0,
      date: d(2026, 1, 8),
      description: 'Supermercado Atacadão',
      channel: TransactionChannel.CARD_DEBIT,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubank.id,
      categoryId: catMap['Financeiro']!.id,
      type: TransactionType.EXPENSE,
      amount: 1850.0,
      date: d(2026, 1, 10),
      description: 'Pagamento Fatura Nubank — Dez/25',
      channel: TransactionChannel.PIX,
      classification: TransactionClassification.TRANSFER,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Alimentação']!.id,
      type: TransactionType.EXPENSE,
      amount: 76.5,
      date: d(2026, 1, 14),
      description: 'Restaurante Sabor Caseiro',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubank.id,
      categoryId: catMap['Mobilidade']!.id,
      type: TransactionType.EXPENSE,
      amount: 35.0,
      date: d(2026, 1, 17),
      description: 'Uber',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Habitação']!.id,
      type: TransactionType.EXPENSE,
      amount: 72.0,
      date: d(2026, 1, 18),
      description: 'Conta de Água — SANEMAT',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubank.id,
      categoryId: catMap['Estilo de Vida']!.id,
      type: TransactionType.EXPENSE,
      amount: 1200.0,
      date: d(2026, 1, 25),
      description: 'Passagem Aérea — Carnaval SP',
      channel: TransactionChannel.CARD_CREDIT,
      paymentMethod: PaymentMethod.CREDIT,
      affectsAccount: false,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubankPj.id,
      categoryId: catMap['Financeiro']!.id,
      type: TransactionType.EXPENSE,
      amount: 850.0,
      date: d(2026, 1, 28),
      description: 'DAS — Simples Nacional Jan/26',
      channel: TransactionChannel.BANK,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Ajustes']!.id,
      type: TransactionType.INCOME,
      amount: 350.0,
      date: d(2026, 1, 30),
      description: 'Reembolso FGTS',
      channel: TransactionChannel.BANK,
      status: TransactionStatus.COMPLETED,
    },
  ];

  // Fevereiro 2026
  const fev26: Parameters<typeof prisma.transaction.create>[0]['data'][] = [
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Habitação']!.id,
      type: TransactionType.EXPENSE,
      amount: 138.9,
      date: d(2026, 2, 3),
      description: 'Conta de Luz — ENERGISA',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubank.id,
      categoryId: catMap['Financeiro']!.id,
      type: TransactionType.EXPENSE,
      amount: 2340.0,
      date: d(2026, 2, 10),
      description: 'Pagamento Fatura Nubank — Jan/26',
      channel: TransactionChannel.PIX,
      classification: TransactionClassification.TRANSFER,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Essenciais']!.id,
      type: TransactionType.EXPENSE,
      amount: 395.0,
      date: d(2026, 2, 12),
      description: 'Supermercado Extra',
      channel: TransactionChannel.CARD_DEBIT,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubank.id,
      categoryId: catMap['Alimentação']!.id,
      type: TransactionType.EXPENSE,
      amount: 112.0,
      date: d(2026, 2, 15),
      description: 'Carnaval — Bar do Zé',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Alimentação']!.id,
      type: TransactionType.EXPENSE,
      amount: 67.8,
      date: d(2026, 2, 18),
      description: 'iFood — Almoço',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Habitação']!.id,
      type: TransactionType.EXPENSE,
      amount: 68.5,
      date: d(2026, 2, 19),
      description: 'Conta de Água — SANEMAT',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubankPj.id,
      categoryId: catMap['Ativa']!.id,
      type: TransactionType.INCOME,
      amount: 3200.0,
      date: d(2026, 2, 20),
      description: 'Freelance — Sistema de Gestão RH',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubankPj.id,
      categoryId: catMap['Financeiro']!.id,
      type: TransactionType.EXPENSE,
      amount: 850.0,
      date: d(2026, 2, 28),
      description: 'DAS — Simples Nacional Fev/26',
      channel: TransactionChannel.BANK,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubank.id,
      categoryId: catMap['Saúde']!.id,
      type: TransactionType.EXPENSE,
      amount: 280.0,
      date: d(2026, 2, 25),
      description: 'Dentista — Limpeza + Rx',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.CANCELED,
    },
  ];

  // Março 2026 (mês atual — mix de COMPLETED e PENDING)
  const mar26: Parameters<typeof prisma.transaction.create>[0]['data'][] = [
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Habitação']!.id,
      type: TransactionType.EXPENSE,
      amount: 152.4,
      date: d(2026, 3, 4),
      description: 'Conta de Luz — ENERGISA',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Essenciais']!.id,
      type: TransactionType.EXPENSE,
      amount: 412.0,
      date: d(2026, 3, 6),
      description: 'Supermercado Atacadão',
      channel: TransactionChannel.CARD_DEBIT,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubank.id,
      categoryId: catMap['Financeiro']!.id,
      type: TransactionType.EXPENSE,
      amount: 1980.0,
      date: d(2026, 3, 10),
      description: 'Pagamento Fatura Nubank — Fev/26',
      channel: TransactionChannel.PIX,
      classification: TransactionClassification.TRANSFER,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Alimentação']!.id,
      type: TransactionType.EXPENSE,
      amount: 95.5,
      date: d(2026, 3, 13),
      description: 'Restaurante Madero',
      channel: TransactionChannel.CARD_DEBIT,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubank.id,
      categoryId: catMap['Mobilidade']!.id,
      type: TransactionType.EXPENSE,
      amount: 28.0,
      date: d(2026, 3, 15),
      description: 'Uber',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubank.id,
      categoryId: catMap['Alimentação']!.id,
      type: TransactionType.EXPENSE,
      amount: 54.9,
      date: d(2026, 3, 17),
      description: 'iFood — Pizza',
      channel: TransactionChannel.CARD_CREDIT,
      paymentMethod: PaymentMethod.CREDIT,
      affectsAccount: false,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Essenciais']!.id,
      type: TransactionType.EXPENSE,
      amount: 48.9,
      date: d(2026, 3, 19),
      description: 'Farmácia São João',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.COMPLETED,
    },
    {
      userId: nilton.id,
      accountId: nubank.id,
      categoryId: catMap['Compras']!.id,
      type: TransactionType.EXPENSE,
      amount: 189.9,
      date: d(2026, 3, 21),
      description: 'Amazon — Livros técnicos',
      channel: TransactionChannel.CARD_CREDIT,
      paymentMethod: PaymentMethod.CREDIT,
      affectsAccount: false,
      status: TransactionStatus.COMPLETED,
    },
    // PENDING — ainda nao pagos
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Habitação']!.id,
      type: TransactionType.EXPENSE,
      amount: 69.8,
      date: d(2026, 3, 25),
      description: 'Conta de Água — SANEMAT',
      channel: TransactionChannel.PIX,
      status: TransactionStatus.PENDING,
    },
    {
      userId: nilton.id,
      accountId: bb.id,
      categoryId: catMap['Habitação']!.id,
      type: TransactionType.EXPENSE,
      amount: 165.0,
      date: d(2026, 3, 28),
      description: 'Internet — Claro Fibra',
      channel: TransactionChannel.BANK,
      isRecurring: true,
      status: TransactionStatus.PENDING,
    },
    {
      userId: nilton.id,
      accountId: nubank.id,
      categoryId: catMap['Financeiro']!.id,
      type: TransactionType.EXPENSE,
      amount: 2180.0,
      date: d(2026, 3, 10),
      description: 'Fatura Nubank — Mar/26',
      channel: TransactionChannel.PIX,
      classification: TransactionClassification.TRANSFER,
      status: TransactionStatus.PENDING,
    },
    {
      userId: nilton.id,
      accountId: nubankPj.id,
      categoryId: catMap['Financeiro']!.id,
      type: TransactionType.EXPENSE,
      amount: 850.0,
      date: d(2026, 3, 31),
      description: 'DAS — Simples Nacional Mar/26',
      channel: TransactionChannel.BANK,
      status: TransactionStatus.PENDING,
    },
  ];

  for (const txData of [...dez25, ...jan26, ...fev26, ...mar26]) {
    await prisma.transaction.create({
      data: txData as Parameters<typeof prisma.transaction.create>[0]['data'],
    });
  }

  console.log(`✅ Seed finalizado!`);
  console.log(`   Contas: 4 (BB, Nubank, Mercado Pago, Nubank PJ)`);
  console.log(`   Cartões: 2 (Nubank Ultravioleta crédito, BB Débito)`);
  console.log(`   Meses: dez/25, jan/26, fev/26, mar/26`);
  console.log(`   Recorrentes: salário, aluguel, Netflix, Spotify, academia, plano de saúde`);
  console.log(`   Parcelamentos: iPhone 15 (12x), Notebook Dell (6x), Nike (3x)`);
  console.log(`   Pendentes: conta de água, internet, fatura Nubank, DAS mar/26`);
  console.log(`   Canceladas: Roupa Renner dez/25, Dentista fev/26`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
