# ROADMAP.md

## 1. Project Overview

This repository defines a pair of coordinated TypeScript projects that extend the capabilities of the TypeScript compiler to extract, analyze, and utilize type information for validation and data migration purposes.

### Components

1. **Validation Project**  
   Generates runtime validators and JSON Schemas directly from TypeScript type definitions and JSDoc annotations.  
   Goal: runtime validation without schema duplication.
2. **Migration Project**  
   Derives database schema and migration plans from the same type definitions and annotations.  
   Goal: deterministic schema evolution and safe, explainable migrations.

Both rely on a shared compiler integration layer that extracts a stable intermediate representation (IR) from the TypeScript type system.

---

## 2. Supported Syntax

### 2.1 TypeScript Subset

Only deterministic, structurally resolvable parts of the type system are supported.

| Category                   | Supported                                                    | Notes                           |
| -------------------------- | ------------------------------------------------------------ | ------------------------------- |
| Primitives                 | `string`, `number`, `boolean`, `bigint`, `null`, `undefined` | Canonical scalar types          |
| Literals / Enums           | String/number literal unions, `enum` declarations            | Lowered to literal unions       |
| Arrays / Tuples            | `T[]`, `[T1, T2]`                                            | Standard container types        |
| Objects / Interfaces       | Flat and nested interfaces                                   | Core structure                  |
| Intersections              | Simple property merges                                       | Conflict detection implemented  |
| Unions                     | Of homogeneous object types or literal unions                | Used for discriminated variants |
| Generics                   | Only when instantiated with concrete arguments               | No generic factories            |
| Type aliases               | Full support                                                 | Flattened in IR                 |
| `Record<string, T>`        | Supported                                                    | Homogeneous maps only           |
| Conditional / Mapped types | Partially supported                                          | Must resolve to concrete form   |
| Recursive types            | Supported with cycle detection                               | `$ref` representation           |
| Function / Call signatures | Unsupported                                                  | Out of scope                    |
| Template literal types     | Resolved to `string` or rejected                             | Partial pattern generation only |

If the compiler cannot reduce a type to a concrete structural form, extraction fails with a diagnostic.

---

### 2.2 Supported JSDoc Annotations

#### Entity and Database Schema

| Tag                                    | Meaning                              |
| -------------------------------------- | ------------------------------------ |
| `@entity [name]`                       | Marks interface as a database entity |
| `@pk`                                  | Primary key                          |
| `@unique`                              | Unique constraint                    |
| `@index [fields[:unique]]`             | Secondary index                      |
| `@fk target.field [onDelete:onUpdate]` | Foreign key                          |
| `@default value`                       | Default expression                   |
| `@renameFrom oldName[@version]`        | Rename hint for migrations           |
| `@domain name as type [check(...)]`    | Defines PostgreSQL domain            |
| `@sqlType type`                        | Overrides inferred SQL type          |
| `@decimal precision,scale`             | Declares numeric precision           |
| `@check expression`                    | Adds SQL check constraint            |
| `@version semver`                      | Optional schema version tag          |

#### Validation Constraints

| Tag                        | Applies To     | Description                                |
| -------------------------- | -------------- | ------------------------------------------ |
| `@min`, `@max`             | numbers        | Numeric bounds                             |
| `@int`                     | numbers        | Integer only                               |
| `@minLength`, `@maxLength` | string, array  | Length bounds                              |
| `@pattern`, `@regex`       | string         | Regex constraint                           |
| `@format`                  | string         | e.g. `email`, `uuid`, `url`, `date-time`   |
| `@email`, `@uuid`, `@url`  | string         | Shortcuts for `@format`                    |
| `@nullable`, `@optional`   | any            | Overrides inferred nullability/optionality |
| `@enum`                    | string, number | Declares fixed set of allowed values       |
| `@description text`        | any            | For documentation only                     |
| `@validator name`          | any            | Uses named validator from registry         |

Annotations are optional; types remain valid TypeScript even without them.

---

## 3. Implementation Plan

### 3.1 Shared Compiler Layer (`@afterdarktk/core`)

**Purpose:** Convert TypeScript types and JSDoc into a normalized intermediate representation (IR).

**Tasks**

1. Integrate with TypeScript `Program` API (`ts-morph` wrapper).
2. Extract symbol graph, resolve type aliases, and collect JSDoc.
3. Normalize structural types into IR nodes.
4. Assign stable deterministic hashes to nodes.
5. Persist cache (`.afterdarktk/cache/`) for incremental rebuilds.
6. Emit diagnostics for unsupported constructs.

**Deliverables:**

- `extractor/` (TypeScript → IR)
- `ir/` schema definitions
- `hash/` and `cache/` utilities

---

### 3.2 Validation System

**Purpose:** Derive runtime validators and schemas from the IR.

**Tasks**

1. IR → JSON Schema emitter.
2. IR → native JS validator emitter (type guards).
3. CLI commands: `validate:emit`, `validate:check`.
4. Registry for constraint definitions and custom validators.
5. Ajv integration via JSON Schema backend.
6. Diagnostic reporting for invalid or conflicting constraints.

**Deliverables:**

- `@afterdarktk/validator` package
- JSON Schema generator
- Ajv plugin
- Tests and examples

**Future:** Zod/Valibot emitters, compiled validator backend.

---

### 3.3 Compiler Validation Plugin

