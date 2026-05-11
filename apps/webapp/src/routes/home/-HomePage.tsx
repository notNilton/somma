import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import FinancialSummaryPanel from "../../components/FinancialSummaryPanel";
import TransactionsTableSection from "../../components/TransactionsTableSection";
import SectionShell from "../../components/SectionShell";
import PrivacyAmount from "../../components/PrivacyAmount";
import Fab from "../../components/Fab";
import {
  TransactionModal,
  type TransactionCreateMode,
} from "../../components/TransactionModal";
import { api } from "../../lib/api";
import { useBudgetPlans } from "../../lib/budgets";
import type { TxCategory } from "../transactions/-queries";
import {
  currentMonthKey,
  formatMonthLabelPtBr,
  useTransactionsList,
} from "../transactions/-queries";

interface DashboardData {
  userName: string;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  safeToSpend: number;
}

export function HomePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "INCOME" | "EXPENSE">(
    "all",
  );
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedClassification, setSelectedClassification] = useState("all");
  const [showDesktopFilters, setShowDesktopFilters] = useState(true);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] =
    useState<TransactionCreateMode>("expense");

  const currentMonthValue = currentMonthKey();
  const dashboardMonthLabel = formatMonthLabelPtBr(currentMonthValue);

  const { data: dashboard, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["dashboard", currentMonthValue],
    queryFn: () => api.getDashboard<DashboardData>(currentMonthValue),
    staleTime: 1000 * 60,
  });

  const {
    data: transactions = [],
    isLoading: isTransactionsLoading,
    isFetching: isTransactionsFetching,
  } = useTransactionsList({
    search,
    filterType,
    selectedCategory,
    selectedStatus,
    selectedClassification,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<TxCategory[]>("/api/v1/categories"),
    staleTime: 1000 * 60 * 5,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => api.get<{ id: string; name: string }[]>("/api/v1/vehicles"),
    staleTime: 1000 * 60 * 5,
  });

  const { data: budgets = [] } = useBudgetPlans();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions],
  );

  const hasFilters =
    search !== "" ||
    filterType !== "all" ||
    selectedCategory !== "all" ||
    selectedStatus !== "all" ||
    selectedClassification !== "all";

  const clearFilters = () => {
    setSearch("");
    setFilterType("all");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSelectedClassification("all");
    setShowMobileSearch(false);
    setShowMobileFilters(false);
  };

  if (isDashboardLoading && !dashboard) {
    return (
      <SectionShell
        backgroundClassName="transactions-bg-starfield"
        decorations={[]}
        contentClassName="dashboard-starfield"
      >
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-sky-700" />
            <p className="text-xs text-slate-500">Carregando painel...</p>
          </div>
        </div>
      </SectionShell>
    );
  }

  if (!dashboard) return null;

  return (
    <SectionShell
      backgroundClassName="transactions-bg-starfield"
      decorations={[]}
      contentClassName="dashboard-starfield"
    >
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-4 px-2 py-3 sm:gap-5 sm:p-6">
        <TransactionModal
          isOpen={isCreateOpen}
          mode={createMode}
          categories={categories}
          vehicles={vehicles}
          budgets={budgets}
          onClose={() => setIsCreateOpen(false)}
          onCreated={invalidate}
        />
        <Fab
          label="Nova transação"
          onClick={() => {
            setCreateMode("expense");
            setIsCreateOpen(true);
          }}
        />

        <FinancialSummaryPanel
          eyebrow="Resumo financeiro"
          monthLabel={dashboardMonthLabel}
          icon={Wallet}
          statsClassName="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:grid-cols-2 xl:grid-cols-4"
          stats={[
            {
              title: "Saldo total",
              value: (
                <PrivacyAmount
                  value={dashboard.totalBalance}
                  className="font-display"
                />
              ),
              icon: Wallet,
              className: "w-[220px] shrink-0 snap-start sm:w-auto",
            },
            {
              title: "Receitas",
              value: (
                <PrivacyAmount
                  value={dashboard.monthlyIncome}
                  className="font-display text-emerald-600"
                />
              ),
              icon: ArrowUpRight,
              tone: "income",
              className: "w-[220px] shrink-0 snap-start sm:w-auto",
            },
            {
              title: "Despesas",
              value: (
                <PrivacyAmount
                  value={dashboard.monthlyExpenses}
                  className="font-display text-rose-600"
                />
              ),
              icon: ArrowDownLeft,
              tone: "expense",
              className: "w-[220px] shrink-0 snap-start sm:w-auto",
            },
            {
              title: "Pode gastar",
              value: (
                <PrivacyAmount
                  value={dashboard.safeToSpend}
                  className="font-display"
                />
              ),
              icon: ShieldCheck,
              tone: "income",
              className: "w-[220px] shrink-0 snap-start sm:w-auto",
            },
          ]}
        />

        <TransactionsTableSection
          transactions={sortedTransactions}
          categories={categories}
          isLoading={isTransactionsLoading}
          isFetching={isTransactionsFetching}
          hasFilters={hasFilters}
          search={search}
          setSearch={setSearch}
          filterType={filterType}
          setFilterType={setFilterType}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedClassification={selectedClassification}
          setSelectedClassification={setSelectedClassification}
          clearFilters={clearFilters}
          showDesktopFilters={showDesktopFilters}
          setShowDesktopFilters={setShowDesktopFilters}
          showMobileSearch={showMobileSearch}
          setShowMobileSearch={setShowMobileSearch}
          showMobileFilters={showMobileFilters}
          setShowMobileFilters={setShowMobileFilters}
        />
      </div>
    </SectionShell>
  );
}
