# Glosario

| Término | Definición |
|---------|------------|
| Workspace | Tenant de **ledger**. Producto (ADR-007 / KRI-29): **personal** (cuentas y movimientos del usuario). El tipo group como ledger compartido está retirado |
| Invitation (tenant) | **Retirado (KRI-29).** Histórico: invite por email a un workspace grupal. Hoy el join es token de SplitGroup |
| SplitGroup | Círculo de gastos divididos (casa, asado) anclado al personal del creador; no es un workspace |
| SplitGroupMember | Miembro de un SplitGroup: `user` (tiene cuenta) o `ghost` (solo nombre). Identidad en dinero = `memberId` |
| memberId | `SplitGroupMember.id`. Clave de shares, payer, nets y settlements (no `User.id`) |
| Ghost member | Miembro de un SplitGroup solo con nombre, sin cuenta de la app; entra en el reparto igual |
| Public share link | Enlace (`publicShareToken`) para ver quién debe **sin instalar**; en v1 también sirve para `JoinSplitGroup` |
| Split / ExpenseSplit | Reparto (IOU) de un gasto entre miembros de un `SplitGroup`. La tx vive en el ledger de quien registra |
| Settlement | Pago entre miembros de un SplitGroup para ajustar deudas de splits (no mueve cuentas) |
| Onboarding de workspace | First-run en `/onboarding` (modal sin shell): ≥1 cuenta; gasto inicial opcional; ready = estado derivado |
| Account | Cuenta: banco, efectivo, billetera, tarjeta de crédito, etc. |
| Credit card (tipo de cuenta) | Pasivo: saldo positivo = deuda. Pago del resumen = transferencia hacia la tarjeta (SPEC-03 / SPEC-06) |
| Tarjeta bimonetaria (ARS+USD) | Misma plástico con consumos en dos monedas: **dos** Accounts `credit_card` (una ARS, una USD). No es una cuenta multi-moneda (ADR-006 / SPEC-03 §5.1, KRI-11) |
| Transaction | Movimiento / **transacción**: ingreso, gasto o transferencia |
| Periodo de listado (Transacciones) | Ventana sobre `occurredOn`: `this_month` / `this_week` (lun–dom) / `all` / `custom`; default este mes en `User.timezone` (SPEC-05). Distinto del periodo weekly anclado de Budget |
| Income | Ingreso que aumenta el saldo de una cuenta (en tarjeta: baja deuda) |
| Expense | Gasto que disminuye el saldo de una cuenta (en tarjeta: sube deuda) |
| Transfer | Movimiento interno entre dos cuentas del mismo workspace (misma moneda); hacia tarjeta = pago de deuda |
| Recurring rule / Plantilla recurrente | Configuración de un movimiento que se repite (SPEC-18); no afecta saldos hasta materializar |
| Occurrence / Ocurrencia proyectada | Fecha + datos calculados de una plantilla para un período; no es `Transaction` hasta confirmar |
| Materializar | Confirmar una ocurrencia y crear la `Transaction` real en el ledger (SPEC-18) |
| Currency exchange / Canje | Cambio ARS↔USD: dos montos + link; tipos `fx_debit` / `fx_credit` |
| Consolidation rate | Tasa del workspace para patrimonio estimado en `baseCurrency` (manual o apply explícito desde MEP) |
| Cotización / Usd quote | Precio de mercado USD del día (oficial, bolsa/MEP, …) cacheado vía DolarApi — SPEC-19; no es el TC de consolidación hasta que el usuario aplique |
| MEP / Dólar bolsa | Cotización bursátil (`casa: "bolsa"` en DolarApi); en producto se muestra como MEP |
| Cross-workspace contribution | **Retirado (KRI-29 / SPEC-14).** Histórico: expense en un espacio + income en otro |
| Externally funded expense | **Retirado (KRI-29 / SPEC-14).** Histórico: gasto en un workspace pagado con cuenta de otro |
| Category | Etiqueta de clasificación de ingresos/gastos |
| Budget | Límite de gasto en un periodo para una o más categorías |
| Goal | Objetivo de ahorro o de pago de deuda |
| Goal contribution / Aporte a objetivo | Evento que avanza el progreso del Goal y, desde H4, materializa una transferencia ledger origen → `linkedAccountId` (1:1 con `Transaction`) |
| Linked account (goal) | Cuenta destino típica del objetivo (ahorro o tarjeta a saldar); obligatoria para aportar |
| Membership | Relación usuario–workspace con un rol. Unirse a un SplitGroup **no** crea Membership |
| Money | Value object: monto en centavos + moneda |
| Balance | Saldo derivado de una cuenta o entre miembros |
| Base currency | Moneda de consolidación del workspace |
| Archive | Baja lógica de cuenta (u otra entidad): deja de usarse en flujos activos pero **conserva historial** (SPEC-03) |
| Eliminar cuenta / DeleteAccount | Baja física (hard-delete): borra la cuenta y el historial asociado vía cascada; confirmación fuerte; no es el default frente a Archivar (SPEC-03) |
| Última cuenta activa | Única `Account` con `isArchived=false` en el workspace; archivarla reabre setup (`needsSetup`); hard-delete de esa cuenta activa está bloqueado (SPEC-03 / SPEC-15) |
| AccountLinkedToActiveGoal | Error de dominio: no se puede archivar ni eliminar una cuenta destino de un Goal `active` |
