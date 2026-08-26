# ADR 008 — Email con Resend (SDK servidor)

## Estado

Aceptado

## Contexto

Finance Hub necesita enviar email de recuperación de contraseña (SPEC-01 FR-06) y campañas de novedades. Better Auth no incluye SMTP. Hay un MCP de Resend para Cursor, y alternativas (Nodemailer, Postmark, SES).

## Decisión

Usar **Resend** como único proveedor de email de producto:

1. **Runtime:** SDK Node `resend` (≥ 6.14) en servidor. Cliente en `src/lib/resend.ts`. Lógica en `src/features/email`.
2. **Auth:** callback `emailAndPassword.sendResetPassword` de Better Auth → `sendPasswordResetEmail`.
3. **Marketing:** Contacts + Segment + Broadcasts. Opt-in explícito en la landing. Unsubscribe vía `{{{RESEND_UNSUBSCRIBE_URL}}}`.
4. **MCP Resend:** opcional para operadores/agentes en Cursor. No forma parte del deploy.

No se usa SMTP genérico, ni el mailer de Supabase Auth, ni llamadas a Resend desde el browser.

## Consecuencias

- Variables: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `RESEND_MARKETING_SEGMENT_ID` (Zod en `src/lib/env.ts`).
- Hay que verificar un dominio propio en Resend para producción; `onboarding@resend.dev` es sandbox.
- Invitaciones y verificación de email reutilizarán el mismo gateway cuando se implementen.
- Tests de dominio/servicio con fake gateway; no se testea UI.
