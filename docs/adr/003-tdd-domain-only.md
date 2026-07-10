# ADR 003 — TDD solo en lógica de negocio

## Estado

Aceptado

## Contexto

Queremos confianza en cálculos y reglas sin el costo de tests de UI frágiles.

## Decisión

- **Obligatorio** TDD en `domain` y `application`
- **Prohibido** por defecto testear UI (React, CSS, snapshots)
- Escenarios Given/When/Then viven en las specs y se traducen a tests

## Consecuencias

- UI delgada; lógica testeable
- Menos flakiness
- El agente debe escribir el test antes del código de dominio
