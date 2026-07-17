# Git Flow — Finance Hub

Fuente de verdad del flujo de ramas. **Obligatorio** para humanos y agentes.

## Ramas permanentes

| Rama | Rol | Deploy Vercel |
|------|-----|---------------|
| `main` | Producción estable | **Production** |
| `develop` | Integración / QA | **Preview** (alias de rama) |

No hay commits directos a `main` ni a `develop` (excepto el bot de CI para changelog/release; ver [changelog.md](./changelog.md)).

## Ramas de trabajo

| Prefijo | Uso | Base | Merge destino |
|---------|-----|------|----------------|
| `feat/` | Feature o mejora de producto | `develop` | → `develop` (PR) |
| `fix/` | Bugfix | `develop` (o `main` si es hotfix crítico) | → `develop` (y `main` si hotfix) |
| `chore/` | Tooling, deps, docs sin producto | `develop` | → `develop` |
| `refactor/` | Refactors sin cambio funcional | `develop` | → `develop` |

Nombres en kebab-case: `feat/form-sheet-ux`, `fix/budget-progress`, `chore/git-flow-docs`.

## Flujo estándar

```
main (prod)
  ↑
  │  release: PR develop → main
  │
develop (preview)
  ↑
  │  PR feat|fix|chore → develop
  │
feat/*  fix/*  chore/*
```

1. Actualizar `develop`: `git fetch origin && git checkout develop && git pull`.
2. Crear rama: `git checkout -b feat/<nombre>`.
3. Commits atómicos con **Conventional Commits** (validado por commitlint); detalle en [changelog.md](./changelog.md).
4. Push + PR hacia **`develop`** (no hacia `main`).
5. Tras merge a `develop`: verificar preview en Vercel; el workflow actualiza `[Unreleased]` en `CHANGELOG.md`.
6. Cuando `develop` esté listo para release: PR **`develop` → `main`** → production; el workflow hace bump SemVer, tag `vX.Y.Z` y GitHub Release.

## Hotfix en producción

Solo si el bug está en `main` y no puede esperar al ciclo normal:

1. `git checkout main && git pull`
2. `git checkout -b fix/<nombre>`
3. PR → `main`
4. Cherry-pick o merge inmediato de esa corrección también a `develop` (evitar divergencia)

## Higiene del repositorio (borrar ramas)

**Obligatorio** para mantener el repo sano:

1. **GitHub:** `delete_branch_on_merge` debe estar **activado** en el repositorio (Settings → General → Pull Requests → *Automatically delete head branches*).
2. Tras mergear un PR, la rama remota de trabajo **debe eliminarse** (automático si el setting está on; si no, borrarla a mano).
3. Tras el merge, el agente o el autor limpia la rama local:

```bash
git checkout develop
git pull origin develop
git branch -d feat/<nombre>          # o -D si ya está mergeada en remoto
git fetch --prune                    # limpia refs remotas borradas
```

4. No acumular ramas `feat/` / `fix/` / `chore/` ya mergeadas en `origin`.
5. No reutilizar ramas viejas para trabajo nuevo: crear una rama nueva desde `develop` actualizado.

## Reglas para agentes (no negociables)

- Nunca `git commit` ni `git push` directo a `main` o `develop` (el bot de Actions puede actualizar changelog/versión).
- Nunca abrir PR de feature hacia `main` (salvo hotfix documentado).
- Base de trabajo siempre `develop` actualizado.
- Tras merge: asegurar borrado de la rama remota + `git fetch --prune` + borrar local.
- No force-push a `main` / `develop`.
- No `--no-verify` en hooks salvo pedido explícito del usuario (rompe commitlint).
- Commits solo cuando el usuario lo pida (salvo que la tarea diga lo contrario).
- Mensajes en Conventional Commits (`feat:`, `fix:`, etc.) para alimentar el changelog.

## Changelog y versiones

- Formato Keep a Changelog + SemVer; fuente = Conventional Commits.
- Merge a `develop` → sección `[Unreleased]`; merge a `main` → release (tag + GitHub Release).
- Guía completa: [changelog.md](./changelog.md). ADR: [005-changelog-semver](../adr/005-changelog-semver.md).

## Relación con Vercel

| Evento | Resultado |
|--------|-----------|
| Push / merge a `main` | Deploy **production** |
| Push / merge a `develop` | Deploy **preview** (integración) |
| Push a `feat/*` etc. | Deploy **preview** efímero del PR |

`BETTER_AUTH_URL` de **Production** apunta al dominio canónico de `main`.

En **Preview** (`develop` / PRs) no reutilizar esa URL: el Origin del deploy (`*.vercel.app`) no coincide y Better Auth rechaza el login (CSRF). El código resuelve `BETTER_AUTH_URL` con `VERCEL_URL` cuando `VERCEL_ENV=preview` y confía `https://*.vercel.app`. Preferible: no setear `BETTER_AUTH_URL` en el Environment Preview de Vercel (solo Production + Development local).

## Checklist rápido antes de abrir PR

- [ ] Rama creada desde `develop` actualizado
- [ ] Prefijo correcto (`feat/` / `fix/` / `chore/`)
- [ ] Destino del PR: `develop` (o `main` solo si hotfix)
- [ ] Tests de dominio en verde si hubo lógica de negocio
- [ ] Tras merge: rama borrada (auto o manual) + prune local
