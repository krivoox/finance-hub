// TODO: replace with ListTransactions application query — delete this mock file

export type MockTransactionRow = {
  id: string;
  description: string;
  accountName: string;
  categoryName: string;
  amountCents: number;
  type: "income" | "expense" | "transfer";
  date: string;
};

export const mockTransactions: MockTransactionRow[] = [
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
    description: "Netflix",
    accountName: "Visa Signature",
    categoryName: "Suscripciones",
    amountCents: -8_999_00,
    type: "expense",
    date: "2026-07-09",
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
  {
    id: "t4",
    description: "Freelance diseño",
    accountName: "Mercado Pago",
    categoryName: "Ingresos extra",
    amountCents: 120_000_00,
    type: "income",
    date: "2026-07-03",
  },
  {
    id: "t5",
    description: "Sueldo",
    accountName: "BBVA Caja de ahorro",
    categoryName: "Salario",
    amountCents: 950_000_00,
    type: "income",
    date: "2026-07-01",
  },
];
