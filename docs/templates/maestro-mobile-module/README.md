# Plantilla: Maestro para módulo mobile federado

Documentación **portable** para integrar [Maestro](https://docs.maestro.dev/) (CLI + MCP + Studio) en un repo de **app mobile nativa** o **módulo federado** embebido en un host.

> **No es** la guía de Finance Hub web (Chromium). Esa vive en `docs/guides/maestro-mcp.md`. Esta plantilla asume Android emulator / iOS simulator + `appId` del host.

## Contenido

| Archivo | Para quién | Qué hace |
|---------|------------|----------|
| [`AGENTS.md`](./AGENTS.md) | Agente (entrypoint) | Cuándo usar Maestro, checklist, orden MCP, Do/Don't |
| [`INTEGRATION.md`](./INTEGRATION.md) | Humano + agente | Instalar CLI, MCP Cursor, layout `.maestro/`, primer smoke |
| [`USAGE.md`](./USAGE.md) | Humano + agente | Prompts, tools MCP, Studio ↔ YAML, tags, debug |
| [`mcp.json.example`](./mcp.json.example) | Setup | Plantilla `.cursor/mcp.json` |
| [`examples/`](./examples/) | Copy-paste | Flows YAML mínimos + `config.yaml` |

## Cómo copiar a otro repo

```bash
# Desde la raíz del repo destino
mkdir -p docs/guides
cp -R /ruta/a/finance-hub/docs/templates/maestro-mobile-module docs/guides/maestro-mobile

# Layout de trabajo Maestro (en el repo destino)
mkdir -p .maestro/flows
cp docs/guides/maestro-mobile/examples/config.yaml .maestro/config.yaml
cp docs/guides/maestro-mobile/examples/smoke-launch.yaml .maestro/flows/
# Adaptá appId / textos / deep links

# MCP Cursor (path absoluto + JAVA_HOME)
cp docs/guides/maestro-mobile/mcp.json.example .cursor/mcp.json
# Editá command y JAVA_HOME
```

Luego seguí [`INTEGRATION.md`](./INTEGRATION.md).

## Índice oficial

- [llms.txt](https://docs.maestro.dev/llms.txt) — índice para agentes
- [Maestro MCP](https://docs.maestro.dev/get-started/maestro-mcp)
- [Instalar CLI](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli)
- [Flows](https://docs.maestro.dev/maestro-flows)
- [Android](https://docs.maestro.dev/get-started/supported-platform/android) · [iOS](https://docs.maestro.dev/get-started/supported-platform/ios) · [React Native](https://docs.maestro.dev/get-started/supported-platform/react-native)
