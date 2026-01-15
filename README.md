# Afterdark Toolkit

> One TypeScript definition. Validators, schemas, and migrations—automatically.

_A TypeScript-first toolkit for deriving validators, schemas, and database migrations directly from your types._

---

## Installation

```bash
npm install -D @adtk/cli @adtk/plugin-validator
```

> **Note:** The toolkit is in active development. APIs may change before 1.0.

---

## Example

**Before (the old way):**

```ts
// TypeScript types
interface User {
        email: string;
        age: number;
}

// Zod schema (duplication)
const UserSchema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
});

// Database migration (more duplication)
// CREATE TABLE users ...
```

**After (with Afterdark):**

```ts
/** @entity */
interface User {
        id: number;
        /** @email */
        email: string;
        /** @min(18) */
        age: number;
}

// That's it. Validators, schemas, and migrations are generated.
```

From this single definition, plugins derive:

- Runtime validators with typed error results
- JSON Schema documents
- Database schemas and migration plans
- Any other codegen target through plugins

You write the type once. Everything else is generated.

---

## Why this exists

Most applications define their data multiple times: once for TypeScript, again for validation (Zod/Yup), again for database schemas, again for API contracts.

These definitions **drift**. They become **inconsistent**. They introduce **avoidable failures**.

Afterdark Toolkit maintains a **single source of truth**: your TypeScript types, enriched with JSDoc annotations. From those types, the toolkit derives everything else in a consistent, reliable way.

---

## How it works

The toolkit includes a compiler layer that:

1. Reads your TypeScript types
2. Extracts structure and annotations
3. Produces a stable intermediate representation (IR)
4. Feeds that IR to plugins for code generation

This architecture keeps authoring lightweight while enabling robust, incremental builds.

---

## Getting started

Documentation is organized by topic:

- **[Getting Started Guide](docs/getting-started.md)** – installation and first steps
- **[Architecture & Concepts](docs/architecture.md)** – how the toolkit works
- **[CLI & Usage](docs/usage.md)** – running validation and migrations
- **[Plugin Authoring](docs/plugins.md)** – building custom emitters
- **[Roadmap](docs/roadmap.md)** – feature progression and direction
- **[Contributing](./contributing.md)** – development guidelines

Examples live in the `examples/` directory.

---

## Status

The toolkit is under active development. The core compiler and validation plugin are functional. Migrations and advanced features are planned.

Interfaces and APIs may evolve before a stable 1.0 release, but the overall architecture is set.

**Feedback and contributions are welcome.**

---

## What this is not

- **Not a TypeScript replacement.** Afterdark extends TS, doesn't replace it.
- **Not a runtime type system.** It generates validators from static types.
- **Not schema-first.** Your TypeScript types are the schema.

---

## Community

- **[GitHub Issues](*https://github.com/.../issues)** – bugs and feature requests

Contributions welcome! See [CONTRIBUTING.md](./contributing.md).

---

## License

Apache 2.0. See [LICENSE](./LICENSE) for details.
