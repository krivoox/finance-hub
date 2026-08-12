# Linear en Cloud Agents

El plugin MCP **Linear** del marketplace queda en `needsAuth` en Cloud Agents: el OAuth es por usuario (no por entorno), no se comparte con el IDE, y el callback de Cursor a menudo no persiste. La UI de Cloud Agents **no permite** convertir ese plugin a HTTP ni agregar un MCP HTTP custom con headers.

## Qué usar

Secret del environment: **`LINEAR_API_KEY`** (Linear → Settings → Account → Security & Access).

No pongas la key en el repo, en `.cursor/mcp.json`, ni en `environment.json`.

Los agentes deben llamar a GraphQL:

```bash
node scripts/linear-graphql.mjs '{ viewer { id name } }'
```

Endpoint: `https://api.linear.app/graphql`. Header `Authorization` = el valor del secret (Linear acepta la API key cruda, sin `Bearer`).

## Escritura

La key del environment puede crear/editar issues. Pedí confirmación antes de mutar tickets ajenos al issue que disparó el agente.

## MCP en el IDE (opcional)

En Cursor Desktop, `.cursor/mcp.json` puede apuntar a `https://mcp.linear.app/mcp` con `${env:LINEAR_API_KEY}`. Eso **no** autentica el plugin Linear de Cloud Agents; en la nube seguí usando este helper.
