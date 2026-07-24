# USAGE — Usar Maestro (agente + humano)

Tras integrar ([`INTEGRATION.md`](./INTEGRATION.md)). Reglas cortas del agente: [`AGENTS.md`](./AGENTS.md).

## Prompts útiles al agente

| Objetivo | Prompt ejemplo |
|----------|----------------|
| Sanity MCP | «Listá devices de Maestro y decime cuáles son emulador/simulador.» |
| Viewer | «Abrí el Maestro Viewer.» |
| Inspección | «Inspeccioná la pantalla del device `<id>` y listá textos/ids visibles.» |
| Screenshot | «Sacá screenshot del device `<id>`.» |
| Escribir flow | «Escribí un flow YAML smoke que lance el host, abra el deep link del módulo X y asserte `<texto o id>`. Guardalo en `.maestro/flows/`.» |
| Correr archivo | «Ejecutá `.maestro/flows/smoke-launch.yaml` en el device `<id>` con `APP_ID=…`.» |
| Sintaxis | «Mostrá el cheat sheet de Maestro antes de inventar comandos.» |
| Debug | «El assert falló; inspeccioná de nuevo y ajustá el selector.» |
| Cloud | «Listá cloud devices y corré el folder `.maestro/flows` con tag smoke.» |

## Tools MCP (local)

