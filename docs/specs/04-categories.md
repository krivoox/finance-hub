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
4. Quiero crear una categoría al registrar un movimiento, escribiendo el nombre y eligiendo un emoji a la izquierda.

## 3. Requisitos funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | Seed de categorías default (income + expense) al crear workspace |
| FR-02 | CRUD lógico: create, rename, archive |
| FR-03 | kind `income` \| `expense` inmutable tras crear |
| FR-04 | parentId opcional; parent debe mismo kind y mismo workspace |
| FR-05 | Listar árbol o lista plana |
| FR-06 | Alta rápida desde el formulario de movimiento: nombre + emoji opcional a la izquierda |
| FR-07 | Query de uso: conteo de transacciones por `categoryId` en el workspace (para atajos) |

## 4. Reglas de negocio

- Nombre único por workspace + kind (case-insensitive, sin emoji ni diacríticos) entre no archivadas. `"🍽️ Comida"` y `"Comida"` colisionan.
- El nombre puede prefijarse con un emoji (seed y alta rápida): `"🍽️ Comida"`.
- No asignar transaction a categoría archivada.
- Expense no puede usar categoría income y viceversa.
- Máximo 1 nivel de anidación (parent sin parent).
- Atajos del formulario: hasta 5 categorías más usadas del kind actual (4 si no entran); desempate = orden del seed; categorías de sistema sin uso no se priorizan.

## 5. Comandos y consultas

| Tipo | Nombre |
|------|--------|
| Command | `CreateCategory` |
| Command | `RenameCategory` |
| Command | `ArchiveCategory` |
| Query | `ListCategories` |
| Query | `CountCategoryUsage` |

## 6. Criterios de aceptación

- [ ] Workspace nuevo tiene categorías seed (≥ 5 expense, ≥ 2 income), con emojis en nombres de uso diario y categorías de suscripción (`📺 Streaming`, `🤖 IA`, `💻 Software`, `🎮 Gaming`, `☁️ Almacenamiento`).
- [ ] Validación kind al asociar a transaction (SPEC-05).
- [ ] Workspaces existentes reciben las categorías de suscripción vía `ensureSubscriptionCategories` (Ajustes / Recurrentes).
- [ ] Alta desde el picker: si el texto no coincide con una categoría existente (sin emoji), se puede crear `"{emoji} {nombre}"` y queda seleccionada.
- [ ] El formulario de alta muestra 4 o 5 atajos (las más usadas que entren) más el selector completo.

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

### T-05 Nombre único ignora emoji

- **Given** categoría "🍽️ Comida" expense  
- **When** crear "Comida" expense  
- **Then** error `DuplicateCategoryName`

### T-06 Compose nombre con emoji

- **Given** emoji "💊" y label "Farmacia"  
- **When** `composeCategoryName`  
- **Then** `"💊 Farmacia"`

### T-07 Sugerencia de alta desde búsqueda

- **Given** categorías existentes "🍽️ Comida"  
- **When** query "Farmacia"  
- **Then** sugerencia `{ emoji: null, label: "Farmacia" }`  
- **When** query "Comida" o "🍽️ comida"  
- **Then** sin sugerencia (ya existe)

### T-08 Atajos más usadas

- **Given** categorías A,B,C,D,E,F con usos 10,3,3,0,0,1  
- **When** `pickFrequentCategories` con limit 5  
- **Then** A, B o C (desempate seed/nombre), F, y el resto por seed — nunca más de `limit`

## 8. Fuera de alcance

- Iconos/colores custom avanzados (UI puede tener defaults)
- Reglas automáticas de categorización por merchant
