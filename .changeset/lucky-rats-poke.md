---
'@adtk/shared': minor
---

---

## "@adtk/shared": minor

Initial release of `@adtk/shared` package

This package provides foundational types and utilities used across the Afterdark Toolkit:

- **Branded types**: Type-safe wrappers for `SymbolId`, `FilePath`, `Hash`, `CanonicalJson`, `TagName`, `SemVer`
- **Result types**: Railway-oriented programming for explicit error handling (`Result<T, E>`, `ok()`, `err()`)
- **Source tracking**: `SourcePosition` and `SourceSpan` for precise error location reporting
- **Diagnostic system**: `DiagnosticCollector` for accumulating structured compiler diagnostics with rich context
- **Canonical encoding**: Deterministic JSON serialization for content hashing and cache invalidation
- **Content hashing**: Cryptographic hashing with SHA-256/SHA-512 support

All exports are fully tested with 95%+ coverage and include comprehensive TSDoc documentation.
