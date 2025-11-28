# Contributing

This document describes the development standards for the Afterdark Toolkit codebase.

Most mechanical rules are enforced by TypeScript and ESLint. This guide focuses on the design and coding principles that sit on top of those rules, so that contributions stay consistent in style and behaviour.

---

## 1. Tooling and Baseline Rules

The project uses:

- **TypeScript** in strict mode (`noImplicitAny`, `noImplicitReturns`, `exactOptionalPropertyTypes`, etc.)
- **ESLint** with `typescript-eslint`, `import-x`, `jsdoc`, and `prettier`
- **Prettier** for formatting
- **Vitest** for tests

Key enforced rules (non-exhaustive):

- No `any` (`@typescript-eslint/no-explicit-any`)
- Explicit return types on functions (`@typescript-eslint/explicit-function-return-type`)
- Named exports only (`import-x/no-default-export`)
- Ordered imports (builtins → external → internal → relative)
- No unused variables (with `_` prefix allowed for intentionally unused)
- JSDoc required and checked for exported functions/types
- No implicit fallthrough in `switch` (`noFallthroughCasesInSwitch`)
- No implicit returns (`noImplicitReturns`)

New code should respect these constraints by default. If you find yourself fighting the lint rules, prefer improving the design rather than relaxing the rules.

---

## 2. Types and Branded Primitives

We rely heavily on **branded primitives** to avoid mixing unrelated string identifiers.

Defined in `packages/shared/src/primitives/types.ts`:

```ts
type Branded<T, B extends string> = T & { readonly __brand: B };

export type FilePath = Branded<string, 'FilePath'>;
export type EntityName = Branded<string, 'EntityName'>;
export type Hash = Branded<string, 'Hash'>;
export type VersionString = Branded<string, 'VersionString'>;
export type CanonicalJson = Branded<string, 'BrandedJson'>;
export type Fingerprint = Branded<string, 'Fingerprint'>;
export type SymbolId = Branded<string, 'SymbolId'>;
export type TypeId = Branded<string, 'TypeId'>;
export type NodeId = Branded<string, 'NodeId'>;
export type JsDocTagName = Branded<string, 'JsDocTagName'>;
````

**Guidelines:**

* Use branded types instead of plain `string` whenever the value has a domain meaning (paths, hashes, symbol IDs, etc.).

* Do not introduce new plain `string` aliases where an existing brand fits.

* To construct a branded value, use a small helper factory or a well-named function rather than casting everywhere:

  ```ts
  function filePath(value: string): FilePath {
    return value as FilePath;
  }
  ```

* Avoid leaking unbranded strings where the interface already expects a branded type.

The goal is to catch accidental mismatches at compile time (e.g. passing a `Hash` where a `FilePath` is expected).

---

## 3. Error Handling and Result Types

The codebase uses explicit **Result** types instead of exceptions for recoverable conditions.

From `packages/shared/src/utils/utilities.ts`:

```ts
export const ok = <T>(value: T): Result<T> => ({
  ok: true,
  value,
});

export const err = <T = never>(diagnostics: readonly Diagnostic[]): Result<T> => ({
  ok: false,
  diagnostics,
});

