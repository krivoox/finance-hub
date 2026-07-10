# ADR 002 — Workspace como unidad de tenancy

## Estado

Aceptado

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
