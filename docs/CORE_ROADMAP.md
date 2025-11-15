src/
pipe/
extract.ts
index.ts

ts/
fs.ts
program.ts
symbols.ts

types/
types.ts
resolve.ts
supportMatrix.ts

jsdoc/
tags.ts
annotations.ts
parse.ts
validate.ts

ir/
nodes.ts
lower.ts
entityIndex.ts

canonical/
encode.ts
hash.ts

cache/
layout.ts
fingerprint.ts
index.ts

diagnostics/
codes.ts
factory.ts
reporter.ts

shared/
primitives.ts
constants.ts
result.ts
diagnostics.ts
utils/
fn.ts
graph.ts // generic only, not TS-specific

---

## 0. Repo + Core Package Foundation

1. **chore(repo): scaffold workspace and base tooling**
      - Add `pnpm-workspace.yaml`, root `package.json`, `.editorconfig`, `.gitignore`, `.nvmrc`.
      - Set up root `tsconfig.base.json` (strict mode, composite projects).
      - Configure ESLint + Prettier (no default exports, explicit return types, ordered imports).
      - Add Husky + lint-staged hooks (`lint`, `test`, `typecheck` on staged files).

2. **chore(core): create @afterdarktk/core package skeleton**
      - `packages/core/package.json` with proper name, main/module/types/exports map.
      - `packages/core/src/index.ts` (empty public API placeholder).
      - Minimal `README.md` describing purpose of `@afterdarktk/core`.
      - Wire package into workspace scripts (`build`, `test`, `lint`).

3. **build(ci): add CI for lint, typecheck, test, coverage**
      - GitHub Actions (or equivalent) workflow:
           - `pnpm install`, `pnpm -w lint`, `pnpm -w test --coverage`, `pnpm -w build`.

      - Enforce coverage threshold (90% global, without per-folder gating yet).
      - Fail merges on CI failure.

---

## 1. Shared Primitives, Results, and Diagnostics Contracts

4. **feat(core/shared): add primitives and constants module**
      - `src/shared/primitives.ts`: branded types (`FilePath`, `EntityName`, `SymbolId`, `Hash`, etc.).
      - `src/shared/constants.ts`: cache dir names, file extensions, environment constants.
      - All exports are pure, zero side-effects.

5. **feat(core/shared): introduce Result and Option types**
      - `src/shared/result.ts`: `Result<T, E>`, `Ok<T>`, `Err<E>`, `Option<T>` helpers.
      - Utility functions: `map`, `flatMap`, `fromNullable`, `combineResults`, etc.
      - No knowledge of TS/IR/JSDoc – generic only.

6. **feat(core/diagnostics): add diagnostic types and codes skeleton**
      - `src/diagnostics/types.ts`: `Diagnostic`, `Span`, `DiagnosticCategory`, `DiagnosticCode` (branded).
      - `src/diagnostics/codes.ts`: reserved code namespaces (`ADTK-CORE-*`, `ADTK-JSDOC-*`, `ADTK-TYPES-*`, `ADTK-IR-*`).
      - `src/shared/diagnostics.ts`: optional re-exports for shared usage where needed.

7. **feat(core/diagnostics): diagnostic factory helpers**
      - `src/diagnostics/factory.ts`:
           - Helpers like `makeError(code, message, span, ctx)`, `makeWarning`, etc.
           - No throwing; everything returns `Diagnostic` or `Result<*, Diagnostic[]>`.

8. **test(core/shared+diagnostics): unit tests for primitives, result, diagnostics**
      - Verify branding (e.g., `Hash` not assignable to `string` without cast).
      - Test `Result` helpers compose correctly and propagate diagnostics.
      - Ensure diagnostics serialize cleanly to JSON.

---

## 2. Canonical Encoding and Hashing (Determinism Core)

9. **feat(core/canonical): implement canonical JSON encoder**
      - `src/canonical/encode.ts`:
           - Deterministic JSON encoding: sorted keys, normalized numbers, stable arrays handling.
           - Rejects unsupported runtime values (`undefined`, functions).

      - Typed as `canonicalEncode(value: unknown): string`.

10. **feat(core/canonical): stable hashing utilities**
       - `src/canonical/hash.ts`:
            - `hashCanonical(value: unknown): Hash` (encode → hash).
            - `hashString(s: string): Hash`.
            - Uses a stable algorithm (e.g. SHA-256) via a single implementation point.

