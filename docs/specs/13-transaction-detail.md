# Spec 13 — Detalle de movimiento

| Campo | Valor |
|-------|-------|
| ID | SPEC-13 |
| Estado | Draft |
| Prioridad | P1 |
| Dependencias | SPEC-05, SPEC-06, SPEC-10 |

## 1. Contexto

El historial de movimientos es una tabla densa. El usuario necesita abrir un movimiento y ver toda la información disponible, editarlo o eliminarlo.

## 2. Historias de usuario

1. Como usuario, quiero tocar una fila del historial y ver el detalle completo del movimiento.
2. Quiero editar descripción, categoría, monto, fecha o cuenta desde el detalle (si no soy viewer).
3. Quiero eliminar el movimiento desde el detalle.
4. Si el movimiento tiene split o vínculo cross-workspace, quiero ver esa información en la misma ficha.

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Ruta dedicada `/transactions/[id]` (deep link) |
| FR-02 | Filas del historial (movimientos, dashboard recientes, actividad de grupo) enlazan al detalle |
| FR-03 | Query `GetTransactionDetail` enriquece: cuentas, categoría, createdBy, split+shares, link cross-WS si existe |
| FR-04 | Acciones Editar / Eliminar visibles solo si el rol permite mutar |
| FR-05 | Delete con split: cascada según SPEC-10; delete con aporte cross-WS: cascada según SPEC-14 |

## 4. Reglas de negocio

- Authz: membership en el `workspaceId` de la transacción (o en el workspace de una cuenta afectada si es listado cruzado — ver SPEC-14).
- Viewer: solo lectura.
- Labels de cuenta respetan privacidad SPEC-14 cuando la cuenta es de otro espacio personal.

## 5. Comandos y consultas

| Tipo | Nombre |
|------|--------|
| Query | `GetTransactionDetail` |
| Command | `UpdateTransaction` (SPEC-05) |
| Command | `DeleteTransaction` (SPEC-05 + cascadas) |

## 6. Criterios de aceptación

- [ ] Abrir `/transactions/{id}` muestra monto, tipo, descripción, fecha, categoría, cuenta(s), quién registró.
- [ ] Si hay split: sección reparto con paidBy y shares.
- [ ] Edit/delete funcionan y redirigen al historial tras éxito.
- [ ] Viewer no ve botones de mutación.

## 7. Escenarios de test (TDD)

### T-01 Detail enrichment

- **Given** expense con categoría y cuenta  
- **When** GetTransactionDetail  
- **Then** incluye accountName, categoryName, createdByDisplayName

### T-02 Forbidden viewer mutation

- Cubierto por authz de Update/Delete existentes.

## 8. Fuera de alcance

- Sheet modal como única navegación (ruta es la fuente de verdad)
- Adjuntos

## 9. Notas

UI mobile-first: héroe de monto arriba; hechos en lista label/value; acciones en footer.
