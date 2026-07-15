# Spec 14 — Dinero cross-workspace

| Campo | Valor |
|-------|-------|
| ID | SPEC-14 |
| Estado | Draft |
| Prioridad | P1 |
| Dependencias | SPEC-02, SPEC-05, SPEC-09, SPEC-10 |

## 1. Contexto

Un usuario opera varios workspaces (personal + hogar). Necesita:

1. **Aportar** fondos de una cuenta personal a una cuenta del hogar (fondear Casa).
2. **Registrar un gasto del hogar** pagado con una cuenta de otro workspace (p. ej. Visa personal).

Esto **no** es una transferencia SPEC-06 (que sigue siendo solo intra-workspace).

## 2. Historias de usuario

1. Cada mes destino el 10% de mi sueldo a la cuenta compartida de Casa — quiero una sola acción.
2. Pagué el súper con mi Visa personal; el gasto es de Casa (y se reparte) — el saldo debe bajar en mi Visa.
3. Quiero ver claro: “se registra en X” vs “se descuenta de Y”.
4. Los demás miembros del grupo no deben ver el nombre de mi cuenta personal.

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | `CreateCrossWorkspaceContribution`: expense en origen + income en destino + `CrossWorkspaceLink` kind=`contribution` |
| FR-02 | Categorías seed: expense “Aportes a espacios”, income “Aportes recibidos” (excluidas de spent de presupuestos de consumo) |
| FR-03 | Expense (o income) con `accountId` de otro workspace del usuario (`externally funded`) |
| FR-04 | Presupuesto del workspace de registro cuenta el expense home; el saldo solo afecta la cuenta de pago |
| FR-05 | Listados: txs del workspace activo + txs que afectan cuentas locales aunque `workspaceId` sea otro |
| FR-06 | Labels de privacidad: pagador ve nombre de cuenta; otros ven “Espacio personal de {nombre}” |
| FR-07 | Delete de una pata de aporte: cascada borra ambas + link |
| FR-08 | Update de monto/fecha en aporte: sincroniza ambas puntas |

## 4. Reglas de negocio

### Aporte (`contribution`)

- `source.workspaceId ≠ target.workspaceId`
- Misma moneda; cuentas activas
- Usuario con rol mutador en **ambos** workspaces
- par: source = expense (categoría aportes), target = income (categoría aportes recibidos)
- Mismo `amountCents`, `occurredOn`, descripción opcional espejada

### Expense funded externo

- `transaction.workspaceId` = workspace activo (registro: categorías, budgets, splits)
- `accountId` puede pertenecer a otro workspace donde el user puede mutar
- Transfer (SPEC-06) **sigue** exigiendo ambas cuentas del mismo workspace
- Si cuenta de pago es personal del user y hay split → `paidByUserId` = ese user (auto)

### Privacidad de labels

| Quién mira | Label cuenta foreign personal |
|------------|-------------------------------|
| Dueño de la cuenta / quien pagó | `{Workspace} · {AccountName}` |
| Otro miembro | `Espacio personal de {displayName}` |

### Errores

| Caso | Error |
|------|-------|
| Viewer en origen o destino | `Forbidden` |
| Monedas distintas | `CurrencyMismatch` |
| Cuenta archivada | `AccountArchived` |
| Aporte mismo workspace | `SameWorkspace` |
| No membership en workspace de la cuenta | `Forbidden` |

## 5. Modelo

```text
CrossWorkspaceLink
  kind: contribution | externally_funded_expense
  sourceTransactionId  // aporte: expense origen; funded: opcional/null o home
  targetTransactionId  // aporte: income destino; funded: home expense id
```

Para `contribution`: ambas IDs required.  
Para `externally_funded_expense`: se registra el home expense; el link (si se materializa) apunta al home como target y puede dejar source null **o** no crear fila y solo inferir por `account.workspaceId !== tx.workspaceId`. Preferencia de implementación: **inferir por mismatch de workspace** sin fila obligatoria; link table usada sobre todo para `contribution`.

## 6. Comandos y consultas

| Tipo | Nombre |
|------|--------|
| Command | `CreateCrossWorkspaceContribution` |
| Command | `CreateExpense` extendido con payment account foreign |
| Command | `CreateIncome` extendido análogo |
| Query | `ListPaymentAccountsForUser` |
| Query | `ListTransactions` extendido (ver FR-05) |

## 7. Criterios de aceptación

- [ ] Aporte Personal→Casa: −origen +destino; link en detalle.
- [ ] Expense Casa con Visa personal: presupuesto Casa +, saldo Visa −; others ven label privado.
- [ ] Transfer intra-workspace sin regresión.
- [ ] Delete aporte elimina ambas puntas.

## 8. Escenarios de test (TDD)

### T-01 Contribution happy path

- **Given** personal Visa 100000, Casa conjunta 0  
- **When** contribute 10000 Visa→conjunta  
- **Then** Visa 90000, conjunta 10000; link kind=contribution

### T-02 Contribution same workspace

- **When** source y target mismo WS  
- **Then** `SameWorkspace`

### T-03 Externally funded expense

- **Given** Casa categories; personal Visa  
- **When** create expense workspace=Casa account=Visa 5000  
- **Then** Visa −5000; list Casa muestra tx; budget Casa incluye 5000

### T-04 Privacy label

- **Given** Bob mira expense de Casa pagado con cuenta de Ana  
- **Then** accountLabel = “Espacio personal de Ana” (no nombre de cuenta)

### T-05 Contribution cascade delete

- **Given** aporte  
- **When** delete source tx  
- **Then** target y link eliminados; saldos restaurados

## 9. Fuera de alcance

- Transfer genérico bi-workspace como type=`transfer`
- FX
- Debitar cuenta personal de otro miembro
- Settlements automáticos desde aportes

## 10. Notas UX

- Form aporte: “Aportar a otro espacio” con resumen `Sale de X → Entra en Y`
- Form expense/income: select agrupado “Se descuenta de / Se acredita en” + resumen “Se registra en / Se descuenta de”
