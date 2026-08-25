# ADR 002 — Workspace como unidad de tenancy

## Estado

Aceptado — **enmendado por [ADR-007](./007-split-group-tenancy.md) (KRI-29)**

Este ADR documenta la decisión original: todo dato financiero pertenece a un Workspace, y el hogar era un workspace `group`. **Esa segunda mitad ya no es producto.** La regla vigente es ADR-007: Workspace = tenant **personal**; los círculos interpersonales son `SplitGroup` con authz por `SplitGroupMember`, no por `Membership` de un tenant ajeno.

No se reescribe el cuerpo histórico debajo.

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

> **Vigente (ADR-007):** el ledger sí pertenece al Workspace personal y se autoriza por membership de *ese* tenant. El hogar / asado **no** es un workspace grupal. Splits viven en `SplitGroup`; un user-miembro no es member del workspace de Ana.
