# INTEGRATION — Maestro en un módulo mobile federado

Guía paso a paso para dejar Maestro usable (CLI + MCP Cursor + Studio). Entrypoint del agente: [`AGENTS.md`](./AGENTS.md).

## 1. Studio vs CLI (importante)

| Pieza | Rol |
|-------|-----|
| [Maestro Studio](https://docs.maestro.dev/maestro-studio/maestro-studio-overview) | App de escritorio: inspeccionar UI, armar/correr flows visualmente |
| [Maestro CLI](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli) | `maestro test`, `maestro mcp`, CI, PATH |
| MCP (`maestro mcp`) | Tools para el agente en Cursor; **bundled en el CLI** |

Si ya tenés Studio: igual instalá/verificá el **CLI**. Sin CLI no hay MCP ni `maestro test` en terminal.

## 2. Instalar y verificar CLI

Prerrequisito: **Java 17+** con `JAVA_HOME` seteado. Docs: [How to install Maestro CLI](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli).

```bash
# macOS / Linux (recomendado)
curl -fsSL "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"

# o Homebrew
brew tap mobile-dev-inc/tap
brew trust --formula mobile-dev-inc/tap/maestro
brew install mobile-dev-inc/tap/maestro
```

Verificar:

```bash
java -version          # 17+
echo "$JAVA_HOME"      # no vacío
maestro --version
maestro --help
which maestro          # anotá el path absoluto para mcp.json
```

iOS (macOS): Xcode + Command Line Tools. Android: ADB + emulador/device. Ver [Android](https://docs.maestro.dev/get-started/supported-platform/android) e [iOS](https://docs.maestro.dev/get-started/supported-platform/ios).

## 3. Device + app host

1. Arrancá un **Android emulator** o **iOS simulator**.
2. Instalá el **build del host** que incluye el módulo federado (flavor/scheme acordado por el equipo).
3. Anotá el `appId`:

```bash
# Android — packages instalados (filtrá por nombre del host)
adb shell pm list packages | grep -i host

# iOS Simulator — Bundle ID suele estar en el .xcodeproj / Info.plist / docs del host
```

Maestro asume la app **ya instalada**; no compila el módulo por vos ([Android](https://docs.maestro.dev/get-started/supported-platform/android)).

## 4. Configurar MCP en Cursor

Copiá [`mcp.json.example`](./mcp.json.example) a `.cursor/mcp.json` del repo (o mergeá en `~/.cursor/mcp.json`).

Cursor a menudo **no hereda** el PATH del shell: usá **path absoluto** al binario + `JAVA_HOME` explícito.

```json
{
  "mcpServers": {
    "maestro": {
      "command": "/Users/TU_USER/.maestro/bin/maestro",
      "args": ["mcp"],
      "env": {
        "JAVA_HOME": "/Users/TU_USER/.sdkman/candidates/java/current"
      }
    }
  }
}
```

Activar:

1. Cursor → **Settings → Tools & MCPs** → server `maestro` habilitado.
2. Toggle off/on o reiniciar Cursor.
3. Pedile al agente: «Listá devices de Maestro».

Si falla el server: casi siempre path del binario o `JAVA_HOME` incorrecto. Docs: [Maestro MCP](https://docs.maestro.dev/get-started/maestro-mcp).

Actualizar MCP = actualizar CLI ([update](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli/update-the-maestro-cli)) y recargar el MCP.

## 5. Layout `.maestro/` en el repo

```text
.maestro/
  config.yaml                 # workspace (opcional pero recomendado)
  flows/
    smoke-launch.yaml         # launchApp + assertVisible
    smoke-module-deeplink.yaml
    e2e/                      # journeys largos
```

Plantillas en [`examples/`](./examples/). Copiá y reemplazá placeholders.

### `config.yaml` mínimo

```yaml
# Docs: https://docs.maestro.dev/maestro-flows/workspace-management/project-configuration
flows:
  - flows/**

env:
  # Override en runtime: maestro test -e APP_ID=com.host.app
  APP_ID: "com.example.host"
  # Deep link al módulo (si aplica)
  MODULE_DEEPLINK: "myhost://module/home"
```

> Studio **no** aplica `config.yaml` en local como el CLI; sí puede incluirlo al subir workspace a Cloud. Ver [project configuration](https://docs.maestro.dev/maestro-flows/workspace-management/project-configuration).

### Dónde vivir los flows (federado)

| Opción | Cuándo |
|--------|--------|
| Repo del **módulo** | El módulo es el dueño de los journeys de su UI |
| Repo del **host** | Los E2E cruzan varios módulos / login del shell |

Documentá la elección en el README del destino. El `appId` es siempre el del **host**.

## 6. Apuntar al `appId` (host / federado)

En cada flow:

```yaml
appId: ${APP_ID}
---
- launchApp:
    clearState: true
```

Cross-platform (Android vs iOS distintos):

```bash
maestro test .maestro/flows/smoke-launch.yaml -e APP_ID=com.example.host
maestro test .maestro/flows/smoke-launch.yaml -e APP_ID=com.example.host.ios
```

Ver [parameters and constants](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/parameters-and-constants).

React Native / Expo: si corrés dentro de Expo Go, `launchApp` con package propio puede no aplicar; usá `openLink` con la URL de desarrollo. Builds standalone/EAS: `launchApp` normal. Ver [React Native](https://docs.maestro.dev/get-started/supported-platform/react-native).

## 7. Primer smoke (CLI)

Con emulador/simulador arriba y host instalado:

```bash
export PATH="$PATH:$HOME/.maestro/bin"
maestro test .maestro/flows/smoke-launch.yaml -e APP_ID=com.example.host
```

El flow mínimo debe:

1. `launchApp` (opcional `clearState: true`)
2. `assertVisible` de un texto/id que exista en el host (splash, home, tab bar)

Si el módulo no es la root: usá el ejemplo `smoke-module-deeplink.yaml` (`openLink` + assert de UI del módulo).

## 8. Validar que MCP responde (mobile)

Desde el chat del agente:

1. «Listá devices de Maestro» → `list_devices`.
2. Esperá IDs de tipo emulator / simulator / physical.  
   **No** uses Chromium para este template (eso es web beta).
3. «Inspeccioná la pantalla del device X» → `inspect_screen` con `device_id`.
4. «Corré el smoke-launch» → `run` con `files` o YAML inline + `device_id`.

Opcional: «Abrí el Maestro Viewer» → `open_maestro_viewer`.

## 9. Checklist de integración lista

- [ ] `maestro --version` OK
- [ ] `JAVA_HOME` OK
- [ ] Emulador/simulador visible en `maestro` / `list_devices`
- [ ] Host instalado; `APP_ID` documentado
- [ ] `.maestro/config.yaml` + al menos un flow smoke
- [ ] `.cursor/mcp.json` con path absoluto; MCP verde en Cursor
- [ ] Smoke verde por CLI y por MCP
- [ ] (Federado) Deep link / entrada al módulo documentada

## Referencias

- [llms.txt](https://docs.maestro.dev/llms.txt)
- [MCP](https://docs.maestro.dev/get-started/maestro-mcp)
- [Studio overview](https://docs.maestro.dev/maestro-studio/maestro-studio-overview)
- [Run tests with Studio](https://docs.maestro.dev/maestro-studio/run-tests-with-maestro-studio)
- [Flows](https://docs.maestro.dev/maestro-flows)
- [Tags / discovery](https://docs.maestro.dev/maestro-flows/workspace-management/test-discovery-and-tags)