11. **test(core/canonical): golden vector and stability tests**
       - Fixture objects with reordered keys; assert identical canonical JSON + hashes.
       - Include nested structures, arrays, and edge cases (empty arrays, maps represented as objects, etc.).

---

# **3. TS Integration Layer (`ts/`)**

## 12. **feat(core/ts): filesystem boundary + program loader**

### `src/ts/fs.ts`

**Responsibility:**
Minimal and isolated filesystem access.

**Exports:**

- `readFile(path): Promise<string>`
- `stat(path)`
- `realpath(path)`

**Notes:**
Zero TypeScript knowledge. No AST access.

---

### `src/ts/program.ts`

**Responsibility:**
Create and manage a `ts-morph` `Project` using `tsconfig.json`.

**Input:**
`tsconfigPath: FilePath`

**Output:**
`Result<Project, Diagnostic[]>`

**Guarantees:**

- Strict compiler options.
- Deterministic file ordering.
- No side effects outside project loading.

---

## 13. **feat(core/ts): symbol discovery utilities**

### `src/ts/symbols.ts`

**Responsibility:**
Traverse the loaded TS program and extract raw symbol information.

**Input:**
`Project`

**Output:**
`Map<SymbolId, RawSymbol>`

Where `RawSymbol` contains:

```ts
interface RawSymbol {
        id: SymbolId;
        name: string;
        tsSymbol: ts.Symbol;
        declarations: Node[];
        span: SourceSpan | undefined;

        // raw unparsed JSDoc "surface" form:
        // [{ name: "@entity", text: "users", span: {...} }, ...]
        jsdoc: ParsedJsDocTag[];

        // no members collected here — members belong to ResolvedType
}
```

**Responsibilities:**

- Walk source files.
- Identify exported symbols.
- Extract JSDoc tags **verbatim**, without semantic parsing.
- Provide file + position spans for diagnostics.
- No type resolution.
- No annotation parsing.
- No recursion/cycle logic.

---

## 14. **test(core/ts)**

Deterministic symbol extraction from minimal fixture projects.

---

# **4. Structural Type Resolution Layer (`types/`)**

## 15. **feat(core/types): resolved type model**

### `src/types/types.ts`

**Responsibility:**
Define the normalized, structural representation of TypeScript types.

**Output Types:**
`ResolvedType` union:

```ts
primitive |
        literal |
        literalUnion |
        array |
        tuple |
        object |
        record |
        union |
        intersection |
        ref |
        unsupported;
```

Properties:

- Fully expanded structural shape.
- Deterministic ordering (sorted properties, sorted unions).
- Read-only and serializable.

---

## 16. **feat(core/types): TS → ResolvedType resolver**

### `src/types/resolve.ts`

**Responsibility:**
Convert a symbol’s `ts.Type` into a `ResolvedType`.

**Input:**
`symbol: ts.Symbol` + implicit `ts.TypeChecker`

**Output:**
`Result<ResolvedType, Diagnostic[]>`

**Guarantees:**

- No IR, no JSDoc parsing, no metadata.
- Pure structural resolution.
- Records recursive references as `{ kind: 'ref', target: SymbolId }`.
- Emits diagnostics for unsupported TS features (conditional types, infer types, functions, etc.)
- No graph traversal for ordering; resolution is local and self-contained.

---

## 17. **feat(core/types): supported features matrix**

### `src/types/supportMatrix.ts`

Static table enumerating what the resolver supports.
Used by diagnostics and documentation.

---

## 18. **test(core/types)**

Resolution correctness and stable snapshots.

---

# **5. JSDoc Parsing + Annotation Validation (`jsdoc/`)**

## 19. **feat(core/jsdoc): tag and annotation model**

### `src/jsdoc/tags.ts`

**Responsibility:**
Declare all _core-supported_ tag names and describe their expected payload syntax.

For example:

- `@entity`
- `@pk`
- `@unique`
- `@index`
- `@min`, `@max`
- `@format`, `@pattern`
- …

External packages cannot define new tags here (core must know the grammar),
but they _can_ decide _which_ tags they need after IR generation.

---

### `src/jsdoc/annotations.ts`

**Responsibility:**
Define normalized tag structures produced by JSDoc parsing.

Example:

