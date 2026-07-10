# Spec 09 — Grupos financieros

| Campo | Valor |
|-------|-------|
| ID | SPEC-09 |
| Estado | Draft |
| Prioridad | P1 |
| Dependencias | SPEC-02, SPEC-05 |

## 1. Contexto

Extiende workspaces grupales: visión de balances individuales y grupales, y consolidación del hogar. El detalle de splits está en SPEC-10.

## 2. Historias de usuario

1. Como hogar, quiero un workspace compartido con cuentas del hogar.
2. Quiero ver el patrimonio consolidado del grupo.
3. Quiero ver qué le debe quién a quién (resumen de balances de splits).
4. Quiero distinguir gastos personales vs del grupo (vía workspace; un usuario usa varios workspaces).

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Dashboard de grupo: suma de saldos de accounts del workspace |
| FR-02 | Resumen de net balances entre miembros (derivado de splits + settlements) |
| FR-03 | Solo workspaces `type=group` exponen APIs de balance interpersonal |
| FR-04 | Listado de actividad reciente del grupo |
| FR-05 | Permisos: viewer ve consolidado; no muta |

## 4. Reglas de negocio

- Net balance de un usuario = lo que pagó por otros − lo que le corresponde − settlements.
- Simplificación de deudas (minimize cash flow) es opcional P2; MVP muestra matriz o lista net-to-settle.
- Cuentas del workspace son del grupo (no “cuenta personal dentro del grupo” en MVP).

## 5. Comandos y consultas

| Tipo | Nombre |
|------|--------|
| Query | `GetGroupOverview` |
| Query | `GetMemberBalances` |
| Query | `ListGroupActivity` |

## 6. Criterios de aceptación

- [ ] Overview = Σ currentBalance de accounts no archivadas (assets; credit según convención).
- [ ] Member balances coherentes con SPEC-10.

## 7. Escenarios de test (TDD)

### T-01 Overview

- **Given** accounts A=100, B=50  
- **When** GetGroupOverview  
- **Then** totalAssets refleja suma según reglas

### T-02 Solo group

- **Given** workspace personal  
- **When** GetMemberBalances  
- **Then** error `NotAGroupWorkspace`

### T-03 Balances tras split

- Ver escenarios en SPEC-10; este spec consume el servicio `computeMemberBalances`

## 8. Fuera de alcance

- Subgrupos / proyectos dentro del hogar
- Cuentas personales embebidas en el grupo
