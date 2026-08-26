# Email — Resend (Finance Hub)

Cómo está cableado el envío de correo. Spec: [21-email-resend.md](../specs/21-email-resend.md). ADR: [008](../adr/008-resend-email.md).

## Decisión

**Viable.** Integración recomendada: **SDK Node en servidor**, no el MCP de Resend como runtime.

| Canal                              | Para qué                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| SDK `resend` (`src/lib/resend.ts`) | Reset de contraseña, alta a lista, broadcasts programáticos                       |
| Dashboard de Resend                | Campañas, DNS, audiencias, logs                                                   |
| MCP Resend en Cursor               | Ops/agentes (templates, prueba). Requiere login en Cursor. **No** corre en Vercel |

El MCP existe y es útil para el equipo, pero la API key del MCP no reemplaza `RESEND_API_KEY` de la app.

## Variables (Vercel + `.env.local`)

```env
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=Finance Hub <hello@mail.krivoox.com>
EMAIL_REPLY_TO=hello@krivoox.com
RESEND_MARKETING_SEGMENT_ID=seg_xxxxxxxxx
```

Centralizadas en `src/lib/env.ts`. Sin `RESEND_API_KEY`: desarrollo loguea el mail; producción no envía.

`EMAIL_FROM` por defecto es `Finance Hub <onboarding@resend.dev>` (sandbox: solo llega al email de la cuenta Resend). En producción el dominio del `from` tiene que estar **verificado** (SPF, DKIM, DMARC). Un 403 suele ser dominio no verificado o mismatch (`send.acme.com` verificado vs `user@acme.com`).

## Setup de operador

1. Crear API key en [resend.com/api-keys](https://resend.com/api-keys) (sending + contacts/broadcasts, no sending-only).
2. Verificar dominio en Resend → copiar DNS.
3. Crear un **Segment** “Product updates” y pegar el id en `RESEND_MARKETING_SEGMENT_ID`.
4. Cargar las vars en Vercel (Production y Preview si se quiere probar reset).
5. Probar reset con `delivered@resend.dev` **nunca** con `test@gmail.com` (peor reputación).

## Código

```
src/lib/env.ts                 # vars
src/lib/resend.ts              # cliente SDK
src/lib/auth.ts                # sendResetPassword → Resend
src/features/email/domain/     # TDD: kinds, copy, consent, idempotencia
src/features/email/services/   # gateway + send + runtime
src/features/email/actions/    # subscribeMarketingAction (público)
```

- Transaccional: `sendPasswordResetEmail` (idempotency `password-reset/<userId>/<token[:16]>`).
- Marketing: `subscribeMarketingContact` (opt-in) y `sendMarketingBroadcast` (create + send). El Dashboard es la UI de campaña; no hay action para que un usuario de producto dispare un broadcast.
- Fallos de reset **no** se revelan al cliente (SPEC-01: no enumerar emails).

## Landing

Con `RESEND_API_KEY` seteada, la landing muestra el form “Quiero novedades” (opt-in explícito). Crear cuenta **no** suscribe.

## MCP (Cursor)

En este entorno el servidor MCP `Resend` aparece como `needsAuth` hasta autenticarlo en Cursor. Tras el login se puede gestionar templates/dominios desde el IDE. El producto **sigue** usando el SDK.

## Próximos usos del mismo gateway

- Invitaciones a workspace (SPEC-02, P2)
- Verificación de email (KRI-23)
