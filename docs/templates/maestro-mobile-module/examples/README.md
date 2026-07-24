# Examples — Maestro mobile (federated module)

Copy into the target repo under `.maestro/`:

| Este archivo | Destino típico |
|--------------|----------------|
| `config.yaml` | `.maestro/config.yaml` |
| `smoke-launch.yaml` | `.maestro/flows/smoke-launch.yaml` |
| `smoke-module-deeplink.yaml` | `.maestro/flows/smoke-module-deeplink.yaml` |

## Cómo adaptar al módulo federado

1. Reemplazá `com.example.host` por el **package/Bundle del host**.
2. Reemplazá textos (`Home`, `Module title`) por copy real o, mejor, `id:` / `testID`.
3. Ajustá `MODULE_DEEPLINK` al scheme que el host registra hacia tu módulo.
4. Si no hay deep link: borrá `openLink` y documentá la secuencia de taps (descubierta con `inspect_screen` o Studio).
5. Confirmá flavor/scheme: el APK/IPA instalado debe **incluir** el módulo bajo test.

YAML en inglés (comandos Maestro); comentarios en inglés para que viajen bien al repo destino. Docs humanas en español en `../`.
