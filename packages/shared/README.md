# @adtk/shared

**Shared types and utilities for Afterdark Toolkit.**

This package provides the foundational primitives used across all `@adtk/*` packages. It is designed for internal use within the toolkit but is exposed as a public package for plugin authors who need access to core types and utilities.

---

## Features

### Branded Types

Type-safe wrappers for primitive values that prevent accidental misuse:

- **`SymbolId`** - Unique identifier for TypeScript symbols (`"User#src/types.ts#a1b2c3"`)
- **`FilePath`** - Absolute, normalized file paths
- **`Hash`** - Cryptographic hash strings
- **`CanonicalJson`** - Deterministically serialized JSON
- **`TagName`** - JSDoc annotation tag names
- **`SemVer`** - Semantic version strings

Each branded type has a corresponding constructor function that validates input and returns a `Result<T, E>`.

### Result Types

Railway-oriented programming for explicit error handling without exceptions:

```typescript
import { ok, err, isOk, type Result } from '@adtk/shared';

function divide(a: number, b: number): Result {
        if (b === 0) return err('Division by zero');
        return ok(a / b);
}

const result = divide(10, 2);
if (isOk(result)) {
        console.log(result.value); // 5
}
```

All validation and parsing operations in Afterdark use `Result` instead of throwing exceptions.

### Source Location Tracking

Precise source code location tracking for error reporting:

- **`SourcePosition`** - Line, column, and byte offset in a file
- **`SourceSpan`** - Range from start to end position
- **Utilities** - `createSpan()`, `spanContains()`, `spanOverlaps()`, `formatSpan()`

Every IR node and diagnostic includes source spans, enabling rich error messages that point to the exact location in user code.

### Diagnostic System

Structured diagnostic collection for compiler errors, warnings, and hints:

```typescript
import { DiagnosticCollector } from '@adtk/shared';

const collector = new DiagnosticCollector();

collector.addError('ADTK-IR-001', 'Unsupported type', span, {
        description: 'Template literal types are not yet supported',
        help: 'Use a string union instead',
        relatedSpans: [{ span: otherSpan, message: 'Referenced here' }],
});

if (collector.hasErrors()) {
        const errors = collector.getErrors();
        // Format and display errors
}
```

**Categories:**

- `fatal` - Unrecoverable errors (throws `FatalDiagnostic` exception)
- `error` - Compilation errors
- `warning` - Potential issues
- `info` - Informational messages
- `hint` - Optimization suggestions

**Features:**

- Structured messages with title, description, notes, and code examples
- Source spans with optional issue/help text
- Related spans for cross-referencing
- Diagnostic codes (`ADTK-*-###` or `PLUGIN-*-###`)

The diagnostic system is designed to provide IDE-quality error messages with precise source locations, actionable suggestions, and rich context.

### Canonical Encoding

Deterministic JSON serialization for content hashing:

```typescript
import { encodeCanonical } from '@adtk/shared';

const obj1 = { z: 3, a: 1, m: 2 };
const obj2 = { a: 1, m: 2, z: 3 };

const result1 = encodeCanonical(obj1);
const result2 = encodeCanonical(obj2);

// Both produce: '{"a":1,"m":2,"z":3}'
// Guaranteed identical output for semantically equal values
```

**Why canonical encoding?**

When caching IR nodes, we need to detect when a type's structure has changed semantically. Simple JSON serialization produces different strings for the same object if keys are in different orders. Canonical encoding ensures:

1. **Determinism** - Same input always produces identical output
2. **Key sorting** - Object keys are alphabetically sorted
3. **Value normalization** - Special values (NaN, -0, Infinity) handled consistently
4. **Structured equality** - Hash of encoded output represents semantic content

**Supported types:**

- Primitives: `null`, `boolean`, `string`, `number`
- Structures: arrays, objects, tuples
- Special types: `Date`, `Map`, `Set`, `Uint8Array`, `BigInt`
- Template literals: encoded as structured parts

**Configuration policies:**

- `specialNumberPolicy` - How to handle `NaN`, `Infinity` (error, string, null)
- `bigintPolicy` - Encode as string, number, or error
- `datePolicy` - Encode as ISO string, epoch-ms, or error
- `binaryPolicy` - Encode as base64, array, or error
- `undefinedPolicy` - Omit, convert to null, or error
- Plus policies for `Map`, `Set`, and undefined coercion

The encoder returns `Result<CanonicalJson, CanonicalEncodeError>` with detailed error paths for debugging.

### Content Hashing

Cryptographic hashing for cache invalidation and content-addressable storage:

```typescript
import { hashValue } from '@adtk/shared';

const irNode = { kind: 'primitive', primitiveKind: 'string' /* ... */ };
const result = hashValue(irNode);

if (result.ok) {
        const hash = result.value; // Hash branded type
        // Use hash as cache key
}
```

**Features:**

- Combines canonical encoding + hashing in one step
- Supports SHA-256, SHA-512 (Blake3 not yet implemented)
- Returns branded `Hash` type
- Convenience functions: `hashString()`, `hashBytes()`, `hashCanonicalJson()`

Hashing is used extensively in the cache layer to detect when IR nodes have changed structurally.

---

## Installation

```bash
pnpm add @adtk/shared
```

This package is typically installed as a dependency of other `@adtk/*` packages and doesn't need to be explicitly added to your project unless you're writing plugins.

---

## Usage Guidelines

This package is designed to be used consistently across the Afterdark Toolkit ecosystem. When contributing to `@adtk/*` packages or writing plugins:

- **Always use branded types** for domain-specific strings (`SymbolId`, `FilePath`, etc.)
- **Always use `Result`** for operations that can fail - never throw exceptions for expected errors
- **Always attach source spans** to diagnostics for precise error reporting
- **Use canonical encoding** when hashing IR nodes or other structured data
- **Use `DiagnosticCollector`** to accumulate errors rather than failing fast

For detailed contribution guidelines and code standards, see [CONTRIBUTING.md](../../CONTRIBUTING.md) in the repository root.

---

## API Documentation

For complete API documentation with examples, see the TypeScript definitions. All public exports include TSDoc comments with usage guidance.

---
