# Spec 19 — Cotizaciones USD (DolarApi) y apply a consolidación

| Campo | Valor |
|-------|-------|
| ID | SPEC-19 |
| Estado | Draft |
| Prioridad | P1 |
| Dependencias | SPEC-12 (consolidación), SPEC-16 (canje; sin feeds en ledger), ADR-006 |

## 1. Contexto

El patrimonio consolidado usa una tasa **manual** por workspace (`WorkspaceConsolidationRate`). Los usuarios argentinos necesitan ver cotizaciones de mercado (oficial y MEP) y, si quieren, **copiar** el MEP del día a esa tasa — sin que el sistema pise su elección.

Finance Hub integra **[DolarApi.com](https://dolarapi.com/docs/)** (gratis, sin auth): un fetch **diario**, snapshot en DB, UI lee cache local. No hay trading ni compras: el dólar del día alcanza.

**Proveedor elegido:** `GET https://dolarapi.com/v1/dolares` (no Dolarito: evita API paga y onboarding por mail).

## 2. Historias de usuario

1. Quiero ver la cotización oficial y MEP (bolsa) del día sin salir de la app.
2. Quiero un convertidor rápido ARS ↔ USD con la cotización cacheada.
3. Quiero un botón “Usar MEP de hoy” que actualice mi tasa de consolidación (rate + label + asOf).
4. Si el feed falla, quiero seguir viendo la última cotización con aviso de desactualizada.
5. Quiero ver de dónde vienen los datos (“Datos: DolarApi.com”).

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Job diario (cron) fetch `https://dolarapi.com/v1/dolares` y persiste `UsdQuoteSnapshot` + lines |
| FR-02 | Query `GetUsdQuotes`: oficial + bolsa; flags `stale`, `asOfDate`, `fetchedAt` |
| FR-03 | Conversión lectura ARS↔USD cents usando `rateScaled` del side default (`sell`) |
| FR-04 | Command `ApplyConsolidationRateFromQuote`: casa `bolsa`, side `sell` → upsert `WorkspaceConsolidationRate` |
| FR-05 | Upsert manual de consolidación (existente) permanece; Apply es atajo explícito |
| FR-06 | Degradación: fetch fail → no borrar último snapshot; UI `stale=true` |
| FR-07 | Feature flag `USD_QUOTES_ENABLED`; attribution visible donde se muestren cotizaciones |
| FR-08 | UI (sidebar / dashboard / settings): mostrar oficial + MEP; CTA “Usar MEP de hoy” cuando haya quote usable |

## 4. Reglas de negocio

### 4.1 Persistencia global

- Snapshot **global** (no por workspace) por `asOfDate` en timezone `America/Argentina/Buenos_Aires`.
- A lo sumo un snapshot vigente por `asOfDate` (unique / upsert del día).
- Lines mínimas para snapshot usable en UI: `oficial` y `bolsa` con rates > 0.
- `tarjeta` **puede** persistirse para debug/fase 2; **prohibido** usarla como impuestos reales ni como default de apply/convert (es oficial × 1.30, fórmula legacy PAIS).

### 4.2 Mapping provider → dominio

Payload ejemplo:

```json
[
  {
    "moneda": "USD",
    "casa": "oficial",
    "nombre": "Oficial",
    "compra": 1470,
    "venta": 1520,
    "fechaActualizacion": "2026-08-06T12:00:00.000Z"
  },
  {
    "moneda": "USD",
    "casa": "bolsa",
    "nombre": "Bolsa",
    "compra": 1519.8,
    "venta": 1521.1,
    "fechaActualizacion": "2026-08-06T14:57:00.000Z"
  }
]
```

- `compra` / `venta` = pesos **major** por 1 USD (float del provider).
- Persistido: enteros con `CONSOLIDATION_RATE_SCALE` (`1_000_000`):

```
rateScaled = round(majorArsPerUsd * CONSOLIDATION_RATE_SCALE)
```

- `casa: "bolsa"` ≡ producto **MEP**. Label al aplicar: `"MEP"`.

### 4.3 Side (buy / sell)

| Uso | Side default | Campo |
|-----|--------------|-------|
| Apply MEP | venta | `sellRateScaled` |
| Convertidor | venta | `sellRateScaled` |

### 4.4 Stale

`isQuoteSnapshotStale(snapshot, now, timeZone)`:

- sin snapshot → ausencia (CTA/convertidor deshabilitados; consolidación manual intacta);
- `asOfDate < calendarDate(now, America/Argentina/Buenos_Aires)` → stale;
- o `(now - fetchedAt) > 36 hours` → stale.

Fetch fallido: conservar último snapshot bueno + `stale=true`.

### 4.5 Apply (sin auto-sync)

- Precondición: line `bolsa` en el snapshot más reciente usable.
- Efecto: mismo contrato que upsert consolidación: `rateScaled = sellRateScaled`, `scale = 1e6`, `label = "MEP"`, `asOf = providerUpdatedAt`, `quoteCurrency = "USD"`.
- El refresh del feed **nunca** llama Apply solo.
- Roles: quien pueda mutar consolidación hoy (`owner` / `admin` / `member` — alinear a settings actuales); `viewer` solo lee cotizaciones.

### 4.6 Conversión lectura

Reutiliza `convertArsUsdCents` / helpers de consolidación (ADR-001: cents enteros). **No** crea txs ni afecta ledger.

### 4.7 Frecuencia y tráfico

- Máximo un refresh programado por día calendario AR.
- Pageviews / RSC **no** llaman a DolarApi; solo leen DB.
- Cron sugerido: ~15:00 ART post-rueda (`0 18 * * *` UTC) — ajustable.

## 5. Modelo de datos

### `UsdQuoteSnapshot`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Id | |
| asOfDate | Date (`@db.Date`) | Día calendario AR |
| fetchedAt | DateTime | Momento del fetch exitoso |
| provider | string | `'dolarapi'` en v1 |
| providerUrl | string | p.ej. `https://dolarapi.com/v1/dolares` |

Unique: `asOfDate`.

### `UsdQuoteLine`

| Campo | Tipo | Notas |
|-------|------|-------|
| snapshotId | Id | FK |
| casa | string | `oficial` \| `bolsa` \| `tarjeta` \| … |
| nombre | string | del provider |
| buyRateScaled | Int | compra |
| sellRateScaled | Int | venta |
| scale | Int | default `1_000_000` |
| providerUpdatedAt | DateTime | `fechaActualizacion` |

Invariantes: `buyRateScaled > 0`, `sellRateScaled > 0`.

## 6. Comandos y consultas

| Tipo | Nombre | Notas |
|------|--------|-------|
| Command (infra) | `RefreshUsdQuotes` | Cron / route protegida con `CRON_SECRET`; no es acción de usuario final |
| Query | `GetUsdQuotes` | Lee DB; session + membership |
| Query | `ConvertWithUsdQuote` | Puro en domain + thin service |
| Command | `ApplyConsolidationRateFromQuote` | workspaceId; casa fija `bolsa` en v1 |
| Command | `UpsertConsolidationRate` | ya existe (manual) |

## 7. Criterios de aceptación

- [ ] Un solo fetch programado por día; pageviews no llaman DolarApi.
- [ ] UI muestra oficial + MEP (bolsa) con attribution “Datos: DolarApi.com”.
- [ ] Convertidor usa cents enteros y `rateScaled`; redondeo `Math.round`.
- [ ] “Usar MEP de hoy” escribe consolidación del workspace; otros workspaces intactos.
- [ ] Fetch fail: última cotización + stale; sin crash del ledger ni del dashboard.
- [ ] Flag `USD_QUOTES_ENABLED=false`: sin feed / CTA apply-from-quote.
- [ ] `tarjeta` no aparece como “impuestos” ni como default de apply/convert.
- [ ] Tests de dominio T-01…T-12 en verde.

## 8. Escenarios de test (TDD)

### T-01 Parse / scale venta

- **Given** venta MEP `1521.1`, scale `1_000_000`
- **When** `majorArsPerUsdToRateScaled(1521.1)`
- **Then** `1_521_100_000`

### T-02 Scale con decimal compra

- **Given** `1519.8`
- **When** scale
- **Then** `1_519_800_000` (sin float residual)

### T-03 Scale inválido

- **Given** `≤ 0` o non-finite
- **When** scale
- **Then** error de dominio

### T-04 Map payload provider

- **Given** JSON con oficial, bolsa, tarjeta
- **When** `mapDolarApiPayloadToQuoteLines`
- **Then** lines con casas correctas; bolsa buy/sell scaled

### T-05 Snapshot usable requiere oficial + bolsa

- **Given** solo oficial
- **When** `assertSnapshotUsable`
- **Then** error `IncompleteUsdQuoteSnapshot`

### T-06 Stale por día calendario

- **Given** `asOfDate=2026-08-05`, `now=2026-08-06T15:00-03:00`, tz AR
- **When** `isQuoteSnapshotStale`
- **Then** `true`

### T-07 No stale mismo día fresco

- **Given** `asOfDate=hoy`, `fetchedAt=hace 2h`
- **When** `isQuoteSnapshotStale`
- **Then** `false`

### T-08 Stale por antigüedad > 36h

- **Given** `fetchedAt` hace 40h
- **When** `isQuoteSnapshotStale`
- **Then** `true`

### T-09 Convert USD→ARS con venta MEP

- **Given** sell `1520` ARS/USD, `1000` cents USD (`10.00` USD)
- **When** `convertWithUsdQuote(..., side: 'sell')`
- **Then** `1_520_000` cents ARS

### T-10 Convert ARS→USD

- **Given** sell `1520`, `1_520_000` ARS cents
- **When** convert a USD
- **Then** `1000` cents USD

### T-11 Apply MEP → campos consolidación

- **Given** line bolsa `sellRateScaled=S`, `providerUpdatedAt=T`
- **When** `buildConsolidationRateFromMepQuote(line)`
- **Then** `{ rateScaled: S, scale: 1e6, label: "MEP", quoteCurrency: "USD", asOf: T }`

### T-12 Apply rechaza sin bolsa / no-bolsa

- **Given** snapshot sin bolsa, o line `casa !== "bolsa"`
- **When** build/apply
- **Then** `MepQuoteUnavailable`

## 9. Fuera de alcance

- Auto-sync de `WorkspaceConsolidationRate` al refrescar el feed
- Entidad Subscription separada; recalc live de recurrentes al materializar → fase 2
- Históricos de cotización para charts / time-travel de patrimonio
- Blue / CCL como CTA de consolidación
- Impuestos (PAIS, Ganancias, IVA/IIBB) derivados de `tarjeta`
- Fees de canje ([SPEC-16](./16-currency-exchange.md))
- Multi-proveedor / failover Dolarito
- Push cuando cambia la cotización
- Recalc de recurrentes al materializar con cotización viva

## 10. Notas de implementación

| Capa | Qué |
|------|-----|
| Domain | `src/features/fx-quotes/domain/`: scale, map payload, stale, convert, build apply patch. Sin fetch/Prisma/env. Reusar `CONSOLIDATION_RATE_SCALE` / `convertArsUsdCents` de dashboard consolidation. |
| Services | `refresh-usd-quotes.ts` (HTTP + upsert), `get-usd-quotes.ts`, apply → `upsertConsolidationRate` existente |
| Cron | `src/app/api/cron/usd-quotes/route.ts` + `vercel.json` crons; header `Authorization: Bearer CRON_SECRET` |
| Env | `USD_QUOTES_ENABLED`, `CRON_SECRET`; opcional `DOLARAPI_BASE_URL` (default en `env.ts`) |
| Prisma | `UsdQuoteSnapshot`, `UsdQuoteLine` |
| UI | Mini-card sidebar (arriba de Ajustes) + caption/CTA en dashboard/settings; convertidor Popover/Sheet; estados loading/empty/error/stale; attribution. Ver hand-off UI en notas de producto. |

**Invariante de producto:** el feed **nunca** muta ledger ni TC sin comando explícito del usuario.

## 11. Handoff a SPEC-18 — ~~posterior~~ hecho (MVP plantillas)

Plantillas de plataformas implementadas como delta de [SPEC-18 §10](./18-recurring-transactions.md):

- [x] Precio lista USD + **% markup editable** (sugerido ~23% IVA+IIBB; disclaimer; no verdad legal). Markup en **basis points** en dominio.
- [x] TC del wizard: editable; rellenar desde oficial/MEP del snapshot — **no** usar `tarjeta` del feed como impuestos.
- [x] Persistir `RecurringRule` con monto fijo en moneda de la cuenta (como hoy). Recalc live al materializar = fase 2 de recurrentes.
- [ ] Entidad `Subscription` — fuera de alcance (no prevista en MVP).
