# ADR 004 — Stack Siturn (template)

## Estado

Aceptado

## Contexto

Finance Hub necesita un stack concreto para auth, DB, UI y estructura de carpetas. Existe una plantilla canónica en Siturn (`turno-app/template.md`).

## Decisión

Adoptar el **mismo stack e infra** que Siturn:

- Next.js App Router + React 19 + TypeScript + Tailwind 4 + shadcn
- Better Auth (no Supabase Auth)
- Prisma + PostgreSQL (Supabase)
- Zod, RHF, TanStack Query, Zustand (solo UI)
- Organización por `src/features/<dominio>/`

Complementos propios de Finance Hub (no contradicen el template):

- Specs SDD en `docs/specs/`
- TDD con Vitest para lógica pura (`domain/`)
- Modelo de tenancy por Workspace

## Consecuencias

- Scaffold e infra se copian/adaptan desde `turno-app`, no se inventan
- Documentación de stack en `docs/stack.md`
- Arquitectura de producto en `docs/architecture.md`
