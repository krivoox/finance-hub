# Spec 04 — Categorías

| Campo | Valor |
|-------|-------|
| ID | SPEC-04 |
| Estado | Draft |
| Prioridad | P0 |
| Dependencias | SPEC-02 |

## 1. Contexto

Las categorías clasifican ingresos y gastos para presupuestos y analytics.

## 2. Historias de usuario

1. Quiero un set de categorías default al crear un workspace.
2. Quiero crear, renombrar y archivar categorías.
3. Quiero subcategorías opcionales (1 nivel de profundidad en MVP).

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Seed de categorías default (income + expense) al crear workspace |
| FR-02 | CRUD lógico: create, rename, archive |
| FR-03 | kind `income` \| `expense` inmutable tras crear |
| FR-04 | parentId opcional; parent debe mismo kind y mismo workspace |
| FR-05 | Listar árbol o lista plana |

## 4. Reglas de negocio

- Nombre único por workspace + kind (case-insensitive) entre no archivadas.
- No asignar transaction a categoría archivada.
- Expense no puede usar categoría income y viceversa.
- Máximo 1 nivel de anidación (parent sin parent).

## 5. Comandos y consultas

| Tipo | Nombre |
|------|--------|
| Command | `CreateCategory` |
| Command | `RenameCategory` |
| Command | `ArchiveCategory` |
| Query | `ListCategories` |

## 6. Criterios de aceptación

- [ ] Workspace nuevo tiene categorías seed (≥ 5 expense, ≥ 2 income).
- [ ] Validación kind al asociar a transaction (SPEC-05).

## 7. Escenarios de test (TDD)

### T-01 Seed

- **Given** nuevo workspace  
- **When** creado  
- **Then** existen categorías default

### T-02 Nombre duplicado

- **Given** categoría "Comida" expense  
- **When** crear otra "comida" expense  
- **Then** error `DuplicateCategoryName`

### T-03 Profundidad

- **Given** categoría con parent  
- **When** crear hijo de esa subcategoría  
- **Then** error `MaxCategoryDepth`

### T-04 Kind mismatch parent

- **Given** parent income  
- **When** create child expense  
- **Then** error

## 8. Fuera de alcance

- Iconos/colores custom avanzados (UI puede tener defaults)
- Reglas automáticas de categorización por merchant
