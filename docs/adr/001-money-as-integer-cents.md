# ADR 001 — Dinero como enteros (centavos)

## Estado

Aceptado

## Contexto

Los montos financieros no deben usar `number` de punto flotante (errores de precisión).

## Decisión

Representar dinero como:

```ts
type Money = { amountCents: number; currency: string }
```

donde `amountCents` es un entero no negativo en el value object; el sentido del movimiento lo da el tipo de transacción.

## Consecuencias

- Sumas y splits exactos en enteros
- Regla de redondeo documentada en splits (resto a los primeros miembros)
- UI formatea centavos → display
