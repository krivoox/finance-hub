# ADR 005 — Changelog automatizado y SemVer

## Estado

Aceptado

## Contexto

Finance Hub necesita un registro fiable de cambios para integración (`develop`) y producción (`main`), alineado al Git Flow. El paquete es privado (`"private": true`): no aplica publicar a npm. No había `CHANGELOG.md`, workflows ni validación de mensajes de commit.

## Decisión

Adoptar:

1. **Keep a Changelog** + **Semantic Versioning**
2. **Conventional Commits** validados con **commitlint** + **husky** (`commit-msg`)
3. Generación de changelog con **git-cliff** (no edición manual rutinaria)
4. GitHub Actions:
   - push a **`develop`** → actualizar `[Unreleased]` (commit bot si hace falta)
   - push a **`main`** → bump SemVer, changelog fechado, tag `vX.Y.Z`, GitHub Release
5. **Sin** `npm publish` / sin depender de `NPM_TOKEN`

Excepción documentada al “no commit directo” en `develop`/`main`: solo `github-actions[bot]` para archivos de changelog/versión.

### Alternativas descartadas

| Opción | Por qué no |
|--------|------------|
| **semantic-release** | Excelente en `main`, peor encaje nativo para `[Unreleased]` en `develop`; más plugins y superficie |
| **standard-version** | Orientado a release local/manual; Unreleased en integración requiere otro pipeline |
| **release-please** | PRs de release útiles con protecciones estrictas; más lento para un repo pequeño si el bot puede pushear |
| **Edición manual del CHANGELOG** | Deriva y se olvida; contradice Conventional Commits |

## Consecuencias

- Los mensajes de commit deben ser convencionales (hooks locales + convención de equipo)
- Historial previo se documenta como baseline `0.1.0` (no se reescribe)
- Branch protection debe permitir push del bot (o fallará el job)
- Guía operativa: [docs/guides/changelog.md](../guides/changelog.md)