export const isOk = <T>(r: Result<T>): r is Ok<T> => r.ok;
export const isErr = <T>(r: Result<T>): r is Err => !r.ok;
```

**Guidelines:**

* For expected failure modes (unsupported constructs, validation failures, parse errors, etc.), return `Result<T>` rather than throwing.

* Functions that can fail in a normal way should be modelled as:

  ```ts
  function parseSomething(input: string): Result<ParsedSomething> { ... }
  ```

* Only throw for truly unrecoverable situations (e.g. internal invariant violations, “should never happen” conditions). These should be guarded with `assertNever` or equivalent.

* When composing multiple `Result`-returning functions, prefer small helpers that aggregate diagnostics instead of early returns sprinkled everywhere.

If you add new modules, follow this pattern to keep error handling predictable and testable.

---

## 4. Exhaustive Switches and Discriminated Unions

We require **exhaustive handling** of discriminated unions. The compiler already enforces `noFallthroughCasesInSwitch`, but we also use an explicit guard:

```ts
export const assertNever = (x: never): never => {
  throw new Error(`Unexpected value: ${x}`);
};
```

**Guidelines:**

* For `kind`/`type` discriminated unions, always close the `switch` with `assertNever`:

  ```ts
  switch (node.kind) {
    case 'primitive':
      return handlePrimitive(node);
    case 'object':
      return handleObject(node);
    // ...
    default:
      return assertNever(node);
  }
  ```

* Do not use `default` branches that silently ignore unknown cases.

* When you extend a union with a new variant, the compiler should guide you to all places that need explicit handling.

This guarantees that new IR node kinds, diagnostics types, or annotation kinds are wired through systematically.

---

## 5. Purity, Immutability, and Side Effects

The core of the system (IR extraction, lowering, analysis) should be as **pure** and **immutable** as is practical.

**Guidelines:**

* Prefer pure functions: given the same inputs, they should return the same outputs and not touch external state.
* Treat IR nodes, diagnostics, and configuration as immutable value objects. Do not mutate them in place after creation.
* Avoid hidden side effects in core modules (no I/O, no logging, no global mutation). File system access, logging, and process interaction belong in clearly marked boundary modules (CLI, cache backend, compiler entrypoints).
* When mutation is required for performance (e.g. internal builders), keep it local and return immutable snapshots from public APIs.

This is important for determinism, testing, and reasoning about the pipeline.

---

## 6. Determinism

The toolkit aims for deterministic behaviour: the same input project should always produce the same IR, the same hashes, and the same artifacts.

**Guidelines:**

* Do not use `Math.random()`, `Date.now()`, or other time-based values in IR, hashing, cache keys, or artifact names.
* When serializing objects, rely on canonical encoders (sorted keys, stable ordering) rather than `JSON.stringify` on arbitrary structures.
* Avoid depending on insertion order of `Map`/`Set` where it affects observable output; if order matters, sort explicitly.

If you introduce a new data structure or output format, consider how to make its representation deterministic before exposing it.

---

## 7. Module and Package Boundaries

The repository is split into multiple packages (shared, core, cache, compiler, plugins, etc.). Respect the layering:

* `shared` contains primitives, diagnostics, and generic utilities. It should not depend on higher-level packages.
* `core` is responsible for IR extraction and should not depend on `compiler` or plugins.
* `cache` encapsulates caching and invalidation logic.
* `compiler` coordinates core, cache, and plugins; it should not contain domain-specific logic that belongs in plugins.

Within modules:

* Use **named exports only**.
* Avoid circular dependencies between files. If you need them, refactor common parts into separate modules under `shared` or a local `internal` folder.

---

## 8. Tests

Every non-trivial change should come with tests.

**Guidelines:**

* Use Vitest for all test suites.
* Organize tests under `tests/` with `unit`, `integration`, and `fixtures` as needed.
* Prefer small, focused unit tests for core functions and IR transformations.
* For snapshot tests (e.g. canonical JSON, IR structure), keep fixtures small and stable.

If you add a new feature, tests should cover both the “happy path” and representative failure modes (diagnostics, unsupported constructs, etc.).

---

## 9. Documentation and Comments

Public exports must be documented with TSDoc/JSDoc comments. ESLint will flag missing or incomplete documentation, but some practices are worth calling out:

* Document **intent and invariants**, not every line of implementation.
* For public functions, describe parameters, return types, and possible diagnostics or error conditions.
* For complex algorithms (e.g. graph traversal, hashing), include a short comment explaining the approach and any important constraints.

Example:

```ts
/**
 * Lower a resolved type and its annotations into an IR node.
 *
 * @param symbolId - Canonical identifier for the symbol being lowered.
 * @param type     - Resolved structural type from the TypeScript program.
 * @param ann      - Validated annotations attached to this symbol.
 * @returns A Result with the IR node or diagnostics when lowering fails.
 */
export function lowerToIr(
  symbolId: SymbolId,
  type: ResolvedType,
  ann: ValidatedAnnotations,
): Result<IRNode> { ... }
```

---

## 10. When in Doubt

If you are unsure about:

* where a piece of logic should live (shared vs core vs cache vs compiler),
* whether an operation should be pure or side-effectful,
* how to model a result or diagnostic,

prefer:

1. **Purity over side effects** in core code.
2. **Explicit `Result` types** over hidden exceptions.
3. **Branded primitives** over raw strings.
4. **Exhaustive handling** of unions with `assertNever`.
5. **Asking in an issue or pull request discussion** before introducing new patterns.

Consistency is more important than individual taste. Aim to fit into the existing style rather than introducing a new one.

---
