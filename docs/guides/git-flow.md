# Git Flow — Finance Hub

Fuente de verdad del flujo de ramas. **Obligatorio** para humanos y agentes.

## Ramas permanentes

| Rama | Rol | Deploy Vercel |
|------|-----|---------------|
| `main` | Producción estable | **Production** |
| `develop` | Integración / QA | **Preview** (alias de rama) |

No hay commits directos a `main` ni a `develop`.

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
3. Commits atómicos; mensaje en inglés o estilo del repo (imperativo, por qué).
4. Push + PR hacia **`develop`** (no hacia `main`).
5. Tras merge a `develop`: verificar preview en Vercel.
6. Cuando `develop` esté listo para release: PR **`develop` → `main`** → production.

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

- Nunca `git commit` ni `git push` directo a `main` o `develop`.
- Nunca abrir PR de feature hacia `main` (salvo hotfix documentado).
- Base de trabajo siempre `develop` actualizado.
- Tras merge: asegurar borrado de la rama remota + `git fetch --prune` + borrar local.
- No force-push a `main` / `develop`.
- No `--no-verify` en hooks salvo pedido explícito del usuario.
- Commits solo cuando el usuario lo pida (salvo que la tarea diga lo contrario).

## Relación con Vercel

| Evento | Resultado |
|--------|-----------|
| Push / merge a `main` | Deploy **production** |
| Push / merge a `develop` | Deploy **preview** (integración) |
| Push a `feat/*` etc. | Deploy **preview** efímero del PR |

`BETTER_AUTH_URL` de Production apunta al dominio de `main`. Los previews pueden necesitar orígenes de confianza adicionales si se prueba auth en URLs temporales.

## Checklist rápido antes de abrir PR

- [ ] Rama creada desde `develop` actualizado
- [ ] Prefijo correcto (`feat/` / `fix/` / `chore/`)
- [ ] Destino del PR: `develop` (o `main` solo si hotfix)
- [ ] Tests de dominio en verde si hubo lógica de negocio
- [ ] Tras merge: rama borrada (auto o manual) + prune local
