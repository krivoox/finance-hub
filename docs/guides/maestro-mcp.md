# Maestro MCP — testing UI en Finance Hub

Guía para usar [Maestro](https://docs.maestro.dev/) vía **MCP** en Cursor, como tooling de smoke / exploración de UI.

> **Alcance:** Finance Hub es una app **web** (Next.js). Maestro nació para mobile; el soporte **web (Chromium) está en beta**. No reemplaza Vitest (TDD de dominio). Playwright MCP ya puede estar en tu `~/.cursor/mcp.json` para automatización web más madura.

Doc oficial MCP: [Maestro MCP Server](https://docs.maestro.dev/get-started/maestro-mcp).

## Qué aporta

| Capacidad | Uso en este repo |
|-----------|------------------|
| Flows YAML (`.maestro/flows/`) | Smoke repetibles (login público, etc.) |
| MCP tools (`list_devices`, `inspect_screen`, `run`, …) | El agente escribe/ejecuta/depura flows contra Chromium o emuladores |
| Maestro Viewer | Vista embebida del dispositivo/browser (`open_maestro_viewer`) |
| Cloud (`run_on_cloud`) | Opcional; requiere `maestro login` o `MAESTRO_CLOUD_API_KEY` |

## Prerrequisitos

1. **Java 17+** con `JAVA_HOME` apuntando a esa JDK.
2. **Maestro CLI** en el `PATH`:

   ```bash
   # macOS / Linux (recomendado)
   curl -fsSL "https://get.maestro.mobile.dev" | bash
   export PATH="$PATH:$HOME/.maestro/bin"

   # o Homebrew (puede tirar OpenJDK como dependencia; si ya tenés Java 17, preferí curl)
   brew tap mobile-dev-inc/tap
   brew trust --formula mobile-dev-inc/tap/maestro
   brew install mobile-dev-inc/tap/maestro
   ```

3. Verificar:

   ```bash
   maestro --version
   maestro --help
   ```

4. App local levantada (para flows contra localhost):

   ```bash
   npm run dev
   # → http://localhost:3000
   ```

## Configuración MCP en Cursor (este repo)

El proyecto incluye [`.cursor/mcp.json`](../../.cursor/mcp.json) con **path absoluto** al binario y `JAVA_HOME` (Cursor a menudo no hereda el `PATH` del shell):

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

En este repo los paths apuntan a la máquina de desarrollo actual (`~/.maestro/bin/maestro` + SDKMAN Java 17). Si clonás en otra máquina, ajustá `command` y `JAVA_HOME` (o usá `"command": "maestro"` si está en el PATH de Cursor).

Para CLI en terminal, agregá el binario al PATH:

```bash
export PATH="$PATH:$HOME/.maestro/bin"
# opcional en ~/.zshrc
```

### Activar

1. Instalá Maestro CLI y Java 17+ (arriba).
2. **Cursor Settings → Tools & MCPs** → confirmar que `maestro` aparece y está habilitado.
3. Recargar: toggle off/on del server Maestro, o reiniciar Cursor.
4. (Opcional) Mergeá el mismo bloque en `~/.cursor/mcp.json` para alcance usuario en todos los proyectos.

### Actualizar

El MCP viaja **dentro del CLI**. Tras `brew upgrade maestro` o reinstalar con curl: toggle MCP o reiniciar Cursor.

## Layout en el repo

```text
.maestro/
  config.yaml
  flows/
    smoke-login.yaml              # smoke público /login
    e2e/
      01-register.yaml
      02-login.yaml
      03-forgot-password.yaml
      04-reset-password.yaml
      05-login-new-password.yaml
scripts/maestro-e2e-auth.sh       # orquesta el suite + lee token del log
.cursor/mcp.json
```

## E2E auth (registro → login → forgot → reset)

Con la app levantada:

```bash
export PATH="$PATH:$HOME/.maestro/bin"
# El reset necesita el log de Next donde aparece `[auth] Password reset requested`
export DEV_LOG=/ruta/al/terminal-de-npm-run-dev.txt   # opcional pero recomendado
npm run test:maestro:e2e
```

Desde Cursor (MCP), pedile al agente el suite completo; el reset usa el `token:` del log de desarrollo (no hay SMTP aún).

Cada corrida crea un email único (`e2e+maestro<timestamp>@mail.test`).

### 1. CLI (sin MCP)

```bash
# Terminal A
npm run dev

# Terminal B
export PATH="$PATH:$HOME/.maestro/bin"
npm run test:maestro
# equivalente: maestro test .maestro/flows/smoke-login.yaml

# Preview / otra URL
maestro test .maestro/flows/smoke-login.yaml -e APP_URL=https://tu-preview.vercel.app
```

La primera corrida web puede descargar Chromium gestionado por Maestro.

### 2. Desde Cursor (MCP)

Con el server activo, pedile al agente por ejemplo:

- «Listá los devices de Maestro» → tool `list_devices` (debería incluir Chromium para web).
- «Abrí el Maestro Viewer» → `open_maestro_viewer`.
- «Ejecutá el flow smoke de login» → `run` con `files: [".maestro/flows/smoke-login.yaml"]` (o YAML inline).
- «Mostrá el cheat sheet» → `cheat_sheet` antes de inventar sintaxis.

### 3. Smoke esperado

El flow [`.maestro/flows/smoke-login.yaml`](../../.maestro/flows/smoke-login.yaml):

1. Abre `${APP_URL}/login`
2. Assert: «Iniciá sesión», «Email», «Contraseña», «Registrate»
3. Tap en «Registrate» y comprueba el formulario de registro

No usa credenciales ni toca dominio/Prisma.

## Relación con el resto del testing

| Capa | Herramienta | Qué prueba |
|------|-------------|------------|
| Dominio | **Vitest** (obligatorio) | Reglas de negocio puras |
| UI exploratoria / smoke web | **Maestro** (este doc) o Playwright MCP | Pantallas renderizadas |
| Mobile nativo | Maestro + emulador/simulador | Solo si hubiera app iOS/Android |

No mover lógica de negocio a flows. No inventar criterios fuera de `docs/specs/`.

## Limitaciones (honesto)

- **Web = beta:** solo Chromium; locale/viewport limitados; no es el camino principal de CI de dominio.
- **No hay app mobile** en Finance Hub hoy: emuladores Android/iOS no aportan salvo que se agregue un cliente nativo.
- **Auth real / datos:** el smoke actual es público. Flows con sesión necesitan seeds o credenciales de test (fuera de este setup mínimo).
- **Cloud:** tools `list_cloud_devices` / `run_on_cloud` / `get_cloud_run_status` requieren login a Maestro Cloud.
- **PATH / JAVA_HOME:** si el MCP no arranca en Cursor, casi siempre es path del binario o Java (ver arriba).
- Homebrew a veces falla al bajar el bottle de OpenJDK; con Java 17 ya instalado, preferí el instalador `curl`.

## Referencias

- [Maestro MCP](https://docs.maestro.dev/get-started/maestro-mcp)
- [Web browsers](https://docs.maestro.dev/get-started/supported-platform/web-browser)
- [Instalar CLI](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli)
- [Flows](https://docs.maestro.dev/maestro-flows)
