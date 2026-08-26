# Spec 21 — Email transaccional y marketing (Resend)

| Campo        | Valor                                                      |
| ------------ | ---------------------------------------------------------- |
| ID           | SPEC-21                                                    |
| Estado       | In progress                                                |
| Prioridad    | P0 (reset de contraseña) / P1 (marketing)                  |
| Dependencias | SPEC-01 (FR-06 reset password); SPEC-17 (landing, captura) |
| Issue        | KRI-17                                                     |

## 1. Contexto

El reset de contraseña de Better Auth genera el token pero **no enviaba email en producción** (stub + log en desarrollo). Hace falta un proveedor de email para:

1. **Transaccional:** recuperación de contraseña (SPEC-01 FR-06).
2. **Marketing:** novedades de producto a quienes se suscriben con consentimiento explícito.

Esta spec fija **Resend** como proveedor y la forma de integrarlo.

## 2. Viabilidad y alternativa de integración

**Viable.** Resend cubre envío transaccional (`emails.send`), audiencias (`contacts` + `segments`) y campañas (`broadcasts`), con SDK Node ≥ 6.14, idempotencia y webhooks.

### MCP de Resend

Resend publica un **MCP oficial** para Cursor (templates, dominios, contactos, envíos de prueba desde el IDE). Requiere autenticación en Cursor. **No** es el canal de runtime de la app: el API key del MCP no sustituye `RESEND_API_KEY` del servidor y el MCP no corre en Vercel.

### Alternativa recomendada (esta implementación)

| Uso                                       | Canal                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------- |
| Runtime de producto (reset, alta a lista) | **SDK `resend` en servidor** (`src/lib/resend.ts` + `features/email`) |
| Campañas / copys / DNS                    | **Dashboard de Resend** (operadores)                                  |
| Operación desde Cursor                    | MCP Resend (opcional, autenticado)                                    |
| SMTP genérico / Supabase Auth mailer      | **No.** Auth de producto es Better Auth; no añadir un segundo mailer  |

Invitaciones de workspace y verificación de email quedan **fuera** (SPEC-02 P2; KRI-23). Reutilizarán el mismo gateway cuando se implementen.

## 3. Actores

- Visitante que olvidó la contraseña
- Visitante que quiere novedades (sin cuenta)
- Operador que envía un broadcast (Dashboard o servicio de servidor)
- Sistema (Better Auth `sendResetPassword`)

## 4. Historias de usuario

1. Como usuario con password, quiero recibir un email con un enlace de reset para recuperar el acceso.
2. Como visitante, quiero dejar mi email en la landing para recibir novedades, y darme de baja después.
3. Como operador, quiero enviar un broadcast a quienes optaron, con enlace de baja.

## 5. Requisitos funcionales

| ID    | Requisito                                                                                                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------- |
| FR-01 | `sendResetPassword` de Better Auth envía un email transaccional vía Resend                                             |
| FR-02 | El email de reset incluye URL, vencimiento (~1 h), aviso de “si no lo pediste” y **no** lleva unsubscribe de marketing |
| FR-03 | Fallos de envío se registran y **no** se exponen al cliente (sin enumeración de emails)                                |
| FR-04 | Sin `RESEND_API_KEY`: en desarrollo se loguea el contenido; en producción se registra error y no se envía              |
| FR-05 | Alta a novedades desde la landing con opt-in explícito (submit del form)                                               |
| FR-06 | Contactos de marketing viven en Resend (segmento `RESEND_MARKETING_SEGMENT_ID`)                                        |
| FR-07 | Broadcasts de marketing incluyen `{{{RESEND_UNSUBSCRIBE_URL}}}`                                                        |
| FR-08 | Env vars solo en `src/lib/env.ts`                                                                                      |
| FR-09 | El SDK se llama **solo en servidor** (no CORS / no key en el cliente)                                                  |

## 6. Reglas de negocio

1. Transaccional ≠ marketing. Un reset **nunca** lleva copy promocional ni unsubscribe de newsletter.
2. Marketing **exige consentimiento explícito**. Crear cuenta **no** suscribe a novedades.
3. Normalización de email: trim + lowercase.
4. Idempotencia de reset: `password-reset/<userId>/<token[:16]>` para reintentos sin duplicar el mismo token.
5. HTML de reset escapa nombre y URL (contenido no confiable).
6. Mensaje público de forgot-password sigue siendo genérico (SPEC-01 §5).

## 7. Comandos y consultas

| Tipo    | Nombre                      | Input                               | Output                |
| ------- | --------------------------- | ----------------------------------- | --------------------- |
| Command | `SendPasswordResetEmail`    | userId, email, name?, url, token    | `{ ok, id \| error }` |
| Command | `SubscribeMarketingContact` | email, explicitOptIn=true           | `{ ok }`              |
| Command | `SendMarketingBroadcast`    | name, subject, htmlBody, segmentId? | `{ ok, id }`          |

`SendMarketingBroadcast` es servicio de servidor (operadores / Dashboard). No hay action pública para que un usuario de producto dispare un broadcast.

## 8. Criterios de aceptación

- [x] Viabilidad de Resend y alternativa de integración documentadas (MCP vs SDK).
- [x] Reset de contraseña sale por Resend cuando hay API key.
- [x] Marketing: opt-in a segmento + envío de broadcasts con unsubscribe.
- [x] Integración en `features/email` + `lib/resend.ts` + guía.

## 9. Escenarios de test (TDD)

### T-01 Reset transaccional

- **Given** user + URL https de reset
- **When** `buildPasswordResetEmail` / `sendPasswordResetEmail`
- **Then** kind=transactional, HTML/texto incluyen la URL, no hay placeholder de unsubscribe, idempotency key estable por token

### T-02 URL inválida

- **Given** URL vacía o `javascript:`
- **When** `buildPasswordResetEmail`
- **Then** `MissingResetUrlError`

### T-03 Consentimiento

- **Given** `explicitOptIn=false`
- **When** `normalizeMarketingSubscribe`
- **Then** `MarketingConsentRequiredError`; no se llama al gateway

### T-04 Broadcast

- **Given** HTML de campaña y `segmentId`
- **When** `prepareMarketingBroadcast` / `sendMarketingBroadcast`
- **Then** el HTML incluye `{{{RESEND_UNSUBSCRIBE_URL}}}` y se hace create + send

### T-05 Sin segmento

- **Given** broadcast sin `segmentId`
- **When** `prepareMarketingBroadcast`
- **Then** `MissingMarketingSegmentError`

## 10. Fuera de alcance

- Verificación de email al registrarse (KRI-23)
- Email de invitación a workspace (SPEC-02 P2)
- Double opt-in / preference center
- UI de admin para componer campañas (usar Dashboard)
- Inbound email / webhooks de bounce (seguir suppression list de Resend)
- Dominio custom verificado (ops; ver guía)

## 11. Notas de implementación

- Gateway inyectable: tests con fake; runtime Resend o console.
- `from` de producción debe coincidir con un dominio verificado (no `resend.dev` salvo sandbox).
- Guía: [guides/email-resend.md](../guides/email-resend.md). ADR: [008](../adr/008-resend-email.md).
