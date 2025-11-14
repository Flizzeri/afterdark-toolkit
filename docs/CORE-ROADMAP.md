src/
pipe/
extract.ts // Orchestrates the full pipeline
graph.ts // Symbol DAG + SCCs

    ts/
    	program.ts // ts-morph integration
    	symbols.ts // Declar, symbol utilities
    	fs.ts // Boundary for file operations

    types/
    	types.ts // Structural resolved type model
    	resolve.ts // TS → ResolvedType (pure, no IR)
    	supportMatrix.ts // Optional: supported TS constructs table

    jsdoc/
    	tags.ts // Tag definitions (allowed tags + structured form)
    	annotations.ts // Annotation domain model (ParsedAnnotation, etc.)
    	parse.ts // Only syntax parsing
    	validate.ts // Semantic validation, using ResolvedType

    ir/
    	nodes.ts // IR node discriminants and shape
    	lower.ts // ResolvedType + ValidatedAnnotations → IR
    	entityIndex.ts // Optional: IR-level entity index

    canonical/
    	encode.ts // Deterministic canonical JSON
    	hash.ts // Stable hashing

    cache/
    	layout.ts
    	fingerprint.ts
    	index.ts // Map symbol → hash, incremental rebuild metadata

    diagnostics/
    	codes.ts // ADTK-CORE-XXXX etc
    	factory.ts
    	reporter.ts // Pretty+JSON reporters

    shared/
    	primitives.ts // Branded types: FilePath, Hash, EntityName...
    	constants.ts // Cache dirs, static names
    	result.ts // Result<T>, Option<T>
    	diagnostics.ts // Diagnostics types
    	utils/
    	fn.ts // pipe, pipeAsync, map, flatMap
    	graph.ts // Graph helpers for generic DAG utilities

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

## 3. TS Integration Layer (`ts/`)

12. **feat(core/ts): add program loader and filesystem boundary**
       - `src/ts/fs.ts`: tiny wrapper over `fs` access (read file, stat, realpath) to keep I/O isolated.
       - `src/ts/program.ts`: creates and maintains a `ts-morph` `Project` from `tsconfig.json`:
            - Strict options enforced.
            - Return `Result<Project, Diagnostic[]>`.

13. **feat(core/ts): symbol utilities**
       - `src/ts/symbols.ts`:
            - Functions to enumerate source files, exported symbols, and JSDoc entries at TS AST level.
            - Helpers to get `Span` information (file, line, column).
            - No JSDoc parsing semantics (just raw tags/comments extraction).

14. **test(core/ts): small fixture programs and symbol extraction tests**
       - `tests/fixtures/ts/minimal-project/` etc.
       - Assert that symbols and file paths are collected deterministically across OS.

---

## 4. Structural Type Resolution Layer (`types/`)

15. **feat(core/types): define resolved type model**
       - `src/types/types.ts`:
            - Discriminated union `ResolvedType` with `kind: 'primitive' | 'literalUnion' | 'object' | 'array' | 'tuple' | 'union' | 'intersection' | 'record' | 'ref' | ...`.
            - Encodes exactly the supported TS subset.

       - Enforce read-only structures and clear fields needed by later IR lowering.

16. **feat(core/types): implement TypeScript → ResolvedType resolver**
       - `src/types/resolve.ts`:
            - Functions like `resolveSymbolType(symbol: ts.Symbol): Result<ResolvedType, Diagnostic[]>`.
            - Handles supported structures:
                 - primitives, literal/enum unions, objects/interfaces, tuples/arrays, simple unions/intersections, `Record<string, T>`, concrete generics.

            - Emits `Diagnostic` on unsupported constructs rather than throwing.

17. **feat(core/types): supported features matrix**
       - `src/types/supportMatrix.ts`:
            - Enumerates support status for each TS construct (supported, partial, unsupported).
            - Used by resolver when generating diagnostics (“this conditional type is not concretely reducible”, etc.).

18. **test(core/types): resolution fixtures and diagnostics**
       - Fixtures for each construct type (primitive, literal union, object, recursive type, etc.).
       - Snapshot tests for `ResolvedType` structures.
       - Negative tests for unsupported types with precise diagnostics.

---

## 5. JSDoc Parsing and Annotation Validation (`jsdoc/`)

19. **feat(core/jsdoc): tag and annotation domain model**
       - `src/jsdoc/tags.ts`:
            - Enumerates supported tags (`@entity`, `@pk`, `@fk`, `@unique`, `@index`, `@nullable`, `@min`, `@max`, `@version`, etc.).
            - Defines `TagName` and allowed payload shapes.

       - `src/jsdoc/annotations.ts`:
            - Structured forms like `EntityAnnotation`, `PrimaryKeyAnnotation`, `IndexAnnotation`, `FormatAnnotation`, etc.
            - Discriminated union `Annotation`.

20. **feat(core/jsdoc): JSDoc syntax parser**
       - `src/jsdoc/parse.ts`:
            - Takes raw TS JSDoc info from `ts/symbols.ts`.
            - Produces `ParsedAnnotation[] | Diagnostic[]` per declaration:
                 - Only checks: tag is known, payload conforms to grammar.
                 - No semantics: doesn’t check “is this field scalar” or “does target exist”.

21. **feat(core/jsdoc): annotation semantic validator**
       - `src/jsdoc/validate.ts`:
            - `validateAnnotations(resolvedType: ResolvedType, annotations: ParsedAnnotation[]): Result<ValidatedAnnotations, Diagnostic[]>`.
            - Checks:
                 - `@pk` only on scalar/allowed types.
                 - `@index` fields exist in object shape.
                 - `@fk` target entity/field is valid (using a symbol/type context).
                 - Optionality/nullability consistency (`@nullable`, `@optional`).
                 - Numeric/string constraints consistent with underlying type.