**Purpose:** Provide automatic type-driven validator generation at compile time.

**Tasks:**

1. Scans all calls to validate<T>() and similar entry-points.
2. For each T, resolve structural type, JSDoc annotations, and convert to IR node.
3. Hash IR deterministically, emit compiled validators (.js), schemas (.json) and maintain a manifest.
4. Rewrites validate<T>() to a lightweight runtime lookup during emit.
5. The @afterdarktk/runtime package loads and executes validators directly from the cache.
6. Support lazily rebuilds through the IR pipeline and watch mode.

**Deliverables:**

- `@afterdarktk/compiler-validate` package
- TypeScript transformer plugin
- Watch / incremental build hooks
- Manifest and cache manager

---

### 3.4 Migration System

**Purpose:** Generate safe, deterministic migrations based on type diffs.

**Tasks**

1. Convert entity IR to schema manifest.
2. Store and version manifests (JSON).
3. Compute diffs and classify changes (add, alter, drop, rename).
4. PostgreSQL migration renderer.
5. CLI commands: `migrate:plan`, `migrate:apply`, `migrate:verify`.
6. Handle rename hints and safety checks.
7. Domain and enum creation support.

**Deliverables:**

- `@afterdarktk/migrate` package
- PostgreSQL adapter
- Snapshot store
- Planner and diff engine

**Future:** SQLite and MySQL adapters.

---

### 3.5 Compiler Migration Plugin

**Purpose:** Automate schema manifest generation and incremental diff tracking at compile time.

**Tasks:**

1. Scans all interfaces annotated with `@entity`.
2. Resolves their structure and constraints into IR nodes.
3. Emits a deterministic schema manifest (`.afterdark/cache/manifests/<Entity>.<hash>.json`).
4. Maintains a manifest index mapping entities to version + hash.
5. Optionally pre-computes diffs between previous and current manifests for inspection.

**Deliverables:**

- `@afterdarktk/compiler-migrate` package
- Manifest generator and indexer
- Watch-mode incremental updates
- Diagnostic emission for unsupported constructs

**Future Extensions:** Database introspection; Knex, Prisma, Drizzle adapters

---

### 3.6 Runtime Query Layer

**Purpose:** Provide a minimal query builder using schema metadata.

**Tasks**

1. Implement lightweight query builder around `pg`.
2. Type-safe inserts and selects based on IR.
3. Validation integration before query execution.
4. Mock adapter for testing.

**Deliverables:**

- `@afterdarktk/runtime` package
- `db.<Entity>` proxy interface
- Query builder primitives

**Future:** additional adapters (SQLite, MySQL).

---

### 3.7 CLI Tool

**Purpose:** Unified developer interface.

**Commands**

- `adtk validate check`
- `adtk validate emit`
- `adtk migrate plan`
- `adtk migrate apply`
- `adtk migrate verify`

**Tasks**

1. Watch mode and incremental compilation.
2. Config discovery (`afterdarktk.config.ts`).
3. Colorized output and structured logs.

**Deliverables:** `@afterdarktk/cli` package.

---

### 3.8 Language Server (LSP)

**Purpose:** Real-time feedback in editors.

**Tasks**

1. Integrate with the IR cache for incremental analysis.
2. Provide diagnostics for unsupported constructs.
3. Offer hover info (resolved SQL/validator details).
4. Add code actions for common errors (`add @renameFrom`, etc.).
5. Implement “schema preview” virtual document provider.

**Deliverables:**

- `@afterdarktk/language-server`
- VS Code extension using `vscode-languageserver`

---

## 4. Target Support by Phase

| Phase                               | Focus                                                                                              | Validation Backends | DB Backends   | Tools          |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------- | ------------- | -------------- |
| **1. Core + Validation**            | IR extraction, JSON Schema generation, native validators, compiler integration for `validate<T>()` | JSON Schema, JS     | –             | CLI + Compiler |
| **2. Migrations + Compiler Plugin** | Entity manifest extraction via compiler plugin, schema diff engine, PostgreSQL planner             | JSON Schema, JS     | PostgreSQL    | CLI + Compiler |
| **3. Runtime**                      | Query builder, validation/runtime integration, transactional migration executor                    | JSON Schema, JS     | PostgreSQL    | CLI            |
| **4. Language Tools**               | LSP diagnostics, schema previews, live compiler feedback                                           | JSON Schema, JS     | PostgreSQL    | LSP            |
| **5. Expansion**                    | Additional backends, performance, adapters (Prisma, Knex, Drizzle), cross-DB support               | Ajv, Zod, compiled  | SQLite, MySQL | Optional       |

---

## 5. Contribution Guidelines

1. **Follow structure:** keep packages modular under `/packages/{core,validator,migrate,runtime,cli,language-server}`.
2. **No runtime coupling:** all derivations flow from the TypeScript IR.
3. **Tests:** every feature must include compiler snapshot and integration tests.
4. **Documentation:** each package includes a `README.md` summarizing purpose, public API, and examples.
5. **Coding standards:** TypeScript strict mode enabled, consistent error formatting and stable hashes.

---

## 6. Long-Term Goals

- Support incremental builds and large monorepos.
- Introduce domain registry and constraint registry as independent packages.
- Extend output targets: OpenAPI, GraphQL, Avro, or other schema emitters.
- Maintain zero-runtime dependency philosophy: TypeScript remains the primary schema language.

---
