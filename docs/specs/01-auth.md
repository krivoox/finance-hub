# Spec 01 — Autenticación y perfil

| Campo | Valor |
|-------|-------|
| ID | SPEC-01 |
| Estado | Draft |
| Prioridad | P0 |
| Dependencias | — |

## 1. Contexto

Los usuarios deben autenticarse para acceder a sus workspaces y datos financieros. El perfil guarda preferencias que afectan periodos y formato (timezone, moneda preferida).

## 2. Actores

- Visitante (no autenticado)
- Usuario autenticado

## 3. Historias de usuario

1. Como visitante, quiero registrarme con email y contraseña para empezar a usar la app.
2. Como visitante, quiero iniciar sesión para acceder a mis datos.
3. Como usuario, quiero cerrar sesión.
4. Como usuario, quiero editar mi nombre, moneda preferida y zona horaria.
5. Como usuario, quiero recuperar mi contraseña si la olvidé.

## 4. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Registro con email + password (mín. 8 caracteres) |
| FR-02 | Login con email + password |
| FR-03 | Logout invalida la sesión actual |
| FR-04 | Sesión persistente vía cookies httpOnly (SSR-friendly) |
| FR-05 | Actualizar `displayName`, `preferredCurrency`, `timezone` |
| FR-06 | Flujo de reset de password por email |
| FR-07 | Al registrarse, crear automáticamente un Workspace `personal` con membership `owner` |
| FR-08 | Tras registro exitoso (sin invitación pendiente que deje otro activo), la UI navega a `/onboarding` (SPEC-15) |

## 5. Reglas de negocio

- Email único (case-insensitive).
- No exponer si un email existe en respuestas de login fallido (mensaje genérico).
- Preferencias de perfil no cambian datos históricos; afectan solo defaults y agregaciones futuras basadas en timezone.

## 6. Comandos y consultas

| Tipo | Nombre | Input | Output |
|------|--------|-------|--------|
| Command | `RegisterUser` | email, password, displayName? | userId, workspaceId |
| Command | `LoginUser` | email, password | session |
| Command | `LogoutUser` | — | void |
| Command | `UpdateProfile` | displayName?, preferredCurrency?, timezone? | User |
| Command | `RequestPasswordReset` | email | void (siempre OK) |
| Command | `ResetPassword` | token, newPassword | void |
| Query | `GetCurrentUser` | — | User \| null |

## 7. Criterios de aceptación

- [ ] Registro crea User + Workspace personal + Membership owner en una sola operación atómica.
- [ ] Login inválido no revela si el email existe.
- [ ] `GetCurrentUser` funciona en Server Components / Server Actions.
- [ ] UpdateProfile valida currency (ISO 4217) y timezone (IANA).
- [x] Post-registro: redirect a `/onboarding` (SPEC-15).

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

## 9. Fuera de alcance

- OAuth social (Google/Apple) — fase posterior
- 2FA
- Organización enterprise SSO
- Supabase Auth como login de producto (prohibido; usar Better Auth)

## 10. Notas de implementación

- **Better Auth** (email/password) — única auth de producto. **No** Supabase Auth.
- Infra: `src/lib/auth.ts`, `session.ts`, `auth-client.ts`, `app/api/auth/[...all]/route.ts` (patrón Siturn).
- Modelos `User` / `Session` / `Account` / `Verification` vía `npm run auth:generate` + Prisma.
- Tras `signUp` exitoso (hook/servicio servidor): crear Workspace `personal` + Membership `owner` — esa orquestación se testea en dominio/servicio, no en el Client Component.
- UI: `/login`, `/registro` con RHF + Zod; sin lógica de negocio en el formulario.
- `getSession` y `getCurrentUser` usan `React.cache` (memo por request RSC): layout y página comparten una sola resolución de sesión/perfil. No hay cache entre navegaciones — ver [architecture.md §7.1](../architecture.md).
