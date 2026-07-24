# Spec 17 — Landing de marketing (adquisición)

| Campo | Valor |
|-------|-------|
| ID | SPEC-17 |
| Estado | In progress |
| Prioridad | P0 (adquisición; paralelo al ledger) |
| Dependencias | SPEC-01 (rutas `/registro`, `/login`); session/redirect existente |
| Fuente de positioning | `.agents/product-marketing.md` |
| Brief PM | 2026-07-24 |

## 1. Contexto

Hoy `src/app/page.tsx` redirige ciegamente a `/dashboard`. No hay punto de aterrizaje público, SEO ni funnel de marketing. Quien busca “finanzas del hogar” / “gastos compartidos pareja” / “ARS + USD” no encuentra un documento indexable que explique Finance Hub ni capture registro.

Esta spec define la **landing de marketing en `/`**: captura de clientes, claridad de producto y optimización SEO + AI SEO (AEO/GEO), alineada a la voz y positioning del product marketing context.

**Sin reglas de dinero nuevas.** No toca domain/ledger. No se testea UI con Vitest.

## 2. Actores

- Visitante anónimo (ICP: individuo / pareja / organizador del hogar, AR/LatAm)
- Usuario con sesión activa
- Crawler de búsqueda (Googlebot, Bingbot, …)
- Agente / answer engine (GPTBot, PerplexityBot, ClaudeBot, Google-Extended, …)

**Anti-persona (no hablarles en copy):** traders, ERP fiscal, “solo conectar banco y olvidarse”.

## 3. Historias de usuario

1. Como visitante sin cuenta, quiero entender qué es Finance Hub y crear una cuenta para ordenar las finanzas del hogar.
2. Como usuario con sesión, quiero ir directo a la app al abrir `/`, sin volver a ver marketing.
3. Como motor de búsqueda, quiero indexar la landing con metadata y contenido semántico claros.
4. Como agente de IA, quiero extracciones citables (definición, comparación, FAQ) y un `/llms.txt` sin hype.
5. Como visitante que ya tiene cuenta, quiero iniciar sesión desde la nav de la landing.

## 4. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | `/` sirve landing marketing **SSR/indexable** para visitantes anónimos |
| FR-02 | Si hay sesión válida en `/` → redirect a `/dashboard` (o onboarding si aplica la regla actual de la app) |
| FR-03 | CTA primario → `/registro`; CTA / link secundario → `/login` |
| FR-04 | Secciones v1 en orden: Nav · Hero · Definition · Problem → solution · 3 value themes · Cómo funciona · Comparación (tabla) · Para quién · Early access · FAQ · CTA final · Footer |
| FR-05 | Metadata: title, description, OG, Twitter, canonical |
| FR-06 | Semantic HTML: un solo H1; H2/H3 alineados al SEO brief |
| FR-07 | JSON-LD: `Organization`, `SoftwareApplication`, `FAQPage` (mismas Q&A que el DOM); `WebSite` opcional |
| FR-08 | `robots.txt`: allow crawlers de búsqueda e IA (GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended, Bingbot); disallow rutas privadas de app; sitemap link |
| FR-09 | `sitemap.xml` incluye `/` |
| FR-10 | `/llms.txt` con overview one-liner + links clave + notas honestas (no open banking; pricing TBD / early access) |
| FR-11 | Copy en español (AR/LatAm); voz calmada/precisa/premium; words-to-avoid del product-marketing |
| FR-12 | Mobile-first; tokens `DESIGN.md`; sin purple SaaS genérico; hero brand-first |
| FR-13 | Early access honesto: **sin precios inventados**, sin “gratis para siempre”, sin promesa de sync bancario |
| FR-14 | (P1) `noindex` en `/login` y `/registro` para no competir con la landing |

## 5. Reglas de producto (copy / claims)

- One-liner: *Centro de administración financiera del hogar: cuentas, movimientos, presupuestos y gastos compartidos en un solo lugar.*
- Differentiators permitidos: hogar primero · ledger preciso (centavos) · ARS+USD nativos (canje explícito, consolidación estimada) · claridad · mobile-first.
- **Prohibido en v1:** precios/planes inventados; open banking ya; testimonials/NPS/métricas fake; contenido “solo para AI” separado del humano.
- Pricing: comunicar **acceso temprano / beta**; modelo comercial TBD.
- Privacidad/confianza: auth + workspaces con roles; no pedimos open banking día 1. Detalle legal: [TBD].

## 6. SEO brief (resumen)

| Campo | Valor propuesto |
|-------|-----------------|
| Primary cluster | finanzas del hogar / app finanzas hogar |
| Secondary | control de gastos pareja · presupuesto familiar · gastos compartidos · finanzas personales Argentina |
| Title | `Finance Hub — Centro financiero del hogar` |
| Meta description | `Cuentas, movimientos, presupuestos y gastos compartidos en un solo lugar. Para individuos, parejas y familias. ARS y USD. Acceso temprano.` |
| H1 | El centro financiero del hogar |

### FAQ mínimo (6–8) — deben coincidir DOM + FAQPage