```ts
type Annotation =
  | EntityAnnotation
  | PrimaryKeyAnnotation
  | UniqueAnnotation
  | IndexAnnotation
  | MinAnnotation
  | ...
```

These are **syntax-level representations**, not validated semantically.

---

## 20. **feat(core/jsdoc): syntax parser**

### `src/jsdoc/parse.ts`

**Responsibility:**
Turn raw JSDoc tag strings into structured `ParsedAnnotation[]`.

**Input:**
`RawSymbol.jsdoc: ParsedJsDocTag[]`

**Output:**
`Result<ParsedAnnotation[], Diagnostic[]>`

**Guarantees:**

- Validates syntax and lexical payload shape.
- Does _not_ inspect ResolvedType.
- Does _not_ check existence of referenced fields.
- Does _not_ check whether `@pk` is allowed on this type.
- Never mutates types or symbols.

**Example:**

```
@entity users
→ { kind: "entity", name: "users" }

@min 5
→ { kind: "min", value: 5 }
```

---

## 21. **feat(core/jsdoc): semantic validator**

### `src/jsdoc/validate.ts`

**Responsibility:**
Validate parsed annotations **against the ResolvedType**.

**Input:**

- `resolvedType: ResolvedType`
- `annotations: ParsedAnnotation[]`

**Output:**
`Result<ValidatedAnnotations, Diagnostic[]>`

**Responsibilities:**

- Check that annotations meaningfully apply to the type.
- Enforce scalar/object constraints (`@pk` only on primitives).
- Ensure field names in `@index` or `@fk` exist in `ResolvedType`.
- Enforce that numeric/string constraints match primitive kinds.
- Enforce nullability/optionality consistency.

**No IR is referenced here.**

---

## 22. **test(core/jsdoc)**

Fixtures for valid and invalid annotations.

---

# **6. IR Layer (`ir/`)**

## 23. **feat(core/ir): IR node model**

### `src/ir/nodes.ts`

**Responsibilities:**
Define IR representation consumed by all downstream packages.

**Output Types:**

- `IRPrimitive`
- `IRObject`
- `IRArray`
- `IRUnion`
- `IRRef`
- `IREntity`
- `IRProgram` (collection of all IR nodes)

**Properties include:**

- `symbolId`
- `kind`
- `span`
- `annotations: ValidatedAnnotations`

This is the first stage where annotations and structure are unified.

---

## 24. **feat(core/ir): lowering**

### `src/ir/lower.ts`

**Responsibility:**
Transform `(ResolvedType + ValidatedAnnotations)` into IR.

**Input:**

- `symbolId`
- `ResolvedType`
- `ValidatedAnnotations`

**Output:**
`IRNode`

**Responsibilities:**

- Merge structural and annotation metadata.
- Generate `$ref` nodes for `ResolvedRef`.
- Emit no diagnostics other than malformed IR merging (rare).
- Pure transformation; no TS knowledge at this stage.

---

## 25. **feat(core/ir): entity index builder**

### `src/ir/entityIndex.ts`

**Responsibility:**
Build convenience lookup tables for IR consumers.

**Input:**
`IRProgram`

**Output:**
indexes such as:

```
entityByName: Map<string, IREntity>
symbolsByEntity: Map<EntityName, SymbolId>
```

No mutation, no validation.

---

## 26. **test(core/ir)**

Check lowering correctness and stability.

---

# **7. Canonical IR Encoding & Hashing**

## 27. **feat(core/canonical): encode IR**

`encodeIR(ir: IRProgram): string`

Deterministic JSON:

- Sorted keys
- Stable arrays
- No runtime holes (undefined/function)

---

## 28. **feat(core/canonical): hash IR**

Hash encoding output → constant `Hash`.

Used by cache.

---

## 29. **test(core/canonical)**

Stability tests.

---

# **8. Cache Layer**

## 30. **feat(core/cache): layout**

Compute cache paths, directory names, and conventions.

---

## 31. **feat(core/cache): fingerprints**

Compute fingerprints for inputs using TS program information.

---

## 32. **feat(core/cache): cache index**

Store:
`SymbolId → { hash, fingerprint }`

---

## 33. **test(core/cache)**

Stress tests + invalidation logic.

---

# **9. Diagnostics Reporter**

## 34. **feat(core/diagnostics): reporters**

Pretty printer and JSON emitted diagnostics.

## 35. **test(core/diagnostics)**

Snapshot formatting tests.

---