22. **test(core/jsdoc): parsing and validation fixtures**
       - Valid combinations: entity with pk, index, fk; validation constraints (min, max, pattern).
       - Invalid combos: `@pk` on object, `@index` for unknown field, invalid `@version` format, etc.
       - Snapshot diagnostics.

---

## 6. IR Layer (`ir/`)

23. **feat(core/ir): define IR node model**
       - `src/ir/nodes.ts`:
            - Discriminated union `IRNode` for primitives, arrays, objects, unions, enums, refs, entities, domains, etc.
            - Top-level `IRProgram` or `IRSchema` type covering all entities + types.
            - Include metadata: `id`, `kind`, `span`, `annotations`, etc.

24. **feat(core/ir): lower resolved types + validated annotations to IR**
       - `src/ir/lower.ts`:
            - `lowerTypeToIR(symbolId: SymbolId, resolved: ResolvedType, annotations: ValidatedAnnotations): Result<IRNode, Diagnostic[]>`.
            - Strictly merges structural typing with domain metadata from annotations.
            - Handles recursive references via `$ref` nodes using previously built graph.

25. **feat(core/ir): entity index builder**
       - `src/ir/entityIndex.ts`:
            - Builds indexes over `IRProgram` for quick lookup by entity name, domain, etc.
            - Used later by other packages (validator/migrate) without re-walking the whole tree.

26. **test(core/ir): IR lowering fixtures**
       - Input: resolved type + annotations.
       - Output: IR nodes in canonical object structure.
       - Check recursive types, entities with fk/index, enums, etc.

---

## 7. Canonical IR Encoding + Hashing Integration

27. **feat(core/ir): canonical IR encoding helpers**
       - Extend or adapt `canonical/encode.ts` to handle `IRProgram` as a first-class type:
            - `encodeIR(ir: IRProgram): string` using canonical encoder.

       - Ensure IR nodes are fully serializable and no runtime-specific values leak in.

28. **feat(core/ir): IR hashing utilities**
       - `hashIR(ir: IRNode | IRProgram): Hash`.
       - Used as stable identity key for caching and downstream consumers.

29. **test(core/ir): canonical + hash stability for IR**
       - Fixtures where field order is intentionally shuffled before lowering; final canonical string + hash must be stable.
       - Multi-entity schemas to validate determinism.

---

## 8. Cache Layer (`cache/`)

30. **feat(core/cache): cache layout and path helpers**
       - `src/cache/layout.ts`:
            - Cache root: `.afterdarktk/cache`.
            - Subdirs: `ir/`, `symbols/`, `indexes/`.
            - Functions to compute file paths based on `EntityName`, `Hash`, etc.

31. **feat(core/cache): fingerprinting for incremental builds**
       - `src/cache/fingerprint.ts`:
            - Compute fingerprints for:
                 - TS config.
                 - TS version + compiler options.
                 - Source file content.

            - Return a `CacheFingerprint` object used to determine when to reuse vs. rebuild.

32. **feat(core/cache): cache index management**
       - `src/cache/index.ts`:
            - Maintains index mapping: `SymbolId → { hash: Hash, fingerprint: CacheFingerprint }`.
            - Read/write JSON index file atomically.
            - API to query which symbols need recomputation.

33. **test(core/cache): atomicity, invalidation, index behavior**
       - Simulate corruption (partial write) and ensure index detects and recovers.
       - Verify fingerprint changes trigger recomputation and that stale entries are not reused.

---

## 9. Diagnostics Reporter (`diagnostics/reporter.ts`)

34. **feat(core/diagnostics): pretty + JSON diagnostic reporters**
       - `src/diagnostics/reporter.ts`:
            - Functions `printPretty(diagnostics: Diagnostic[])` and `printJson(diagnostics: Diagnostic[])`.
            - Formats with spans, code, category, help URL stubs.
            - Optional `debug` flag to include stack traces.

35. **test(core/diagnostics): reporter output snapshots**
       - Verify formatting correctness, stable ordering, and JSON output structure.

---

## 10. Pipeline Coordinator (`pipe/`)

36. **feat(core/pipe): graph builder for symbols**
       - `src/pipe/graph.ts`:
            - Builds dependency graph between symbols (types, entities).
            - Computes SCCs and topological order.
            - Exposes high-level representation for pipeline orchestration.

37. **feat(core/pipe): extraction pipeline coordinator**
       - `src/pipe/extract.ts`:
            - High-level `extractProgramIR(tsconfigPath: FilePath): Result<{ ir: IRProgram; diagnostics: Diagnostic[] }, ErrorLike>`.
            - Orchestrates:
                 1. Load TS program.
                 2. Collect symbols.
                 3. Build symbol graph.
                 4. For each symbol (in topo order):
                       - Resolve type (`types/resolve.ts`).
                       - Parse JSDoc (`jsdoc/parse.ts`).
                       - Validate annotations (`jsdoc/validate.ts`).
                       - Lower to IR (`ir/lower.ts`).
                       - Encode and hash (`ir` + `canonical`).
                       - Consult and update cache (`cache/*`).

            - Aggregates diagnostics across all steps.

38. **test(core/pipe): end-to-end extraction tests**
       - Minimal project fixture with multiple entities and annotations.
       - Assert:
            - IRProgram structure.
            - Cache files created.
            - Diagnostics collected for unsupported constructs.

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