Docs: [Maestro MCP](https://docs.maestro.dev/get-started/maestro-mcp).

| Tool | Uso |
|------|-----|
| `list_devices` | **Siempre primero.** Obtener `device_id` válidos. |
| `inspect_screen` | Jerarquía/accesibilidad actual. Requiere `device_id`. |
| `take_screenshot` | Evidencia visual. Requiere `device_id`. |
| `run` | Ejecutar flow: `yaml` **o** `files` **o** `dir` (+ tags). Siempre `device_id`. `env` para variables. |
| `cheat_sheet` | Antes de sintaxis poco familiar. |
| `open_maestro_viewer` | Device embebido + comandos en vivo. |

### `run` — convenciones

- Preferí **un flow completo** (launch → navigate → asserts) a muchos `run` de un solo comando.
- `include_tags` / `exclude_tags`: nombres **sin** `@` (ej. `smoke`, no `@smoke`).
- Mobile nativo: **no** elijas Chromium de `list_devices`.
- Tras cambios de UI: `inspect_screen` otra vez; los refs/textos pueden cambiar.

### Cloud (opcional)

| Tool | Uso |
|------|-----|
| `list_cloud_devices` | Pares válidos `{device_model, device_os}` — pasarlos **verbatim**. |
| `run_on_cloud` | Sube flow/folder; async; devuelve dashboard URL. |
| `get_cloud_run_status` | Poll ~60s hasta estado terminal. |
| `describe_cloud_run` | Metadata/artefactos por `run_id` (no `upload_id`). |

Auth: `maestro login` o env `MAESTRO_CLOUD_API_KEY` (nunca echoear la key).

## Studio ↔ YAML en el repo

```text
Studio (inspección / borrador)  →  YAML versionado en .maestro/flows/  →  CLI o MCP en CI/local
```

- [Studio](https://docs.maestro.dev/maestro-studio/maestro-studio-overview): conectar device, inspeccionar, correr.
- [Run tests with Studio](https://docs.maestro.dev/maestro-studio/run-tests-with-maestro-studio): armar tests sin escribir todo a mano.
- [Environments & variables](https://docs.maestro.dev/maestro-studio/environments-and-variables): `APP_ID`, tags, envs en Studio.
- **Fuente de verdad del equipo:** archivos YAML en git. Copiá/exportá desde Studio al repo; no dejes el test solo en la UI de Studio.
- `config.yaml` lo respeta el **CLI**; Studio local tiene limitaciones (ver [project configuration](https://docs.maestro.dev/maestro-flows/workspace-management/project-configuration)).

## CLI vs MCP

| | CLI | MCP (Cursor) |
|--|-----|--------------|
| Cuándo | CI, scripts, iteración en terminal | Agente escribe/depura con inspección en vivo |
| Comando típico | `maestro test .maestro/flows/smoke-launch.yaml -e APP_ID=…` | Tool `run` + `device_id` |
| Tags | `maestro test .maestro/ --include-tags smoke` | `run` con `dir` + `include_tags: ["smoke"]` |
| Device | Auto o flags de device | `device_id` de `list_devices` |

```bash
# Smoke
maestro test .maestro/flows/smoke-launch.yaml -e APP_ID=com.example.host

# Solo tags
maestro test .maestro/ --include-tags smoke --exclude-tags e2e

# Continuous (re-run al guardar) — ver CLI docs
maestro test .maestro/flows/smoke-launch.yaml -c
```

Referencia comandos: [CLI commands](https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options).

## Tags, env, clearState

### Tags

En el header del flow:

```yaml
appId: ${APP_ID}
tags:
  - smoke
  - module
---
- launchApp
```

Filtrado: [test discovery and tags](https://docs.maestro.dev/maestro-flows/workspace-management/test-discovery-and-tags).

Convención sugerida:

| Tag | Significado |
|-----|-------------|
| `smoke` | Rápido, sin login (o con usuario seed estable) |
| `e2e` | Journey largo / dependiente |
| `module` | Entra al módulo federado |
| `android` / `ios` | Solo si el flow no es cross-platform |

### Env / parámetros

```bash
maestro test flow.yaml -e APP_ID=com.example.host -e MODULE_DEEPLINK='myhost://module/home'
```

En YAML: `${APP_ID}`, `${MODULE_DEEPLINK}`. Shell vars con prefijo `MAESTRO_` las lee el CLI ([parameters](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/parameters-and-constants)).

### clearState

Resetea datos de la app (Android ≈ `pm clear`). Útil en host con sesión/caché:

```yaml
- launchApp:
    appId: ${APP_ID}
    clearState: true
```

iOS: además podés necesitar `clearKeychain` en escenarios de auth. No abuses de clear en cada subflow si alarga demasiado el suite.

## Debugging

| Síntoma | Qué hacer |
|---------|-----------|
| Elemento “no visible” | `inspect_screen` / Studio: ¿texto real, otro idioma, detrás de modal, animación? `extendedWaitUntil` / `waitForAnimationToEnd`. |
| Selector frágil | Preferí `id:` / `testID` / accessibility id sobre copy de marketing. Ver [selectors](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/how-to-use-selectors). |
| App en mal estado | `clearState: true` al launch; reinstalá el build si el flavor cambió. |
| Módulo no aparece | Verificá deep link, feature flag, usuario/rol, que el binary **incluya** el módulo. |
| MCP no lista devices | Emulador apagado; ADB; path/`JAVA_HOME` del MCP. |
| Solo aparece Chromium | Estás en modo web o no hay mobile device; arrancá emulator/simulator. |
| Tap no hace nada (RN iOS) | Nested views / `accessible`; ver tips en [React Native](https://docs.maestro.dev/get-started/supported-platform/react-native). |

Flujo agente ante fallo: `inspect_screen` → ajustar YAML → `run` de nuevo (no spamear el mismo `run` ciego).

## Módulo federado — patrones de flow

1. **Smoke host:** `launchApp` + assert de shell (tab bar / home).
2. **Entrada al módulo:** `openLink: ${MODULE_DEEPLINK}` o taps de navegación descubiertos con `inspect_screen`.
3. **Assert del módulo:** texto o `id` estable exportado por el módulo.
4. **Logout / cleanup** solo si el suite lo necesita (hook o subflow).

Ejemplos listos: [`examples/`](./examples/).

## Referencias

- [Flows overview](https://docs.maestro.dev/maestro-flows)
- [launchApp / commands](https://docs.maestro.dev/api-reference/commands) (vía índice [llms.txt](https://docs.maestro.dev/llms.txt))
- [Permissions](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/permissions)
- [Nested flows](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/nested-flows)
- [Cloud](https://docs.maestro.dev/maestro-cloud/readme)