# **10. Pipeline Coordinator (`pipe/`) — Final, Correct Design**

## 36. **feat(core/pipe): define pipeline state**

### `ExtractionState` includes:

```ts
project: Project
symbols: Map<SymbolId, RawSymbol>
parsedAnnotations: Map<SymbolId, ParsedAnnotation[]>
resolvedTypes: Map<SymbolId, ResolvedType>
validatedAnnotations: Map<SymbolId, ValidatedAnnotations>
irNodes: Map<SymbolId, IRNode>
hashes: Map<SymbolId, Hash>
diagnostics: Diagnostic[]
```

No graph structure. No ordering.
Resolution is local; cycles are handled via `ref`.

---

## 37. **feat(core/pipe): extraction orchestrator**

### `src/pipe/extract.ts`

Implements:

```ts
extractProgramIR(tsconfigPath)
→ Result<{ ir: IRProgram; diagnostics }, ErrorLike>
```

**Pipeline Steps:**

1. Load TS program.
2. Collect symbols.
3. Extract raw JSDoc tags (already in RawSymbol).
4. Parse JSDoc into structured annotations.
5. Resolve structural types for all relevant symbols.
6. Validate annotations against types.
7. Lower to IR.
8. Canonical encode + stable hash.
9. Consult + update cache.
10. Assemble `IRProgram` from IR nodes.

**No dependency graph.
No SCC computation.
No multi-pass resolution.**

## 38. **test(core/pipe): end-to-end extraction tests**

- Setup fixture TypeScript projects (`tests/fixtures/e2e/simple-schema`):
     - Entities with FK/PK/index.
     - Unions, arrays, tuples.
     - Validation annotations.

- Assert:
     - The `IRProgram` is deterministic and stable.
     - Cache entries created correctly.
     - Diagnostics produced for unsupported constructs.
     - JSDoc parsing and ResolvedType content match expected snapshots.

---

## 11. Shared Utilities (`shared/utils/`)

39. **feat(core/shared): functional and graph utilities**
       - `src/shared/utils/fn.ts`:
            - `pipe`, `pipeAsync`, small helpers for functional style.

       - `src/shared/utils/graph.ts`:
            - Generic DAG + SCC algorithms (independent from TS-specific graph).

40. **test(core/shared): utility tests**
       - Ensure `pipe` and `graph` behave deterministically and robustly.

---

## 12. Public API Surface and Documentation

41. **feat(core/api): define public exports in index.ts**
       - `src/index.ts`:
            - Export:
                 - `extractProgramIR`.
                 - IR types (`IRProgram`, `IRNode`).
                 - Diagnostics types and reporter hooks.
                 - Feature matrix from `types/supportMatrix.ts`.

            - Keep internal modules and helpers unexported.

42. **docs(core): write detailed package README**
       - Explain:
            - Concepts: TS → Resolved Types → Annotations → IR → Canonical → Cache.
            - Example usage for `extractProgramIR`.
            - How diagnostics and cache work.
            - Limitations and supported features subset.

---

## 13. Watch Mode and Developer Ergonomics (Optional for v0.1, but planned)

43. **feat(core/pipe): add watch mode orchestration**
       - `src/pipe/watch.ts`:
            - Watch filesystem changes for source files and tsconfig.
            - Re-run pipeline for affected symbols only, based on dependency graph + cache.

44. **test(core/pipe): watch mode simulation tests**
       - Use virtual FS to simulate file changes.
       - Assert minimal recomputation and correct invalidation.

---

## 14. Hardening and Release Prep

45. **perf(core): memoize hot resolution and lowering paths**
       - Memoization keyed by `SymbolId` and relevant fingerprint.
       - Avoids repeated heavy resolution for the same symbol within a run.

46. **chore(core): tighten coverage gates and enforce TSDoc on public API**
       - Per-folder coverage minimums:
            - `types/`, `ir/`, `canonical/`, `cache/`, `diagnostics/` ≥ 100%.

       - CI rule: fail if any `export` in `index.ts` lacks TSDoc.

47. **docs(core): add quickstart examples and troubleshooting**
       - Add sample fixture showing common diagnostics and how to address them.
       - Document cache layout and when to clear it.

48. **chore(core): mark v0.1.0 of @afterdarktk/core**
       - Add a Changeset entry.
       - Tag internal release; ready for the validator/migrate packages to consume.

---
