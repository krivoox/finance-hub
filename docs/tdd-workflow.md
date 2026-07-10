# Flujo TDD — Lógica de negocio

## Mandato

Toda lógica de negocio se desarrolla con **Test-Driven Development**.

No se escriben tests de UI (componentes React, estilos, snapshots), salvo petición explícita.

## Dónde vive el código testeable

| Ubicación | Contenido |
|-----------|-----------|
| `src/domain/**` | Value objects y reglas compartidas (`Money`, periodos, …) |
| `src/features/<dominio>/domain/**` | Reglas e invariantes del feature (saldos, splits, budgets) |
| `src/features/<dominio>/services/**` | Orquestación; testear con fakes si hay reglas; Prisma real = integración opcional |

**No** poner reglas de cálculo solo dentro de Server Actions o Client Components.

## Ciclo

```text
1. RED     Test que falla (escenario de la spec)
2. GREEN   Mínimo código para pasar
3. REFACTOR Sin romper tests
```

## De la spec al test

Escenarios Given / When / Then en `docs/specs/` → tests Vitest.

```ts
// src/features/splits/domain/equal-split.test.ts
import { describe, expect, it } from 'vitest'
import { splitEqually } from './equal-split'

describe('splitEqually', () => {
  it('distributes remainder cents to first members', () => {
    const shares = splitEqually(100, ['a', 'b', 'c'])
    expect(shares.map((s) => s.shareCents).reduce((a, b) => a + b, 0)).toBe(100)
    expect(shares).toEqual([
      { userId: 'a', shareCents: 34 },
      { userId: 'b', shareCents: 33 },
      { userId: 'c', shareCents: 33 },
    ])
  })
})
```

## Orden de implementación de una feature

1. Spec + domain-model
2. Tests de `domain/` (red)
3. Implementación pura (green)
4. `services/` + Prisma + `actions/` (session + Zod + authz)
5. UI (sin tests de UI)

## Runner

**Vitest** — configurar en Fase 0 del [roadmap](./roadmap.md):

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

## Criterio de done

- Escenarios de la spec con test
- Sin lógica de negocio solo en React
- `npm test` en verde
