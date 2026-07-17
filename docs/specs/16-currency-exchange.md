# Spec 16 — Canje de moneda (Currency Exchange)

| Campo | Valor |
|-------|-------|
| ID | SPEC-16 |
| Estado | Draft |
| Prioridad | P1 |
| Dependencias | SPEC-03, SPEC-05, SPEC-06 |

## 1. Contexto

Un canje mueve valor entre dos cuentas del mismo workspace con **monedas distintas** (típicamente ARS↔USD). No es ingreso, gasto ni transferencia 1:1: registra dos montos (origen y destino) y una tasa implícita.

## 2. Historias de usuario

1. Quiero comprar dólares: sacar ARS de Mercado Pago y acreditar USD en el broker.
2. Quiero vender dólares: sacar USD y acreditar ARS.
3. Quiero ver el canje como un movimiento lógico con ambos montos y el TC usado.
4. Quiero anular un canje y restaurar ambos saldos.

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | `CreateCurrencyExchange`: fromAccount, toAccount, fromAmountCents, toAmountCents, occurredOn, description? |
| FR-02 | Ambas cuentas mismo workspace, activas, monedas distintas, ambas en `ACCOUNT_CURRENCIES` (ARS\|USD) |
| FR-03 | Persistir `CurrencyExchange` + 2 txs: `fx_debit` (origen) y `fx_credit` (destino) |
| FR-04 | `DeleteCurrencyExchange` elimina el par y restaura saldos |
| FR-05 | List/detail muestran tipo “Cambio” con dos montos + TC implícito |
| FR-06 | `fx_debit` / `fx_credit` **no** cuentan en cashflow ni en budget spent |

## 4. Reglas de negocio

- `fromAccountId ≠ toAccountId`
- `fromAmountCents > 0`, `toAmountCents > 0`
- Monedas de las cuentas deben diferir
- Sin category en las txs del canje
- TC implícito informativo: `toAmount / fromAmount` (documentar scale en dominio)
- Fees de casa de cambio: **fuera de alcance** — el usuario registra un `expense` aparte si quiere
- Update de montos: sync atómico de ambas txs o delete+recreate; no dejar el par inconsistente

## 5. Comandos y consultas

| Tipo | Nombre |
|------|--------|
| Command | `CreateCurrencyExchange` |
| Command | `DeleteCurrencyExchange` |
| Query | `GetCurrencyExchange` (vía detalle de movimiento / join) |

## 6. Criterios de aceptación

- [ ] Saldos nativos correctos en ambas monedas tras el canje.
- [ ] Cashflow del mes no incluye fx_*.
- [ ] Budget spent no incluye fx_*.
- [ ] Delete restaura ambos saldos.
- [ ] Transfer same-currency sigue siendo SPEC-06; canje cross-currency usa esta spec.

## 7. Escenarios de test (TDD)

### T-01 Compra de dólares

- **Given** ARS checking 1_000_000, USD cash 0  
- **When** exchange −1_000_000 ARS → +70_000 USD (700 USD)  
- **Then** ARS 0; USD 70_000; link CurrencyExchange presente

### T-02 Misma moneda rechazada

- **Given** dos cuentas ARS  
- **When** CreateCurrencyExchange  
- **Then** error `SameCurrencyExchange`

### T-03 Delete restaura

- **Given** exchange  
- **When** delete  
- **Then** saldos originales

### T-04 No afecta budget ni cashflow

- **Given** budget comida; exchange en el periodo  
- **Then** spent sin cambio; cashflow.expense sin el canje

### T-05 Cuenta archivada

- **When** origen o destino archivado  
- **Then** error `AccountArchived`

## 8. Fuera de alcance

- Feeds blue / MEP / oficial
- Fees embebidos en el canje
- FX cross-workspace (SPEC-14)
- Históricos de tasa / time-travel de patrimonio
- Monedas fuera de ARS|USD

## 9. Notas

- Patrón de persistencia alineado a `CrossWorkspaceLink`: un agregado + 2 txs linkeadas 1↔1.
- UI: nunca un solo monto; siempre `FxPairAmount` + caption TC (ver DESIGN / craft multi-moneda).
