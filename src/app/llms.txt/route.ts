import { LANDING_DEFINITION, LANDING_META } from "@/features/marketing/content";
import { getSiteUrl } from "@/lib/site-url";

export function GET() {
  const siteUrl = getSiteUrl();

  const body = `# Finance Hub

> ${LANDING_META.description}

Finance Hub es el centro de administración financiera del hogar: cuentas, movimientos, presupuestos, objetivos y gastos compartidos en un solo lugar. Pensado para individuos, parejas y familias hispanohablantes (foco Argentina), con ARS y USD como monedas de primera clase.

${LANDING_DEFINITION}

## Notas importantes

- Acceso temprano / beta: todavía no hay pricing público.
- No hay sync bancario / open banking en esta etapa; el registro de movimientos es manual y mobile-first.
- El canje ARS↔USD es explícito; la consolidación de patrimonio es estimada con tasa manual del espacio.
- No está pensado para trading, ERP fiscal ni “conectar el banco y olvidarse”.

## Páginas

- [Inicio / producto](${siteUrl}/): landing de producto y FAQ
- [Crear cuenta](${siteUrl}/registro): registro
- [Iniciar sesión](${siteUrl}/login): acceso

## Contacto

Sitio: ${siteUrl}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
