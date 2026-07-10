// TODO: replace with GetDashboard application query — delete this mock file

export type MockCashflow = {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  periodLabel: string;
};

export type MockBudgetAtRisk = {
  id: string;
  name: string;
  spentCents: number;
  limitCents: number;
  status: "warning" | "exceeded";
};

export type MockGoal = {
  id: string;
  name: string;
  currentCents: number;
  targetCents: number;
};

export type MockRecentTransaction = {
  id: string;
  description: string;
  accountName: string;
  categoryName: string;
  amountCents: number;
  type: "income" | "expense" | "transfer";
  date: string;
};

export type MockDashboard = {
  workspaceName: string;
  totalBalanceCents: number;
  currency: string;
  cashflow: MockCashflow;
  budgetsAtRisk: MockBudgetAtRisk[];
  goals: MockGoal[];
  recentTransactions: MockRecentTransaction[];
};

export const mockDashboard: MockDashboard = {
  workspaceName: "Personal",
  totalBalanceCents: 1_842_500_00,
  currency: "ARS",
  cashflow: {
    incomeCents: 950_000_00,
    expenseCents: 412_350_00,
    netCents: 537_650_00,
    periodLabel: "Julio 2026",
  },
  budgetsAtRisk: [
    {
      id: "b1",
      name: "Comida",
      spentCents: 92_000_00,
      limitCents: 100_000_00,
      status: "warning",
    },
  ],
  goals: [
    {
      id: "g1",
      name: "Fondo de emergencia",
      currentCents: 420_000_00,
      targetCents: 1_000_000_00,
    },
    {
      id: "g2",
      name: "Viaje",
      currentCents: 180_000_00,
      targetCents: 600_000_00,
    },
  ],
  recentTransactions: [
    {
      id: "t1",
      description: "Supermercado Día",
      accountName: "Mercado Pago",
      categoryName: "Comida",
      amountCents: -18_450_00,
      type: "expense",
      date: "2026-07-10",
    },
    {
      id: "t2",
      description: "Sueldo",
      accountName: "BBVA Caja de ahorro",
      categoryName: "Salario",
      amountCents: 950_000_00,
      type: "income",
      date: "2026-07-01",
    },
    {
      id: "t3",
      description: "Ahorro → Fondo",
      accountName: "BBVA → Ualá",
      categoryName: "Transferencia",
      amountCents: -50_000_00,
      type: "transfer",
      date: "2026-07-05",
    },
  ],
};
