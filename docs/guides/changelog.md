# Changelog y versionado — Finance Hub

Cómo se registran cambios y se publican versiones. Complementa [git-flow.md](./git-flow.md).

## Estándares

| Estándar | Uso |
|----------|-----|
| [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) | Formato de `CHANGELOG.md` |
| [Semantic Versioning](https://semver.org/) | `MAJOR.MINOR.PATCH` en `package.json` y tags `vX.Y.Z` |
| [Conventional Commits](https://www.conventionalcommits.org/) | Fuente automática del changelog |

La app es `"private": true`: **no** se publica a npm.

## Commits (obligatorio)

Formato:

```text
<type>[optional scope]: <description>
```

Tipos que **entran** al changelog / bump:

| Type | Sección changelog | Bump |
|------|-------------------|------|
| `feat` | Added | MINOR |
| `fix` | Fixed | PATCH |
| `perf` / `refactor` | Changed | PATCH (sin bump minor) |
| `feat!` / `BREAKING CHANGE` | Added (+ breaking) | MAJOR |

Tipos habitualmente **omitidos** del changelog: `docs`, `style`, `test`, `chore`, `ci`, `build`.

Validación local: husky `commit-msg` → **commitlint**. Un mensaje no convencional **falla** el commit.

Ejemplos:

```bash
feat(accounts): add archive account action
fix(budgets): correct progress when timezone crosses month
feat(api)!: rename workspace member role field

BREAKING CHANGE: role `viewer` is now `read`.
```

## Automatización (GitHub Actions)

### Merge / push a `develop`

Workflow: `.github/workflows/changelog-unreleased.yml`

1. Regenera la sección `[Unreleased]` con **git-cliff** (commits convencionales desde el último tag).
2. Si hay cambios, `github-actions[bot]` hace commit en `develop`:
   `chore(changelog): update Unreleased [skip ci]`

**Excepción al Git Flow:** los humanos/agentes **no** commitean directo a `develop`/`main`. El bot de CI **sí** puede actualizar solo `CHANGELOG.md` (o archivos de release en `main`).

### Merge / push a `main` (release de producción)

Workflow: `.github/workflows/release.yml`

1. Calcula el próximo SemVer con git-cliff (`feat`→minor, `fix`→patch, breaking→major).
2. Actualiza `package.json` + `CHANGELOG.md` (sección fechada).
3. Commit bot: `chore(release): vX.Y.Z [skip ci]`
4. Tag anotado `vX.Y.Z` + **GitHub Release**
5. Sin `npm publish`

**Primer release:** si no hay tags `v*`, el workflow en `main` hace bootstrap: etiqueta `v0.1.0` (versión actual en `package.json`) y publica GitHub Release con el baseline del `CHANGELOG.md` **sin** regenerarlo desde el historial no convencional.

## Scripts locales

```bash
npm run changelog          # actualiza solo [Unreleased]
npm run release:dry        # muestra el próximo bump sin escribir
npm run release            # escribe package.json + CHANGELOG (sin push)
```

Tras `npm run release` local, el push/tag/Release lo hace normalmente el workflow en `main`; no hace falta correr release a mano salvo hotfix documentado.

## Baseline del historial

Los commits anteriores a este tooling **no** seguían Conventional Commits. Por eso `CHANGELOG.md` arranca con:

- `[Unreleased]` — cambios desde la automatización
- `[0.1.0]` — baseline del producto previo (sin reescribir todo el historial)

A partir de aquí, solo commits convencionales alimentan el changelog.

## Protecciones de rama (GitHub)

Ruleset activo: **Protect main and develop** (PR obligatorio, sin force-push ni borrado de rama).

### Limitación en repos personales

GitHub **no permite** agregar `github-actions` como bypass actor en rulesets de repos de usuario (solo orgs). Por eso el bot no puede pushear con el `GITHUB_TOKEN` por defecto.

### Secret obligatorio: `CHANGELOG_TOKEN`

1. Crear un [fine-grained PAT](https://github.com/settings/personal-access-tokens/new) (tu usuario admin):
   - Resource owner: tu usuario
   - Repository access: solo `finance-hub`
   - Permissions → Repository → **Contents: Read and write**
   - (Opcional) **Metadata: Read-only**
2. En el repo: Settings → Secrets and variables → Actions → New repository secret
   - Name: `CHANGELOG_TOKEN`
   - Value: el PAT
3. Los workflows usan `secrets.CHANGELOG_TOKEN` (fallback a `GITHUB_TOKEN` si falta).

El PAT actúa como **Admin** y bypasea el ruleset (bypass de rol Repository Admin). No hace falta `NPM_TOKEN`.

Si el secret falta con el ruleset activo, el job fallará al `git push`.

## Relación con Git Flow

```text
feat/* ──PR──► develop ──► [Unreleased] actualizado (bot)
                 │
                 └──PR──► main ──► bump + tag + GitHub Release (bot)
```

Detalle de ramas: [git-flow.md](./git-flow.md).
