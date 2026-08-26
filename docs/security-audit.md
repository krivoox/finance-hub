# Auditoría de seguridad — Finance Hub

| Campo | Valor |
|-------|-------|
| Origen | [KRI-16](https://linear.app/krivoox-desa/issue/KRI-16/analisis-de-seguridad) |
| Fecha | 2026-08-13 |
| Alcance | Código (`src/`, Prisma, Next/Vercel), auth (Better Auth), Supabase/Postgres, frontend/PWA |
| Método | Revisión estática del repo. **No** se pudo consultar advisors/RLS en vivo (MCP Supabase sin autenticar). |

Este documento es la fuente de verdad del hallazgo. Las tareas de remediación viven como subtareas de [KRI-16](https://linear.app/krivoox-desa/issue/KRI-16/analisis-de-seguridad):

| P | Issue | Título |
|---|-------|--------|
| P0 | [KRI-18](https://linear.app/krivoox-desa/issue/KRI-18/p0-lockdown-supabase-rls-deny-all-y-data-api) | Lockdown Supabase: RLS deny-all y Data API |
| P0 | [KRI-19](https://linear.app/krivoox-desa/issue/KRI-19/p0-authz-en-twins-cross-workspace-updatedelete) | Authz en twins cross-workspace (update/delete) |
| P1 | [KRI-20](https://linear.app/krivoox-desa/issue/KRI-20/p1-headers-de-seguridad-csp-clickjacking-nosniff) | Headers de seguridad (CSP, clickjacking, nosniff) |
| P1 | [KRI-21](https://linear.app/krivoox-desa/issue/KRI-21/p1-endurecer-cron-usd-quotes-secret-timing-safe-middleware) | Endurecer cron USD quotes |
| P1 | [KRI-22](https://linear.app/krivoox-desa/issue/KRI-22/p1-hashear-tokens-de-invitacion-at-rest) | Hashear tokens de invitación at rest |
| P1 | [KRI-23](https://linear.app/krivoox-desa/issue/KRI-23/p1-email-transaccional-reset-de-password-y-verificacion) | Email transaccional: reset y verificación |
| P2 | [KRI-24](https://linear.app/krivoox-desa/issue/KRI-24/p2-endurecer-better-auth-origins-rate-limit-oauth) | Endurecer Better Auth |
| P2 | [KRI-25](https://linear.app/krivoox-desa/issue/KRI-25/p2-unificar-safecallbackurl-y-validar-cookie-de-invite) | Unificar safeCallbackUrl |
| P3 | [KRI-26](https://linear.app/krivoox-desa/issue/KRI-26/p3-higiene-cliente-supabase-muerto-logs-prod-npm-audit) | Higiene: cliente Supabase, logs, npm audit |

---

## Resumen ejecutivo

Finance Hub aísla datos de producto **en el servidor** (Better Auth + `getSession` + `requireMembership` + Prisma). Eso es sólido para Server Actions. El riesgo más grave no está en la UI: está en **Supabase como Postgres expuesto**.

La arquitectura exige RLS como defensa en profundidad (`docs/architecture.md` §7, `docs/stack.md`). **KRI-18:** migración `20260813200000_rls_deny_all_lockdown` habilita RLS deny-all en `public`, revoca grants a `anon`/`authenticated` y saca `public` de PostgREST (`postgrest_locked`). Queda un paso de dashboard (Data API off o schemas expuestos) tras `migrate deploy`.

| Severidad | Cantidad | Tema |
|-----------|----------|------|
| Crítica | 2 abiertas + 1 remediada en código | Data API: lockdown SQL (KRI-18); twins cross-workspace (update/delete) |
| Alta | 5 | Headers/CSP/clickjacking; cron; tokens de invite en claro; reset password sin email |
| Media | 8 | Origins demasiado anchos; OAuth state; rate limit en memoria; redirects |
| Baja | 6 | Validación de cookies públicas; logging; clientes Supabase muertos; npm audit |

**Fortalezas a conservar:** patrón consistente `getSession` + Zod + membership en ~49/51 actions; tokens de invite criptográficamente aleatorios (256 bit); cookies de producto `httpOnly` + `SameSite=lax`; Service Worker alineado a SPEC-20 (no cachea saldos ni `/api/*`); `SUPABASE_SERVICE_ROLE_KEY` no existe en `env.ts` ni en código.

---

## 1. Supabase / Postgres (crítico)

### 1.1 RLS + Data API (KRI-18)

**Severidad: crítica** (hallazgo original) · **Estado: remediado en código; dashboard pendiente de confirmar**

Hallazgo original: Prisma mapea negocio y Better Auth a `public` (`user`, `session`, `account`, `workspace`, `transaction`, …) **sin** RLS. Con Data API (PostgREST) activa, `NEXT_PUBLIC_SUPABASE_ANON_KEY` podía leer/escribir esas tablas sin pasar por Next.js.

**Remediación aplicada (migración `20260813200000_rls_deny_all_lockdown`):**

1. `ENABLE ROW LEVEL SECURITY` en todas las tablas `public` (función `apply_rls_lockdown_to_public_tables`; re-ejecutarla tras cada `CREATE TABLE` nuevo).
2. Política restrictiva `deny_anon_authenticated` (`USING (false)` / `WITH CHECK (false)`) para `anon` y `authenticated`.
3. `REVOKE ALL` (tablas, sequences, functions) y `REVOKE USAGE` de `public` a `anon` / `authenticated` / `PUBLIC`; default privileges alineados.
4. Schema vacío `postgrest_locked` y `ALTER ROLE authenticator SET pgrst.db_schemas = 'postgrest_locked'` (PostgREST no lista `public`).
5. `createSupabaseBrowserClient` eliminado. `createSupabaseServerClient` queda `server-only` para un Storage futuro con RLS propio.
6. `SUPABASE_SERVICE_ROLE_KEY` quitado de `src/lib/env.ts`.

Prisma sigue usando `DATABASE_URL` (rol con `BYPASSRLS`). No se usa `FORCE ROW LEVEL SECURITY`.

**Paso operativo (dashboard, no automatizable sin MCP/CLI autenticado):**

1. Project Settings → Data API: deshabilitar **o** dejar de exponer `public` (solo `postgrest_locked` / vacío).
2. Database → Policies: RLS on + `deny_anon_authenticated` en cada tabla.
3. Advisors → Security: verdes, o excepciones abajo.

**Excepciones de advisors (documentadas):**

| Lint / advisor | Tratamiento |
|----------------|-------------|
| Auth MFA / leaked-password (Supabase Auth) | N/A — auth de producto es Better Auth |
| `rls_enabled_no_policy` | No aplica si la política deny-all está creada |
| Extensions in `extensions` schema | Fuera de alcance KRI-18 |
| Function search_path de helpers KRI-18 | Fijado a `pg_catalog` en las funciones `SECURITY DEFINER` |

**Verificar en el dashboard de Supabase (manual):**

1. Project Settings → API: Data API off o schemas ≠ `public`.
2. Authentication: el producto **no** usa Supabase Auth.
3. Database → Policies: RLS on en todas las tablas `public`.
4. Roles `anon` / `authenticated`: sin `GRANT` sobre tablas de dinero.
5. Advisors de seguridad (lints).

### 1.2 Prisma bypasa RLS

El pool (`src/lib/prisma.ts`) usa la connection string de Postgres. Ese rol (típicamente `postgres` o un user de Prisma) es **bypass de RLS**. Correcto para el monolito; implica que **toda** la authz tiene que vivir en services. Un bug de membership = fuga de tenant.

---

## 2. Autorización de aplicación

### 2.1 Twins cross-workspace — update sin membership

**Severidad: crítica**  
`src/features/transactions/services/update-transaction.ts` (~213–239)

Tras editar un movimiento, se sincroniza el twin de contribución en **otro workspace** con `prisma.transaction.update({ where: { id: twinId } })` **sin** `requireMembership` ni chequeo de rol en el workspace destino.

Un usuario que ya no es miembro del workspace B puede mutar el ledger de B editando el movimiento vinculado en A.

**Fix:** cargar `twin.workspaceId`, exigir membership + `assertCanMutateTransactions` en ambos lados, en la misma `$transaction`.

### 2.2 Twins cross-workspace — delete si no hay membership

**Severidad: crítica**  
`src/features/transactions/services/delete-transaction.ts` (~126–150)

El comentario dice verificar derechos en el twin, pero si `twinMembership` es `null` (el usuario salió del otro grupo) **igual se borra** el movimiento ajeno.

**Fix:** si no hay membership o el rol no puede mutar → `ForbiddenError`. No cascade-delete el twin.

### 2.3 Server Actions — patrón general

**Bien:** 49/51 actions llaman `getSession()` y delegan authz al service (`requireMembership` / `require*Membership`). IDs de recurso se resuelven por ID y luego se verifica el `workspaceId` de la fila (no se fía del `workspaceId` del cliente como única fuente).

**Excepciones (aceptables si se endurecen):**

| Action | Riesgo | Fix |
|--------|--------|-----|
| `rememberInviteTokenAction` | Sin sesión, sin Zod; cookie `httpOnly` con string arbitrario | Validar `^[a-f0-9]{64}$`; opcionalmente que el token exista |
| `signInGoogleIdTokenAction` | Login público; solo `trim()` | Zod `z.string().min(1).max(8192)` |

### 2.4 Invitaciones

| Aspecto | Estado |
|---------|--------|
| Entropía | Bien: `randomBytes(32)` hex |
| Almacenamiento | **Alto:** token en claro en `Invitation.token` |
| TTL | Bien: 7 días |
| Binding | Bien: email de sesión debe coincidir |
| Preview pública | Quien tenga el token ve email + nombre de workspace + rol |

**Fix:** guardar `SHA-256(token)`; el token crudo solo en el link. No devolver el token crudo en el JSON de la action si la UI puede usar `inviteUrl` armada en servidor.

---

## 3. Auth (Better Auth)

Archivo: `src/lib/auth.ts`.

| Hallazgo | Severidad | Notas |
|----------|-----------|--------|
| `trustedOrigins` incluye `https://*.vercel.app` y `https://*.krivoox.com` en preview/prod | Media | Cualquier deploy `*.vercel.app` es origen CSRF-válido. Acotar a hosts conocidos + `BETTER_AUTH_TRUSTED_ORIGINS`. |
| `skipStateCookieCheck: true` | Media | Mitiga PWA/Safari (`state_security_mismatch`) pero debilita CSRF de OAuth redirect. Limitar a `display-mode: standalone` si es posible. |
| Account linking `requireLocalEmailVerified: false` | Info | Decisión de producto SPEC-01 1.B (Google trusted). Documentado; no cambiar sin producto. |
| Reset password vía Resend | Info (KRI-17) | SPEC-01 FR-06 cableado. Requiere `RESEND_API_KEY`. Verificación de email: KRI-23. |
| `emailVerified` no se exige para usar la app | Media | Email/password sin verificación. Combinado con linking 1.B, un atacante que registre el email de la víctima **antes** podría interferir (ventana de takeover). Mitigar con verificación o “first verified wins”. |
| Rate limit | Media | Defaults de Better Auth en prod (memoria). En serverless el contador se resetea en cold start. Usar `rateLimit.storage: "database"`. |
| `encryptOAuthTokens` no está activo | Baja | Tokens Google en `account` en claro. Activar AES-256-GCM. |
| Cookies de sesión | Bien | `httpOnly`, `secure` en prod, `SameSite=lax` (defaults Better Auth). |
| `BETTER_AUTH_SECRET` | Bien | Mín. 32 chars en producción. |
| CSRF de `/api/auth` | Bien | `disableCSRFCheck` no está desactivado. |
| Middleware | Bien (con matiz) | Solo mira presencia de cookie; las páginas validan `getSession()`. Evita loops. `/api/auth` está excluido del matcher. |

---

## 4. Cron / API

`GET /api/cron/usd-quotes` (`src/app/api/cron/usd-quotes/route.ts`, `vercel.json`).

| Hallazgo | Severidad |
|----------|-----------|
| `CRON_SECRET` es **opcional** incluso en prod (`src/lib/env.ts`). Sin secret, prod responde 401 (bien); fácil de malconfigurar. | Alta |
| Comparación `header === \`Bearer ${secret}\`` no es timing-safe. | Alta |
| Middleware **no** excluye `/api/cron`: un request sin cookie redirige a `/login` **antes** del handler. Vercel Cron puede fallar en silencio. | Alta |
| Sin secret en no-prod, cualquier request que llegue al handler está autorizado. | Media (dev) |

**Fix:** `CRON_SECRET` required in prod (min 32); `timingSafeEqual`; excluir `api/cron` del matcher de middleware (la auth es el Bearer).

---

## 5. Frontend / headers / PWA

### 5.1 Headers de seguridad ausentes — alta

`next.config.ts` solo setea `Cache-Control` (contrato SPEC-20) y `Service-Worker-Allowed`. No hay:

- `Content-Security-Policy` (ni report-only)
- `X-Frame-Options` / `frame-ancestors` → **clickjacking** de login y dashboard
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`
- HSTS explícito (Vercel puede aportar uno; no depender de eso)

Al implementar CSP hay que allowlistear GIS (`https://accounts.google.com`), Analytics/Speed Insights de Vercel y el SW.

### 5.2 XSS — bajo

Único `dangerouslySetInnerHTML`: JSON-LD estático de marketing (`landing-json-ld.tsx`). `JSON.stringify` no escapa `</script>` si el copy deja de ser estático. Escapar `<` → `\u003c`.

No hay `innerHTML` / `eval` / markdown de usuario.

### 5.3 Open redirect — medio/bajo

`safeCallbackUrl` en login rechaza `//` y `/api/*`. `resolveGoogleCallbackURL` acepta cualquier `startsWith("/")`, incluido `//evil.com` si se le pasa unsanitizado. Unificar el helper.

### 5.4 PWA / SW — bien

`public/sw.js`: cache-first solo `/_next/static/*`; HTML network-only; `/api/*` no se intercepta; precache solo `/offline`. Alineado a SPEC-20.

### 5.5 Storage web — bajo

`localStorage`: flags de tips / Cafecito / install prompt.  
`sessionStorage`: draft offline de carga (`amount`, `description`, `date`) — no saldos. Limpiar al logout.

### 5.6 Clickjacking — alta

Sin `X-Frame-Options` ni `frame-ancestors 'none'`. Una página atacante puede iframear login/dashboard.

---

## 6. Secretos y superficie cliente

| Ítem | Estado |
|------|--------|
| `process.env` fuera de `env.ts` | No encontrado en `src/` |
| `NEXT_PUBLIC_*` | URL/anon de Supabase + Cafecito (esperable) |
| `GOOGLE_CLIENT_ID` al cliente | Público (OAuth); restringir orígenes en Google Cloud Console |
| Service role en cliente | No |
| Logs de tokens | Solo `NODE_ENV !== "production"` (reset password, invites) |
| `console.error` de FX quotes | Corre en prod; puede filtrar detalle de DB a logs de Vercel |

---

## 7. Dependencias

`npm audit` reportó vulnerabilidades transitivas (tooling Prisma/Hono, etc.). Re-auditar con `--omit=dev` para el runtime de producción y aplicar `npm audit fix` donde no rompa lockfile.

---

## 8. Lo que está bien (no “arreglar”)

- Tenancy por `workspaceId` + membership en services (ADR-002).
- Viewers bloqueados en mutaciones (dominio).
- Creación de contribuciones cross-workspace valida **ambos** workspaces (el hueco es el sync/delete posterior).
- Splits/settlements validan que las partes sean miembros.
- `staleTimes.dynamic: 0` y SW que no cachea dinero (SPEC-20).
- Auth de producto = Better Auth, no Supabase Auth.

---

## 9. Plan de remediación (prioridad)

Orden de implementación sugerido. Cada ítem es una subtarea Linear.

| P | Issue | Tarea | Tipo |
|---|-------|--------|------|
| P0 | [KRI-18](https://linear.app/krivoox-desa/issue/KRI-18) | Lockdown Supabase: RLS deny-all + Data API off/schema privado | **Hecho en repo**; confirmar dashboard post-migrate |
| P0 | [KRI-19](https://linear.app/krivoox-desa/issue/KRI-19) | Authz en update/delete de twins cross-workspace | Bug |
| P1 | [KRI-20](https://linear.app/krivoox-desa/issue/KRI-20) | Headers: CSP (report-only → enforce), frame-ancestors, nosniff, referrer, HSTS | Hardening |
| P1 | [KRI-21](https://linear.app/krivoox-desa/issue/KRI-21) | Cron: secret obligatorio, timing-safe, excluir del middleware | Bug |
| P1 | [KRI-22](https://linear.app/krivoox-desa/issue/KRI-22) | Hash de tokens de invitación at rest | Hardening |
| P1 | [KRI-23](https://linear.app/krivoox-desa/issue/KRI-23) | Verificación de email (reset ya cubierto por KRI-17 / SPEC-21) | Feature/seguridad |
| P2 | [KRI-24](https://linear.app/krivoox-desa/issue/KRI-24) | Estrechar `trustedOrigins`; rate limit en DB; `encryptOAuthTokens`; acotar `skipStateCookieCheck` | Hardening |
| P2 | [KRI-25](https://linear.app/krivoox-desa/issue/KRI-25) | Unificar `safeCallbackUrl`; validar cookie de invite | Hardening |
| P3 | [KRI-26](https://linear.app/krivoox-desa/issue/KRI-26) | Higiene: borrar cliente Supabase muerto o documentarlo; logs prod; `npm audit` | Chore |

---

## 10. Verificación post-fix (Supabase, manual)

Hasta autenticar MCP / CLI contra el proyecto:

```sql
-- Tablas public sin RLS (debe devolver 0 filas)
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false;

-- Grants a anon/authenticated (debe devolver 0 filas de tablas de producto)
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where grantee in ('anon', 'authenticated')
  and table_schema = 'public';

-- Políticas deny-all
select c.relname, p.polname, p.polcmd
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and p.polname = 'deny_anon_authenticated';
```

En el dashboard: API → desactivar Data API o limitar schemas a `postgrest_locked`; Advisors → Security.
