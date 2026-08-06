# Spec 01 — Autenticación y perfil

| Campo | Valor |
|-------|-------|
| ID | SPEC-01 |
| Estado | Draft |
| Prioridad | P0 |
| Dependencias | — |

## 1. Contexto

Los usuarios deben autenticarse para acceder a sus workspaces y datos financieros. El perfil guarda preferencias que afectan periodos y formato (timezone, moneda preferida).

Además de email/password, el MVP incluye **Continuar con Google** (OAuth) como opción extra en login y registro. No reemplaza email/password.

## 2. Actores

- Visitante (no autenticado)
- Usuario autenticado

## 3. Historias de usuario

1. Como visitante, quiero registrarme con email y contraseña para empezar a usar la app.
2. Como visitante, quiero iniciar sesión para acceder a mis datos.
3. Como usuario, quiero cerrar sesión.
4. Como usuario, quiero editar mi nombre, moneda preferida y zona horaria.
5. Como usuario, quiero recuperar mi contraseña si la olvidé.
6. Como visitante, quiero continuar con Google desde `/login` o `/registro` para entrar sin crear una contraseña.
7. Como visitante que ya tengo cuenta por email, quiero continuar con Google (mismo email verificado por Google) y entrar a mi cuenta existente sin inventar otra ni pedir password.
8. Como invitado a un grupo, quiero completar el registro o login con Google sin perder el token de invitación, siempre que el email de Google coincida con el de la invitación.

## 4. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Registro con email + password (mín. 8 caracteres) |
| FR-02 | Login con email + password |
| FR-03 | Logout invalida la sesión actual |
| FR-04 | Sesión persistente vía cookies httpOnly (SSR-friendly) |
| FR-05 | Actualizar `displayName`, `preferredCurrency`, `timezone` |
| FR-06 | Flujo de reset de password por email |
| FR-07 | Al registrarse (email/password **o** primer login Google con email nuevo), crear automáticamente un Workspace `personal` con membership `owner` |
| FR-08 | Tras registro exitoso (sin invitación pendiente que deje otro activo), la UI navega a `/onboarding` (SPEC-15) |
| FR-09 | Botón **Continuar con Google** en `/login` y `/registro` (mismo flujo OAuth) |
| FR-10 | Proveedor Google vía Better Auth (`socialProviders.google`); callback `/api/auth/callback/google` |
| FR-11 | Account linking seguro (decisión 1.B): si ya existe User con el mismo email (case-insensitive) y Google confirma el email como verificado → linkear la identidad Google a ese User e iniciar sesión; **no** pedir password; **no** bloquear aunque `emailVerified` en Finance Hub sea `false` |
| FR-12 | OAuth operativo en local, Preview Vercel y Production (redirect URIs y trusted origins documentados en stack) |
| FR-13 | Usuario solo-Google (sin credential password): “olvidé contraseña” muestra mensaje claro de que no hay contraseña; no inventar ni forzar password |
| FR-14 | Login email/password fallido con Google habilitado: copy que sugiere Continuar con Google si la cuenta se creó solo con Google (sin enumerar existencia de email) |
| FR-15 | PWA instalada (`standalone`): Continuar con Google usa GIS `id_token` in-page cuando hay `GOOGLE_CLIENT_ID`; fallback a redirect OAuth si GIS no completa |

## 5. Reglas de negocio

### Identidad

1. **Un email = un User** (comparación case-insensitive; normalización lowercase en persistencia).
2. Un User puede tener credential `credential` (password) y/o cuenta OAuth `google` (modelo Better Auth `Account`). Varios métodos, misma `userId`.
3. **Prohibido** usar Supabase Auth como login de producto.

### Alta / login con Google

4. **Primer login Google con email nuevo:** crear User + mismos efectos laterales que el registro email/password:
   - Workspace `personal` + membership `owner`
   - `acceptPendingInvitationsForEmail` (hook `user.create.after` en `src/lib/auth.ts`)
   - Defaults de perfil: `preferredCurrency` / `timezone` iguales al registro actual (`ARS`, `America/Argentina/Buenos_Aires` salvo cambio global acordado)
   - Nombre / avatar: tomar de Google si el proveedor los expone; mapear a `displayName` / campos de imagen según modelo Better Auth
5. **Login Google con email ya existente + link seguro (1.B):** misma `userId`; **no** recrear workspace personal; **no** volver a ejecutar efectos de “usuario nuevo” que dupliquen memberships/workspaces.
6. **Al linkear:** no sobrescribir `displayName`, `preferredCurrency`, `timezone` ni otras preferencias ya guardadas del usuario.
7. Linking 1.B **no exige** que el User tenga `emailVerified === true` en Finance Hub si Google reporta el email como verificado (trusted provider).
8. Si el email de Google **no** está verificado por Google → **no** linkear a un User existente; el flujo debe fallar de forma segura (sin fusionar cuentas). Detalle de UX: mensaje genérico / reintento; no revelar datos de otras cuentas.

### Invitaciones (con OAuth)

