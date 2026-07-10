# Spec 08 — Objetivos financieros

| Campo | Valor |
|-------|-------|
| ID | SPEC-08 |
| Estado | Draft |
| Prioridad | P1 |
| Dependencias | SPEC-02, SPEC-03 |

## 1. Contexto

Objetivos: fondo de emergencia, ahorro para compra, cancelación de deudas. Seguimiento de progreso hacia un monto meta.

## 2. Historias de usuario

1. Quiero crear un objetivo de ahorro con monto y fecha opcional.
2. Quiero registrar aportes al objetivo.
3. Quiero un objetivo de pago de deuda ligado a una tarjeta.
4. Quiero marcar como completado al alcanzar el target.

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Create goal kind=`save` \| `debt_payoff` |
| FR-02 | `ContributeToGoal` aumenta currentAmount (save) o registra pago (debt) |
| FR-03 | Progress % = current/target (cap 100% para display) |
| FR-04 | Auto-complete cuando current >= target |
| FR-05 | Cancel goal |
| FR-06 | linkedAccountId opcional |

## 4. Reglas de negocio

- targetAmount > 0; currentAmount >= 0; current no supera target en aportes (exceso → complete y opcional reject overflow o cap).
- Decisión MVP: aporte que excede se acepta y status=completed; current puede ser >= target.
- debt_payoff: currentAmount representa lo pagado hacia la deuda.
- Contribuciones son eventos de dominio; en MVP pueden no crear Transaction automática (aporte manual al goal). Fase P2: vincular a transfer hacia cuenta ahorro.

## 5. Comandos y consultas

| Tipo | Nombre |
|------|--------|
| Command | `CreateGoal` |
| Command | `ContributeToGoal` |
| Command | `CancelGoal` |
| Query | `ListGoals` |
| Query | `GetGoalProgress` |

## 6. Criterios de aceptación

- [ ] Progress y auto-complete testeados.
- [ ] Cancel no permite nuevos aportes.

## 7. Escenarios de test (TDD)

### T-01 Create save goal

- **Given** target 500000  
- **When** create  
- **Then** current=0, status=active, progress=0

### T-02 Contribute

- **Given** target 500000  
- **When** contribute 200000  
- **Then** current=200000, progress=40%

### T-03 Complete

- **Given** current 400000, target 500000  
- **When** contribute 100000  
- **Then** status=completed

### T-04 Cancel blocks

- **Given** cancelled  
- **When** contribute  
- **Then** error `GoalNotActive`

### T-05 Invalid amounts

- **When** contribute <= 0  
- **Then** error `InvalidAmount`

## 8. Fuera de alcance

- Intereses / proyecciones de inversión
- Sugerencias de aporte mensual (analytics P2)
- Vinculación automática a cada transfer
