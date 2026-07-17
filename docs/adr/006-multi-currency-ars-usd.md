# ADR 006 — Multi-moneda ARS + USD en un workspace

## Estado

Aceptado

## Contexto

En Argentina es habitual operar con pesos (ARS) y dólares (USD) en el mismo hogar. El schema ya modela `currency` / `baseCurrency`, pero el producto forzaba mono-moneda (`account.currency === workspace.baseCurrency`) y excluía FX.

Se necesita un ledger correcto por moneda, un canje explícito ARS↔USD, y un patrimonio consolidado estimado — sin feeds de cotización ni inflación en v1.

## Decisión

1. **Cuentas:** moneda fija al crear; whitelist operativa `ARS | USD` (`ACCOUNT_CURRENCIES`). Inmutable post-create.
2. **`baseCurrency`:** moneda de consolidación y default al crear cuenta/budget/goal. Ya no es la única moneda permitida.
3. **Ledger nativo:** income/expense/transfer siempre en la moneda de la cuenta. Transfer solo same-currency.
4. **Canje:** agregado `CurrencyExchange` + dos transacciones `fx_debit` / `fx_credit` (mismo patrón que `CrossWorkspaceLink`). No es transfer con FX mágico. Fees fuera de v1 (expense aparte).
5. **Consolidación:** una tasa manual activa por workspace (`WorkspaceConsolidationRate`). Patrimonio `≈` es lectura derivada; sin históricos ni feeds blue/MEP.
6. **Budgets / Goals:** moneda propia (ARS|USD); spent/aportes solo misma moneda.
7. **SPEC-14:** sin FX cross-workspace; sigue exigiendo misma moneda entre puntas.
8. **Money VO:** sigue prohibiendo aritmética cross-currency (ADR-001).

## Consecuencias

- Specs 03/05/06/07/08/12 y SPEC-16 alineadas a multi-ledger + canje.
- UI siempre muestra código ISO (`ARS` / `USD`); nunca solo `$`.
- Cambiar `baseCurrency` se bloquea si hay cuentas con moneda distinta al nuevo valor.
- Fuera de v1: feeds de cotización, inflación, splits cross-currency, EUR/BRL en cuentas, time-travel de patrimonio.