9. El flujo OAuth debe preservar el token de invitación (cookie `fh-invite-token` y/o `callbackURL` / query — misma estrategia que el path email).
10. El email de la cuenta Google debe **coincidir** (case-insensitive) con el email de la invitación; misma regla que registro/login por email (SPEC-02).
11. Si el email no coincide → no aceptar la invitación automáticamente; el usuario queda autenticado en su propia identidad pero sin membership del invite (comportamiento alineado al path email).

### Password reset

12. No exponer si un email existe en respuestas de login fallido o de request reset (mensaje genérico en superficie pública), **excepto** que un usuario autenticado o un flujo post-identificación de “solo Google” puede recibir copy claro de producto: no hay contraseña asociada; usar Continuar con Google (sin inventar password).
13. Preferencias de perfil no cambian datos históricos; afectan solo defaults y agregaciones futuras basadas en timezone.

## 6. Comandos y consultas

| Tipo | Nombre | Input | Output |
|------|--------|-------|--------|
| Command | `RegisterUser` | email, password, displayName? | userId, workspaceId |
| Command | `LoginUser` | email, password | session |
| Command | `LoginWithGoogle` | (OAuth redirect; callbackURL opcional) | session (vía Better Auth) |
| Command | `LogoutUser` | — | void |
| Command | `UpdateProfile` | displayName?, preferredCurrency?, timezone? | User |
| Command | `RequestPasswordReset` | email | void (siempre OK en superficie pública) |
| Command | `ResetPassword` | token, newPassword | void |
| Query | `GetCurrentUser` | — | User \| null |

`LoginWithGoogle` es orquestación Better Auth (cliente `signIn.social` + callback); los efectos de dominio al **crear** User siguen siendo los del hook `user.create.after`. El linking a User existente lo resuelve Better Auth con account linking + Google como trusted provider.

## 7. Criterios de aceptación

- [ ] Registro crea User + Workspace personal + Membership owner en una sola operación atómica.
- [ ] Login inválido no revela si el email existe.
- [ ] `GetCurrentUser` funciona en Server Components / Server Actions.
- [ ] UpdateProfile valida currency (ISO 4217) y timezone (IANA).
- [x] Post-registro: redirect a `/onboarding` (SPEC-15).
- [ ] Botón Continuar con Google visible en `/login` y `/registro`.
- [ ] Primer Google con email nuevo → User + workspace personal + owner + auto-accept invites (mismo hook que signUp).
- [ ] Google con email existente + email verificado por Google → misma `userId`; sin segundo workspace personal.
- [ ] Linking no pisa `displayName` / preferencias existentes.
- [ ] Invite + OAuth: token preservado; email Google debe coincidir con invite.
- [ ] Usuario solo-Google: forgot-password con mensaje claro (sin inventar password).
- [ ] Login fallido con Google habilitado sugiere Continuar con Google (FR-14).
- [ ] PWA standalone: Google vía GIS id_token con fallback a redirect (FR-15).
- [ ] OAuth usable en local, Preview y Production con redirect URIs + JS origins correctos.
- [ ] No hay pantalla de “métodos de acceso” en Ajustes (fuera de MVP).

## 8. Escenarios de test (TDD)

### T-01 Registro exitoso

- **Given** email no registrado  
- **When** `RegisterUser`  
- **Then** user creado, workspace personal creado, membership owner

### T-02 Email duplicado

- **Given** email ya registrado  
- **When** `RegisterUser`  
- **Then** error `EmailAlreadyInUse`

### T-03 Password débil

- **Given** password de 4 caracteres  
- **When** `RegisterUser`  
- **Then** error de validación

### T-04 Login OK / KO

- **Given** usuario existente  
- **When** password correcta → sesión; incorrecta → error genérico

### T-05 UpdateProfile

- **Given** usuario autenticado  
- **When** cambia timezone a `America/Argentina/Buenos_Aires`  
- **Then** perfil actualizado

### T-06 Reset password

- **Given** token válido  
- **When** `ResetPassword`  
- **Then** puede login con nueva password; token invalidado

### T-07 Primer login Google (email nuevo)

- **Given** no existe User con ese email  
- **When** completa OAuth Google con email verificado por Google  
- **Then** User creado; workspace personal + membership owner; se ejecuta `acceptPendingInvitationsForEmail`; defaults de currency/timezone como registro; nombre/avatar desde Google si aplica; sesión iniciada; navegación post-alta alineada a registro (p. ej. `/onboarding` si aplica SPEC-15)

### T-08 Login Google con cuenta existente (linking 1.B)

- **Given** User existente con email `a@b.com` creado por password, `emailVerified = false` en Finance Hub, y un solo workspace personal  
- **When** completa OAuth Google con el mismo email verificado por Google  
- **Then** sesión con la misma `userId`; Account Google linkeada; **no** se crea un segundo workspace personal; `displayName` y preferencias previas intactas

### T-09 Google no verificado no linkea

- **Given** User existente con email `a@b.com`  
- **When** OAuth Google devuelve el mismo email **sin** verificación por Google  
- **Then** no se fusiona con el User existente (no linking); no se sobrescribe el User

