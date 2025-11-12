# Repository framing (foundation)

1. **chore(repo): scaffold pnpm workspace and root configs**
   Create `pnpm-workspace.yaml`, root `package.json`, `.editorconfig`, `.nvmrc`, `.gitignore`, `tsconfig.base.json`, `.eslintrc.cjs`, `prettier` config, Husky + lint-staged hooks. Enforce no default exports, explicit types, ordered imports. CI skeleton (Node LTS matrix).

2. **chore(core): create package skeleton for @afterdarktk/core**
   `packages/core/{src,tests,fixtures}/` with `package.json` (types, exports map), `src/index.ts` (no re-exports beyond public API), minimal README.

3. **build(ci): add CI pipelines (lint, typecheck, test, coverage gate)**
   GitHub Actions: `pnpm install`, `pnpm -w build`, `pnpm -w test --coverage` with thresholds (90% overall, 100% for IR+planner targets). Upload coverage. Block merges on failure.

---

# Contracts first (types, invariants, constants)

4. **feat(core/shared): add global constants and branded primitives**
   `src/shared/constants.ts` (project name, cache dir names, manifest file names), `src/shared/primitives.ts` (branded types like `EntityName`, `Hash`, `FilePath`, `DiagnosticCode`), string literal unions for categories (`'error' | 'warning' | 'info'`). Export only via `index.ts`.

5. **feat(core/shared): diagnostic shared and factory**
   `src/diagnostics/types.ts` defines `DiagnosticCategory`, `Diagnostic`, `Span`, `HelpLink`, strict `ADTK-*` code brand. `src/diagnostics/factory.ts` helpers to build diagnostics without throwing; exhaustive `switch` over categories with `never` checks.

6. **test(core/shared): unit tests for diagnostic factory and brands**
   Verify immutability, category exhaustiveness, code branding, JSON-serializability.

---

# Canonical data and hashing (determinism bedrock)

7. **feat(core/canonical): canonical JSON encoder (sorted keys, stable whitespace)**
   `src/canonical/encode.ts` produces canonical JSON (UTF-8, deterministic ordering, numeric normalization, no locale variance). Round-trips values; disallows `undefined`/functions.

8. **feat(core/hash): stable stringify + hashing utils**
   `src/hash/stableStringify.ts` (cycles, BigInt, Maps/Sets with deterministic order), `src/hash/hash.ts` (e.g., SHA-256). Return branded `Hash`. No timezone/date nondeterminism.

9. **test(core/canonical+hash): golden vector tests**
   Fixtures for complex nested objects; assert byte-identical encodings/hashes across platforms.

---

# Caching & fingerprints

10. **feat(core/cache): cache layout and fingerprinting**
    `src/cache/layout.ts` (cache root `.afterdarktk/cache`), subdirs for `ir/`, `symbols/`, `indexes/`. `src/cache/fingerprint.ts` fingerprints by content hash + tsconfig + TS version. Read/write atomic files (temp + rename).

11. **test(core/cache): cache read/write atomicity and invalidation**
    Simulate partial writes; ensure corruption is detected; verifies versioned fingerprints.

---

# ts-morph wrapper (compiler access boundary)

12. **feat(core/ts): compiler host wrapper around ts-morph**
    `src/ts/program.ts` creates/updates `Project`, respects `tsconfig.json`, compiler options in strict mode. `src/ts/fs.ts` boundary for FS. No hidden I/O elsewhere.

13. **feat(core/ts): symbol and type helpers (no I/O)**
    `src/ts/symbols.ts` methods to get declarations, resolve aliases, read JSDoc tags/comments deterministically. Avoids `any`; returns `Result<T>` instead of throwing.

14. **test(core/ts): fixtures for tiny programs**
    Verify project loads, symbol extraction, path normalization across OS.

---

# JSDoc parsing & validation

