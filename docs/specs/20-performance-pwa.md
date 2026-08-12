# Spec 20 — Performance, navegación y PWA

| Campo | Valor |
|-------|-------|
| ID | SPEC-20 |
| Estado | Implemented (MVP) |
| Prioridad | P0 (sensación Plata) |
| Dependencias | Shell `(app)`, SPEC-05 (cargar), [architecture §7.1–7.3](../architecture.md) |

## 1. Contexto

Benchmark de calidad percibida (referencia de producto: soft-nav rápida tipo Plata.wtf): prefetch del menú, PWA instalable, offline honesto. **Confianza en números > offline completo** — un saldo viejo sin avisar es peor que no mostrar nada.

Finance Hub ya tiene base: Next.js App Router + RSC, `loading.tsx`, `staleTimes.dynamic: 0`, anti-FOUC de theme, PWA install. Esta spec cierra el **contrato** de performance / navegación / PWA.

## 2. Historias de usuario

1. Como miembro en el móvil, quiero que al tocar Panel / Cuentas / Movimientos el shell no parpadee y vea skeleton al instante.
2. Como usuario frecuente, quiero que los destinos del nav ya estén “calientes” al tocar.
3. Como usuario con la app instalada, quiero atajos a gasto / ingreso / cuentas.
4. Como usuario, quiero assets instantáneos y saldos siempre frescos.
5. Como usuario en el subte, quiero abrir el formulario de carga y/o ver “sin conexión”, no un panel con saldos mentidos.

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Soft-nav App Router; sin full document reload en nav autenticada `(app)` |
| FR-02 | Prefetch idle (y opcional intent hover/focus/touchstart) de destinos main / mobile nav |
| FR-03 | `experimental.staleTimes.dynamic: 0` para segmentos de dinero — innegociable |
| FR-04 | Manifest + install prompt + shortcuts: Nuevo gasto, Nuevo ingreso, Cuentas |
| FR-05 | Service Worker **custom**: cache-first **solo** `/_next/static/*`; nunca HTML `(app)` ni `/api/*` |
| FR-06 | Offline: form de cargar + `/offline`; nunca saldos cacheados |
| FR-07 | Analytics / Speed Insights fuera del critical path de interacción |
| FR-08 | Shell persistente (`AppShell`); feedback tip→skeleton &lt;200 ms percibidos |

### Destinos de prefetch (nav principal)

Alinear con `src/components/app-shell/nav-config.ts`:

- `/dashboard`, `/accounts`, `/transactions`, `/transactions/recurring`
- `/budgets`, `/goals`, `/groups`, `/settings` (y entradas del “Más” móvil)

Prefetch calienta shells RSC livianos; **no** implica cachear saldos entre sesiones ni Client Router Cache de listados de dinero.

### Shortcuts PWA (rutas canónicas)

Reutilizar el sheet existente cuando aplique:

| Shortcut | URL sugerida |
|----------|----------------|
| Nuevo gasto | `/transactions?new=expense` |
| Nuevo ingreso | `/transactions?new=income` |
| Cuentas | `/accounts` |

## 4. Reglas / invariantes de producto

1. **Saldos siempre frescos** — mutación → `revalidatePath` + refresh cliente; sin TTL cross-request ni SW de HTML/API.
2. **Offline honesto** — sin red en Panel/Cuentas → `/offline` o mensaje claro; nunca patrimonio stale.
3. **Acción frecuente primero** — registrar gasto/ingreso es el happy path móvil (acceso &lt;2 taps / shortcut OS).
4. Auth sigue **Better Auth**; hosting **Vercel**. No PocketBase, no Caddy self-host, no Workbox “offline app” genérico.

## 5. Criterios de aceptación

### Soft-nav (H1)

- [x] Given estoy en cualquier ruta `(app)`, When toco un ítem del tab bar / sidebar, Then no hay full document reload y el shell permanece.
- [x] Given soft-nav, When el RSC aún no llega, Then veo `loading.tsx` / `PageSkeleton` de inmediato.
- [ ] Meta MVP: tip→skeleton &lt;200 ms; tip→contenido usable &lt;800 ms en 4G bueno (medición manual / Speed Insights).

### Prefetch (H2)

- [x] Given idle tras pintar el shell con red, Then se prefetchan los destinos de §3 (coverage ≥90 % de taps del nav principal = hit o in-flight).
- [x] Prefetch no relaja `staleTimes.dynamic: 0` ni habilita cache TTL de saldos (§7.1).

### Shortcuts (H3)

- [x] `src/app/manifest.ts` incluye los tres shortcuts.
- [x] Given shortcut OS, When abro la PWA, Then aterrizo en el flujo de carga / cuentas (auth o login), sin pantalla intermedia inútil.
- [x] Shortcuts no bypasean roles (viewer → redirect existente).

### Service Worker (H4)

- [x] SW custom (no Workbox offline-first monolítico).
- [x] Cache-first solo `/_next/static/*` (hashed / immutable).
- [x] Nunca en Cache Storage: HTML de dashboards/listados, `/api/*`, flights RSC como source of truth offline.
- [x] Given creo un gasto, When vuelvo al panel, Then saldos reflejan el cambio sin hard reload.

### Offline mínimo (H5)

- [x] Rutas offline: form de cargar (shell dedicado o sheet) + `/offline`.
- [x] Given sin red y abro Panel/Cuentas, Then UI honesta — **no** saldos cacheados.
- [x] MVP draft: no perder input del form en memoria / `sessionStorage`; cola durable IndexedDB = fuera de MVP (P1).

## 6. Escenarios de test

Dominio TDD **solo** si se introduce cola durable de transacciones offline (P1). MVP H5 sin cola → sin tests de dominio nuevos.

Checklist manual / QA:

| ID | Escenario | Expectativa |
|----|-----------|-------------|
| Q-01 | Soft-nav Panel ↔ Movimientos | Sin document reload; skeleton inmediato |
| Q-02 | Network tab tras idle en shell | Prefetch `_rsc` de destinos nav |
| Q-03 | Cache Storage tras instalar SW | Solo static hashed (+ offline/cargar si aplica); cero API |
| Q-04 | Airplane mode → Panel | `/offline` o error honesto; sin patrimonio |
| Q-05 | Shortcut “Nuevo gasto” | Abre flujo `?new=expense` |

## 7. Fuera de alcance

- Offline de dashboards / saldos / listados ledger
- Workbox offline-first genérico
- Cambiar Better Auth / Prisma / Supabase / hosting Vercel
- PocketBase / Caddy / HTTP3 self-host (principio edge del proveedor: sí; copiar stack: no)
- Cola durable offline de txs (P1)
- Filtros de periodo en dashboard vía URL (P1)
- Sustituir Vercel Analytics por Plausible (opcional, no bloquea)

## 8. Métricas de éxito (MVP)

| Métrica | Target |
|---------|--------|
| Soft-nav tip→skeleton | &lt;200 ms |
| Soft-nav tip→contenido usable | &lt;800 ms (4G) |
| Prefetch coverage nav principal | ≥90 % taps |
| Lighthouse PWA installable | Pass |
| Cache policy | 0 HTML/API de dinero en Cache Storage |
| Confianza post-mutación | Panel actualizado tras crear gasto sin hard reload |

## 9. Dependencias

- [architecture.md §7.1–7.3](../architecture.md), [stack.md](../stack.md) (contrato Performance/PWA)
- Rule `.cursor/rules/performance-pwa.mdc`
- SPEC-05 (cargar movimiento), shell `nav-config.ts`, `manifest.ts` existente