### T-10 Invite + Google (email coincide)

- **Given** invitación `pending` para `invitado@ejemplo.com` y cookie/query de token preservado en el flujo OAuth  
- **When** primer login Google (o linking) con ese email verificado  
- **Then** membership del grupo creada (auto-accept); workspace personal existe una sola vez; token de invite consumido según SPEC-02

### T-11 Invite + Google (email no coincide)

- **Given** invitación pending para `invitado@ejemplo.com`  
- **When** el usuario autentica con Google usando `otro@ejemplo.com`  
- **Then** no se acepta esa invitación; el User de `otro@ejemplo.com` no obtiene membership del invite

### T-12 No duplicar workspace al re-login Google

- **Given** User que ya entró una vez con Google (ya tiene workspace personal)  
- **When** vuelve a Continuar con Google  
- **Then** misma `userId`; cantidad de workspaces `personal` del usuario sigue siendo 1

### T-13 Forgot password — usuario solo-Google

- **Given** User que solo tiene Account `google` (sin password credential)  
- **When** solicita recuperación de contraseña (o llega al flujo forgot)  
- **Then** copy de producto indica que no hay contraseña / debe usar Continuar con Google; no se inventa ni setea password automáticamente

### T-14 Login email tras alta solo-Google (UX)

- **Given** User creado solo con Google (sin credential) y Google OAuth habilitado en la UI  
- **When** intenta login con email + cualquier password  
- **Then** el login falla (sin credential) y el mensaje sugiere usar Continuar con Google; no revela si el email “existe” más allá del copy genérico ya usado en login fallido

### T-15 Google en PWA standalone

- **Given** app instalada con `display: standalone` y GIS disponible  
- **When** Continuar con Google  
- **Then** se intenta `signIn.social` con `idToken` (sin salir del contexto de la PWA); si GIS no completa, fallback a redirect OAuth

## 9. Fuera de alcance

- Apple Sign In / otros providers sociales
- Google One Tap / FedCM automático
- Scopes de Gmail u otros más allá del perfil OAuth básico (openid / email / profile)
- Pantalla de gestión de “métodos de acceso” en Ajustes (vincular/desvincular providers) — post-MVP
- 2FA
- Organización enterprise SSO
- Supabase Auth como login de producto (prohibido; usar Better Auth)

## 10. Notas de implementación

- **Better Auth** — única auth de producto (email/password **y** Google social). **No** Supabase Auth.
- Infra: `src/lib/auth.ts`, `session.ts`, `auth-client.ts`, `app/api/auth/[...all]/route.ts` (patrón Siturn).
- Modelos `User` / `Session` / `Account` / `Verification` vía `npm run auth:generate` + Prisma (`Account` ya existe para credentials/OAuth).
- Config esperada (hand-off ingeniería; no inventar APIs distintas del producto):
  - `socialProviders.google` con `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (vía `src/lib/env.ts`)
  - Account linking habilitado; Google como **trusted provider**; `requireLocalEmailVerified: false` (decisión 1.B — sin esto Better Auth rechaza con `account_not_linked` a users password sin email verificado)
  - Cliente: `signIn.social({ provider: "google", callbackURL })` desde `/login` y `/registro`; en PWA standalone, preferir `idToken` vía Google Identity Services (Authorized JavaScript origins) y fallback a redirect
  - Redirect URI en Google Cloud Console: `{origin}/api/auth/callback/google` para local, Production y Previews (`*.vercel.app`, dominios krivoox) — ver [stack.md](../stack.md)
  - `account.skipStateCookieCheck: true` para tolerar pérdida de cookie de state en PWA/Safari cuando el Verification en DB es válido
- Tras **creación** de User (email signUp **o** primer OAuth): hook `user.create.after` → Workspace `personal` + Membership `owner` + `acceptPendingInvitationsForEmail`. El linking a User existente **no** debe disparar ese create.
- UI MVP: botón en `/login` y `/registro` con RHF + Zod para el path email; sin lógica de negocio en el formulario; sin pantalla de métodos en Ajustes.
- Invites: preservar `fh-invite-token` / `callbackURL` a través del redirect OAuth (mismo contrato que path email).
- `getSession` y `getCurrentUser` usan `React.cache` (memo por request RSC): layout y página comparten una sola resolución de sesión/perfil. No hay cache entre navegaciones — ver [architecture.md §7.1](../architecture.md).

### Frontera domain vs service / Better Auth

| Responsabilidad | Capa |
|-----------------|------|
| Unicidad de email, efectos al **crear** User (personal workspace, invites) | Ya orquestado en hook + services; reglas de “un personal por alta” / no duplicar al linkear = invariantes de producto a proteger en servicio/hook (no recrear si User ya existía) |
| Protocolo OAuth, tokens Google, account linking | Better Auth (infra) — no dominio puro |
| Validación de perfil (currency/timezone) | Domain / schemas existentes |
| Authz de sesión en actions | `getSession` + Zod (capa application) |
