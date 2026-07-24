# AGENTS — Maestro (módulo mobile federado)

Entrypoint corto para agentes. Detalle de setup: [`INTEGRATION.md`](./INTEGRATION.md). Uso diario: [`USAGE.md`](./USAGE.md).

Índice oficial: [docs.maestro.dev/llms.txt](https://docs.maestro.dev/llms.txt).

## Cuándo usar Maestro

| Usar | No usar |
|------|---------|
| Smoke / E2E de UI en **app instalada** (Android emulator, iOS simulator, device) | Unit tests de lógica de negocio |
| Validar pantallas del **módulo federado** dentro del host | Probar el monorepo web / Next.js (eso es otro setup: Chromium) |
| Exploración con MCP (`inspect_screen` → escribir YAML) | Sustituir tests de dominio (Vitest/Jest/etc.) |

Maestro piloto el dispositivo desde afuera (capa de accesibilidad). **No** instrumenta el JS/nativo del módulo.

## Prerrequisitos (checklist)

Antes de escribir o correr flows, verificá (o pedí al humano):

1. **Java 17+** y `JAVA_HOME` apuntando a esa JDK — [install CLI](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli).
2. **Maestro CLI** en PATH (`~/.maestro/bin` o Homebrew).  
   > **Studio ≠ CLI:** tener [Maestro Studio](https://docs.maestro.dev/maestro-studio/maestro-studio-overview) instalado **no** garantiza `maestro` en el PATH ni el server MCP. El MCP viaja **dentro del CLI**.
3. **Emulador Android** o **simulador iOS** (o device) **corriendo**.
4. **App host instalada** en ese device (build debug/flavor del equipo).
5. **`appId` conocido:**
   - Android: package name (`applicationId` / `AndroidManifest`)
   - iOS: Bundle ID
6. (Federado) Cómo **entrar al módulo**: deep link, tab, feature flag, o pantalla post-login.
7. MCP Cursor configurado (ver `mcp.json.example`) si vas a usar tools desde el agente.

## Orden de trabajo obligatorio (MCP)

```text
list_devices  →  (elegir device_id)  →  inspect_screen  →  run
```

1. `list_devices` — tomá un `device_id` **real** de la respuesta. Para mobile nativo esperá emulador/simulador/device; **Chromium no aplica**.
2. `inspect_screen` (con ese `device_id`) — jerarquía / textos / ids **antes** de inventar selectores.
3. `take_screenshot` si ayuda a entender la UI.
4. `cheat_sheet` si dudás de sintaxis YAML (args, nested props, conditionals).
5. `run` — un flow completo preferible a muchos one-liners. Pasá siempre `device_id`.
6. `open_maestro_viewer` — opcional, para ver el device embebido.

Cloud (opcional): `list_cloud_devices` → `run_on_cloud` → poll `get_cloud_run_status`. Auth: `maestro login` o `MAESTRO_CLOUD_API_KEY`.

Docs MCP: [Maestro MCP Server](https://docs.maestro.dev/get-started/maestro-mcp).

## Módulo federado vs app monolítica

| Tema | App monolítica | Módulo federado (este caso) |
|------|----------------|-----------------------------|
| `appId` | Package/Bundle del producto | **Package/Bundle del host** (no del módulo suelto) |
| Launch | `launchApp` suele bastar | `launchApp` + **deep link** / navegación al módulo |
| Build | Un binary | Flavor / scheme del host que **incluye** el módulo |
| Workspace flows | `.maestro/` en el repo de la app | `.maestro/` en el repo del módulo **o** del host; documentá cuál |
| Selectores | Textos/ids de la app | Solo lo que el host renderiza (accesibilidad del shell + módulo) |

### Qué debe descubrir o pedir el agente

1. `APP_ID` Android y/o iOS (pueden diferir → usá `${APP_ID}` + `-e`).
2. Cómo instalar el build en el emulador (`adb install`, Xcode, script del monorepo, EAS, etc.).
3. Deep link / ruta al módulo (ej. `myhost://module/home`).
4. Si hace falta **build flavor** / scheme (debug vs release, `dev` vs `prod`).
5. Credenciales o seeds solo si el flow lo exige (preferí smoke sin login).

## Do

- Pedí/confirmá `appId` y device antes de `run`.
- Preferí `id:` / `testID` estables sobre texto traducido ([RN](https://docs.maestro.dev/get-started/supported-platform/react-native), [Android](https://docs.maestro.dev/get-started/supported-platform/android), [iOS](https://docs.maestro.dev/get-started/supported-platform/ios)).
- Versioná YAML en `.maestro/flows/`; usá Studio para inspeccionar/grabar, no como única fuente.
- Tags (`smoke`, `e2e`, `module`) y `clearState` cuando el estado del host ensucia el test.
- Un flow = un journey; reutilizá con `runFlow`.

## Don't

- No copies el setup **web** (`url:` + Chromium) a un módulo mobile.
- No asumas que Studio instalado = CLI/MCP listos.
- No inventes `device_id`; solo IDs de `list_devices`.
- No uses `include_tags` / `exclude_tags` con `@` (solo el nombre del tag).
- No trates el código del monorepo como el SUT: el SUT es la **app instalada**.
- No pongas lógica de negocio en flows.
- No hardcodees secrets en YAML; pasá `-e` / `MAESTRO_*`.

## Primer prompt de validación

> Listá devices de Maestro. Si hay emulador/simulador, inspeccioná la pantalla y ejecutá `.maestro/flows/smoke-launch.yaml` con ese `device_id`.

## Referencias rápidas

- [Flows](https://docs.maestro.dev/maestro-flows)
- [Project configuration](https://docs.maestro.dev/maestro-flows/workspace-management/project-configuration)
- [Selectors](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/how-to-use-selectors)
- [Parameters / env](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/parameters-and-constants)
