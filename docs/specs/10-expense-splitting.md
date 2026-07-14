# Spec 10 — Distribución de gastos (splits)

| Campo | Valor |
|-------|-------|
| ID | SPEC-10 |
| Estado | Draft |
| Prioridad | P1 |
| Dependencias | SPEC-05, SPEC-09 |

## 1. Contexto

Permite repartir un expense entre miembros del workspace grupal y saldar deudas con settlements.

## 2. Historias de usuario

1. Pagué la cena: quiero dividir en partes iguales entre 3.
2. Quiero repartir por porcentajes o montos exactos.
3. Quiero ver cuánto me deben.
4. Quiero registrar que Juan me pagó su parte (settlement).

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Crear split ligado a un expense existente o al crear expense (`CreateExpenseWithSplit`) |
| FR-02 | Métodos: `equal`, `percentage`, `exact` |
| FR-03 | Validar Σ shares = amount total |
| FR-04 | `equal`: dividir centavos; resto +1 a los primeros N miembros (orden estable por userId) |
| FR-05 | `percentage`: convertir a centavos con misma regla de resto |
| FR-06 | Settlement entre dos miembros |
| FR-07 | Query net balances |
| FR-08 | Eliminar expense con split elimina split (o bloquea delete) — MVP: delete en cascada |

## 4. Reglas de negocio

- Solo workspace group.
- paidByUserId debe ser member.
- Todos los userId en shares deben ser members.
- Shares >= 0; al menos un share > 0.
- Settlement amount > 0; from ≠ to.
- Settlement reduce la deuda neta entre esas personas.

### Algoritmo equal (normativo)

```text
base = floor(totalCents / n)
remainder = totalCents % n
para i en 0..n-1 (members ordenados por userId asc):
  share = base + (i < remainder ? 1 : 0)
```

## 5. Comandos y consultas

| Tipo | Nombre |
|------|--------|
| Command | `CreateExpenseWithSplit` |
| Command | `AttachSplitToExpense` |
| Command | `CreateSettlement` |
| Command | `DeleteSettlement` |
| Query | `GetMemberBalances` |
| Query | `ListSplits` |

## 6. Criterios de aceptación

- [ ] Suma de shares siempre = total (propiedad en tests).
- [ ] Balances netos correctos tras varios splits y un settlement.
- [ ] percentage inválido (suma ≠ 100) rechazado antes de convertir.

## 7. Escenarios de test (TDD)

### T-01 Equal 100 / 3

- **Given** 100 cents, users a,b,c  
- **Then** 34, 33, 33

### T-02 Exact OK

- **Given** total 1000; shares 600+400  
- **Then** aceptado

### T-03 Exact mismatch

- **Given** total 1000; shares 600+300  
- **Then** error `SplitSumMismatch`

### T-04 Percentage

- **Given** 50%+50% sobre 101  
- **Then** shares suman 101 (regla resto)

### T-05 Balances

- **Given** Ana paga 9000; equal Ana+Bob  
- **Then** Bob debe 4500 a Ana (net)

### T-06 Settlement

- **Given** Bob debe 4500  
- **When** settlement Bob→Ana 4500  
- **Then** net Bob-Ana = 0

### T-07 Personal workspace

- **When** create split  
- **Then** error `NotAGroupWorkspace`

## 8. Fuera de alcance

- Splits en incomes
- Integración de cobro (Mercado Pago, etc.)
- Simplify debts (min transactions) algoritmo avanzado
