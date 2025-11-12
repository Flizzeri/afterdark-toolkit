# Afterdark Toolkit – Development Guide

## This document defines the development discipline, code quality expectations, and coding patterns for the **Afterdark Toolkit** (`@afterdarktk/*`).

## 1. Development Discipline

### 1.1 Version Control Hygiene

- **Branch model:** light Gitflow
     - `main`: stable, released code only.
     - `develop`: integration branch for tested features.
     - `feature/*`: each feature or subsystem.
     - `fix/*`: isolated bug fixes.
     - `release/*`: staging for tagged versions.

- **Commits:** atomic and descriptive using [Conventional Commits](https://www.conventionalcommits.org/)

     ```
     feat(core): add deterministic IR hashing
     fix(validator): handle nullable enums correctly
     refactor(cli): extract config loader
     docs: update migration overview
     ```

- **Pull Requests:**
     - Must pass lint, format, type-check, and tests.
     - Require review.
     - Merge only via PR, no direct pushes.
     - Squash merges preferred (preserve linear history).

- **Tags:** semantic versioning `vMAJOR.MINOR.PATCH` applied only on `main`.

### 1.2 Project Structure

```
packages/
  core/             	# Compiler integration, IR extraction
  validator/        	# Validation and JSON Schema emission
  migrate/          	# Schema diffing and SQL generation
  compiler-validate/	# Compiler plugin for validation schema generation
  compiler-migrate/	# Compiler plugin for migration manifests generation
  runtime/          	# Query builder and runtime validation
  cli/              	# Command-line interface
  language-server/  	# LSP and diagnostics
```

- All packages share a unified `tsconfig.base.json` and `.eslintrc.cjs`.
- No circular dependencies between packages.
- Each package exports its **public API** explicitly via `src/index.ts`.
- Avoid runtime coupling between packages; communicate only through IR types or shared contracts.

### 1.3 Branch and Release Management

- `develop` → staging ground for release.
- `release/x.y.z` branches are created when preparing a version.
- CI runs full build + tests + coverage on `develop` and `main`.
- Versioning and changelogs automated with **Changesets**.

### 1.4 External Documentation

- Root `README.md`: overview and quickstart.
- Each package includes a short `README.md` with purpose, install, usage, and exported API.
- Detailed documentation is generated with **TypeDoc** and deployed as a docs site (`/docs`).
- Public error codes (`ADTK-*`) and CLI commands have dedicated reference pages.

### 1.5 Public API Policy

- Only exports from `src/index.ts` are considered public.
- Breaking changes to public exports or IR structures require a **minor** version bump at minimum.
- Internal modules (helpers, utils, cache) are private and may change freely.

---

## 2. Code Quality Standards

### 2.1 Internal Documentation & Comments

- Every exported symbol must have a **TSDoc** comment.
- Complex logic sections include **JSDoc** comments explaining intent and invariants, not implementation.
- Public functions and classes must describe:
     - Parameters and return types.
     - Possible errors or diagnostics.
     - Example usage if non-trivial.

Example:

```ts
/**
 * Converts a TypeScript symbol into an IR node.
 * @param symbol - The compiler symbol to resolve.
 * @returns Normalized IRNode.
 * @throws DiagnosticError if the symbol is not structurally reducible.
 */
export function resolveSymbol(symbol: ts.Symbol): IRNode { ... }
```

---

### 2.2 Error Handling and Diagnostics

- Never throw strings; use structured diagnostics.
- Each error includes:
     - **Code:** e.g. `ADTK-IR-1001`
     - **Category:** `error | warning | info`
     - **Context:** file, symbol, location
     - **Help URL:** points to docs page

- CLI and LSP must print diagnostics in **pretty** and **JSON** modes.
- Stack traces only shown with `--debug`.

Example:

```
error ADTK-MIG-3007 Destructive column drop detected
  src/entities/user.ts:42:5 entity: User field: nickname

help: Add @renameFrom nickname to preserve data
docs: https://afterdark.dev/errors/ADTK-MIG-3007
```

---

### 2.3 Testing and Coverage

- **Framework:** Vitest
- **Coverage target:** 90% overall, 100% for IR and SQL planners.
- Each package contains:

     ```
     tests/
       unit/
       integration/
       fixtures/
     ```

- Snapshot tests use canonicalized JSON (sorted keys).
- Every new feature must include tests; PRs without coverage are rejected.
- CI runs:
     - `pnpm lint`
     - `pnpm build`
     - `pnpm test`
     - Coverage gating (fail if coverage < threshold).

---

### 2.4 Linting and Formatting

- **Prettier** enforces consistent formatting.
- **ESLint** enforces:
     - Explicit return types.
     - No implicit `any`.
     - No default exports.
     - Ordered imports.
     - No unused variables.

- Hooks:
     - Pre-commit: format, lint, type-check via **Husky + lint-staged**.
     - CI: rejects lint or type errors.

---

### 2.5 Code Structure & Readability

- Prefer small, pure functions.
- Functions >50 lines must be split or justified.
- Avoid hidden side effects.
- Use `readonly` and `const` aggressively.
- Determinism is a requirement: no reliance on `Object.keys()` order, timestamps, or non-stable hashing.
- Logging goes through shared `Logger` utility—no `console.log`.

---

## 3. Coding Patterns and Practices

### 3.1 Core Philosophy

The Afterdark Toolkit codebase follows **functional, deterministic, and type-safe** principles.
Avoid mutable global state, class-heavy OOP, and runtime polymorphism.

---

### 3.2 Preferred Patterns

#### **Result Pattern**

Use `Result<T>` for all recoverable operations.

```ts
type Result<T> = { ok: true; value: T } | { ok: false; diagnostics: Diagnostic[] };
```

Example:

```ts
const res = parseSchema(file);
if (!res.ok) {
        printDiagnostics(res.diagnostics);
        return;
}
processIR(res.value);
```

#### **Functional Composition**

- Prefer pure functions and composition over class hierarchies.
- Immutable data flow: never mutate IR nodes after creation.
- Use functional utilities for transforms:

     ```ts
     const normalized = pipe(extractSymbols(program), resolveTypes, flattenAliases, normalizeIR);
     ```

#### **Error as Data**

- Diagnostics are returned, not thrown, unless truly fatal.
- Collect and aggregate all recoverable diagnostics to show users complete context.

#### **Deterministic Outputs**

- All serialization (IR, manifests, schemas) uses **canonical JSON encoding** (sorted keys, fixed whitespace).
- Every hash must be stable across platforms and TS versions.

#### **Config and Environment Isolation**

- Configuration loaded once per CLI run.
- No implicit reading from process.env outside config loader.
- All side-effectful operations (file I/O, DB, CLI) are isolated in boundary modules.
- Compiler plugins have no I/O, database introspection is handled by the runtime layer.

---

### 3.3 Anti-Patterns

- Throwing errors for expected invalid input.
- Dynamic typing (`any`, `unknown` cast chains).
- Implicit global state or mutable singletons.
- Hidden I/O in library code (e.g., writing to disk during analysis).
- Randomness or time-based IDs without stable seed.

---

### 3.4 Functional Leaning Style

- Composition over inheritance.
- Small stateless modules; side effects last.
- Use `pipe`, `map`, `flatMap` for transformation pipelines.
- Treat IR transformations as pure functions.
- Encapsulate mutations (e.g., migrations) in isolated builder objects with `apply()` methods that produce new immutable snapshots.

---

### 3.5 Example: Safe Transform Pipeline

```ts
import { extractIR } from '@afterdarktk/core';
import { validateIR } from '@afterdarktk/validator';
import { planMigration } from '@afterdarktk/migrate';

export async function analyzeAndPlan(tsconfig: string) {
        return pipeAsync(
                () => extractIR(tsconfig),
                (ir) => validateIR(ir),
                (validated) => planMigration(validated),
        );
}
```

Each step:

- Accepts and returns explicit data.
- Never mutates global state.
- Returns diagnostics instead of throwing.

---

### 3.6 Style Notes

- **Imports:** built-in → external → internal → relative.
- **Exports:** named only.
- **Public enums and constants:** use `PascalCase` or `UPPER_SNAKE_CASE`.
- **No magic strings:** centralize keys and codes in a `constants.ts`.
- **All async functions:** use `async/await`, not raw Promises.

---

## 4. Enforcement

All these rules are enforced by:

- ESLint and Prettier configurations.
- Husky pre-commit hooks.
- CI pipelines for lint, type-check, tests, and coverage.
- Code review checklists for maintainers.

---

### In Short

**Afterdark Toolkit’s engineering principles:**

- Deterministic output.
- Functional and composable architecture.
- Strict typing and consistent documentation.
- Reproducible builds and tests.
- Developer discipline at every step.

---