15. **feat(core/jsdoc): tag parser with strict contracts**
    `src/jsdoc/tags.ts` defines supported tags and exact signatures; `src/jsdoc/parse.ts` extracts from nodes into strongly-typed `ParsedTag[]`. Unknown/duplicate tags -> diagnostics.

16. **feat(core/jsdoc): validators for tag semantics**
    `src/jsdoc/validate.ts` rules per tag (e.g., `@pk` only on scalar, `@index` fields exist, `@fk` references resolved). Returns `Result<void>` + diagnostics.

17. **test(core/jsdoc): valid/invalid examples (fixtures)**
    Cover each tag family; snapshot canonical diagnostics (with codes).

---

# IR schema (the shared intermediate representation)

18. **feat(core/ir): IR node types with exhaustive discriminants**
    `src/ir/types.ts` algebraic data types for primitives, literals, unions, intersections, tuples, object shapes, references, domains, entity metadata. Every node has `kind`, `id`, optional `jsdoc`, and `span`.

19. **feat(core/ir): IR canonical encoder and hashing**
    `src/ir/canonical.ts` → canonical JSON for any IR tree; `src/ir/hash.ts` → stable hash over canonical bytes.

20. **test(core/ir): shape coverage and canonical/hash golden tests**
    Assert identical hash across node re-orderings; ensure `$ref` cycles hash deterministically.

---

# Extraction pipeline (TypeScript → IR)

21. **feat(core/extract): pipeline scaffolding with Result<T>**
    `src/extract/pipeline.ts` orchestrates: collect symbols → resolve types → lower to IR → attach jsdoc → canonicalize → cache. Pure functions; side-effects at boundaries only.

22. **feat(core/extract): symbol graph collection**
    `src/extract/symbolGraph.ts` builds a DAG of reachable types from entry points (exports, `@entity`). Detects cycles, records spans.

23. **feat(core/extract): resolver for TypeScript types → structural forms**
    `src/extract/resolve.ts` supports: primitives, literal/enum unions, arrays/tuples, objects/interfaces (flat/nested), intersections (conflict detection), unions (homogeneous object or literal unions), generics with concrete args, `Record<string,T>`, recursive types (`$ref`) — partial mapped/conditional with reduction to concrete only. Unsupported constructs emit diagnostics and short-circuit the node.

24. **feat(core/extract): lower to IR nodes with invariant checks**
    `src/extract/lower.ts` converts resolved structures to IR nodes, merges JSDoc annotations (validated earlier). Exhaustive `switch(kind)` with `never` guards.

25. **feat(core/extract): features matrix registry**
    `src/extract/features.ts` enumerates each supported TS construct and current status (`supported | partial | unsupported`) with reason and links to docs. Used by diagnostics to suggest guidance.

26. **feat(core/extract): cache integration & index**
    Persist IR per symbol/entity under `cache/ir/<name>.<hash>.json`; write an index mapping symbol → latest hash; incremental rebuild using file + type version fingerprints.

27. **test(core/extract): end-to-end fixtures**
    Input TS -> expected IR (canonical JSON); validate failure cases for unsupported constructs and correct diagnostics aggregation.

---

# Diagnostics reporting & pretty printer

28. **feat(core/diagnostics): pretty and JSON reporters**
    `src/diagnostics/print.ts` formats diagnostics in human-readable and JSON lines (stack traces only with `--debug`). Include help URL seeds.

29. **test(core/diagnostics): snapshot printed output**
    Pretty mode spacing, code alignment, span rendering.

---

# Graph & functional utilities

30. **feat(core/utils): functional utilities and pipe/pipeAsync**
    `src/utils/fn.ts` with `pipe`, `pipeAsync`, `Option`, `Result` helpers; no magic globals.

31. **feat(core/utils): graph utilities**
    `src/utils/graph.ts` for DAGs, SCC detection, topological sort, cycle diagnostics integration (entity/type cycles).

32. **test(core/utils): fn + graph coverage**
    Deterministic topo orders; SCC identification stable.

---

# Public API and boundaries