1. ¿Qué es Finance Hub?
2. ¿Para quién es?
3. ¿Reemplaza a la app de mi banco?
4. ¿Tiene sync bancario / open banking?
5. ¿En qué se diferencia de Excel o Splitwise?
6. ¿Soporta pesos y dólares?
7. ¿Cuánto cuesta?
8. ¿Mis datos están seguros?

Respuestas: ver brief PM / copy outline en implementación; mantener ~40–60 palabras en answer blocks clave; honestas sobre beta y sin sync.

### Fan-out queries (cobertura temática en la página)

Qué es Finance Hub · gastos compartidos pareja · finanzas del hogar sin Excel · pesos y dólares · alternativa Splitwise con presupuestos · presupuesto familiar Argentina · saldo real varias cuentas · hogar varios miembros · canje ARS/USD · centro administración financiera del hogar.

## 7. Routing

| Situación | Comportamiento |
|-----------|----------------|
| Anónimo en `/` | Landing SSR |
| Sesión en `/` | Redirect → `/dashboard` (o onboarding) |
| CTA primario | `/registro` |
| CTA secundario | `/login` |
| Middleware | Landing **pública**; no forzar login en `/` |

**Decisión:** landing en `/`; app autenticada sigue en `/dashboard`. No `/home` marketing separado.

## 8. Criterios de aceptación

### US-1 Visitante anónimo

- **Given** llego a `/` sin sesión
- **When** veo la página en móvil
- **Then** hay H1 único, CTA a `/registro`, link a `/login`, y el texto principal es HTML visible sin depender de JS

### US-2 Visitante logueado

- **Given** sesión válida
- **When** abro `/`
- **Then** redirect a `/dashboard` (o onboarding según reglas actuales)

### US-3 SEO crawler

- **Given** fetch de `/` sin JS
- **When** parseo HTML
- **Then** existen title, meta description, canonical, H1, H2s, FAQ en DOM
- **And** `sitemap.xml` lista `/` y `robots.txt` permite crawlers de búsqueda e IA

### US-4 AI agent

- **Given** leo `/` y `/llms.txt`
- **When** busco definición, comparación y FAQ
- **Then** hay answer blocks extractables, tabla vs alternativas, FAQ en lenguaje natural y overview sin hype

## 9. Métricas de éxito (hipótesis — instrumentación TBD)

| Tipo | Métrica |
|------|---------|
| North star producto | Registro → ≥1 cuenta → 1er movimiento **o** invitación (7d) |
| Landing leading | Visitas `/` · CTR CTA · `/` → `/registro` · registro completado |
| SEO leading | Indexación `/` · impresiones/clics GSC |
| AI SEO | Citas/menciones manuales en Perplexity/ChatGPT (cualitativo v1) |
| Calidad | CWV móvil (LCP/INP/CLS) |

No publicar números inventados en la página.

## 10. Fuera de alcance (v1)

- Blog / guías SEO programáticas
- `/pricing` o `/pricing.md` con planes (later cuando haya modelo)
- Testimonials, logos, métricas públicas
- Waitlist (salvo decisión de negocio que cierre registro)
- Video / demo interactiva / screenshots no aprobados
- i18n (pt-BR, en)
- App nativa / stores
- Comparaciones marca-a-marca con claims no verificables
- OKF bundle (P2 opcional; no bloquea v1)

## 11. Prioridad (MoSCoW)

| Prioridad | Ítem |
|-----------|------|
| **P0 Must** | Landing SSR `/` · secciones core + FAQ · CTAs · redirect sesión · metadata · schemas · `robots` + `sitemap` · `/llms.txt` · DESIGN · early access honesto |
| **P1 Should** | Cómo funciona · noindex auth · footer legal · analytics · OG image |
| **P2 Could** | Pricing page · blog AEO · screenshots · waitlist mode |
| **Won’t v1** | Precios inventados · sync bancario · testimonials fake · i18n · AI-only content |

## 12. Open questions (bloquean launch pulido)

1. ¿Registro abierto en CTA vs waitlist?
2. URL canónica de producción (canonical, OG, sitemap, `llms.txt`).
3. ¿Privacidad/Términos listos para footer, o “próximamente” + FAQ TBA?
4. Nombre legal / razón social para `Organization`.
5. ¿Bloquear CCBot (training-only)?
6. Assets visuales del hero (mockup real vs atmósfera abstracta tipo Dub).

## 13. Dependencias de implementación

| Rol | Trabajo |
|-----|---------|
| ui-ux-developer | Composición mobile-first tipo Dub; secciones; FAQ accesible; tokens / tema |
| software-engineer | Reemplazar redirect ciego; sesión → dashboard; metadata + JSON-LD; robots/sitemap; `llms.txt`; SSR |
| business-logic-architect | No requerido (sin reglas de dinero) |

## 14. Copy outline (referencia)

Detalle usable en el brief PM del 2026-07-24. Resumen:

- **H1:** El centro financiero del hogar
- **Subhead:** Cuentas, movimientos, presupuestos y gastos compartidos — en un solo lugar. Pensado para vos, tu pareja o tu familia, en pesos y dólares.
- **Microcopy CTA:** Acceso temprano. Sin sync bancario todavía: registrás vos, con precisión.
- **Comparación:** tabla honesta vs Excel / solo-splits / app del banco; nota “No reemplazamos tu banco”.
- **Early access:** beta; sin pricing público; sin “gratis para siempre”.
