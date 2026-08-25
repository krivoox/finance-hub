# ADR 002 — Workspace como unidad de tenancy

## Estado

Aceptado — **enmienda pendiente (KRI-29)**

> Conflicto de producto: [SPEC-09](../specs/09-financial-groups.md) retira el workspace `group` como “hogar”. El tenant **personal** se mantiene. No se reescribe este ADR aquí: `business-logic-architect` propone la enmienda (Workspace = tenancy personal; círculos de split = `SplitGroup` con authz por miembro, no por `Membership` de un tenant ajeno).

## Contexto

La app sirve a individuos y a hogares. Los datos no deben mezclarse entre contextos.

## Decisión

Todo dato financiero (cuentas, categorías, transacciones, presupuestos, objetivos, splits) pertenece a un **Workspace**.

- Workspace `personal`: un owner; uso individual
- Workspace `group`: varios memberships; gastos compartidos

Un usuario puede pertenecer a varios workspaces.

## Consecuencias

- Toda query/comando lleva `workspaceId` + verificación de membership
- El “hogar” no es un concepto aparte: es un workspace grupal
- Simplifica RLS / autorización por tenant