33. **feat(core/api): public API surface (index.ts) with TSDoc**
    Export _only_ contracts meant for consumers: `extractProgramIR(tsconfig)`, `loadCache()`, `Diagnostic`, `printDiagnostics`, `IR*` types, `FeatureMatrix`. Keep internal helpers private; add TSDoc to every exported symbol.

34. **docs(core): package README with purpose and examples**
    Quickstart, supported features table, diagnostics examples, cache layout. Link to error code docs skeleton.

---

# Incremental & watch ergonomics

35. **feat(core/watch): watch mode orchestrator**
    `src/watch/watch.ts` for file graph watching; on change, recompute affected symbols (graph-driven), update cache/index, stream diagnostics. Debounce with deterministic batching.

36. **test(core/watch): simulated FS changes**
    Modify fixture files; assert minimal recomputation and stable output order.

---

# Strictness and exhaustiveness tooling

37. **feat(core/safety): exhaustive assertions and internal invariant helpers**
    `assertNever(x: never): never` and `invariant(cond, code)` that return diagnostics in non-fatal contexts; remove all string throws.

38. **refactor(core): replace ad-hoc checks with invariant helpers**
    Sweep: resolver, lowerer, jsdoc validators now use shared helpers; reduces drift.

---

# Developer workflow polish

39. **chore(core): type-checking performance and tsconfig tuning**
    Enable incremental builds, composite project settings, strictNullChecks, exactOptionalPropertyTypes, noImplicitOverride.

40. **build(repo): changesets release config (no publish yet)**
    Prepare automated versioning when `develop → main` merges; labels mapping to semver bumps.

---

# Examples & fixtures for communication

41. **feat(core/examples): minimal demo projects**
    `examples/minimal/` with a small entity model, JSDoc tags, and a script that runs `extractProgramIR` and prints canonical IR/diagnostics.

42. **test(core/examples): snapshot example outputs**
    Codify example behavior for regression protection.

---

# Documentation stubs for error codes & features

43. **docs(core): error code index and help URL mapping**
    `docs/errors/ADTK-IR-****.md`, `ADTK-JSDOC-****.md`, `ADTK-RESOLVE-****.md` placeholders referenced by reporter. Keeps help links stable.

44. **docs(core): features matrix page generated from source**
    Script to export `features.ts` as docs table; ensures single source of truth.

---

# Hardening & readiness

45. **perf(core): memoize hot paths (type resolution & canonical encode)**
    Content-addressed memoization keyed by node identity + checker version; no global mutable cache leaks.

46. **perf(core): reduce object churn in lowering by using small structs**
    Freeze IR nodes in production build to guarantee immutability.

47. **test(core): fuzz edge cases for unions/intersections**
    Property-based tests to ensure conflict detection and diagnostic aggregation are stable.

48. **chore(core): public API audit + TSDoc completeness**
    CI step that fails if any exported symbol lacks TSDoc.

49. **chore(core): finalize coverage gates at desired thresholds**
    Enforce 100% on `ir/*`, `canonical/*`, `hash/*`, `diagnostics/*`; 90% overall.

---

# Release preparation (internal)

50. **docs(core): README quickstart refined + API reference pointers**
    Include code samples for loading the program, extracting IR, interpreting diagnostics, watch mode.

51. **chore(core): tag v0.1.0 internal (no public publish)**
    Mark the core as ready for Validation package to consume; record features supported and known limitations.

---

## Notes on design guardrails reflected in the plan

- **Determinism first:** canonical encoding, hashing, cache keys, and stable reporters land before the extractor to avoid retrofits.
- **Contracts early:** branded types, strict unions, and diagnostic codes are introduced before any complex logic to keep everything strongly typed and exhaustively checked.
- **No hidden side-effects:** all I/O isolated to `ts/` and `cache/` boundaries; core algorithmic code is pure and easy to test.
- **Partial TypeScript support made explicit:** features matrix + diagnostics provide crisp guardrails for users and future contributors.
