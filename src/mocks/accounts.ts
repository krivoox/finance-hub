// TODO: replace with ListAccounts application query — delete this mock file

export type MockAccount = {
  id: string;
  name: string;
  institution: string;
  type: "checking" | "savings" | "credit" | "cash" | "wallet";
  balanceCents: number;
  currency: string;
};

export const mockAccounts: MockAccount[] = [
  {
    id: "a1",
    name: "Caja de ahorro",
    institution: "BBVA",
    type: "checking",
    balanceCents: 1_120_000_00,
    currency: "ARS",
  },
  {
    id: "a2",
    name: "Mercado Pago",
    institution: "Mercado Pago",
    type: "wallet",
    balanceCents: 84_500_00,
    currency: "ARS",
  },
  {
    id: "a3",
    name: "Visa Signature",
    institution: "BBVA",
    type: "credit",
    balanceCents: -62_000_00,
    currency: "ARS",
  },
  {
    id: "a4",
    name: "Efectivo",
    institution: "—",
    type: "cash",
    balanceCents: 25_000_00,
    currency: "ARS",
  },
];
