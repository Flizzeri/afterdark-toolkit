# Afterdark Toolkit

*A TypeScript-first toolkit for deriving validators, schemas, and database migrations directly from your types.*

Afterdark Toolkit turns your TypeScript types from static annotations into **actionable descriptions** of your data.
You write plain TypeScript. The toolkit extracts structured meaning from it and generates the artifacts your application needs:

* runtime validators
* JSON Schemas
* database schemas and migration plans
* other codegen targets through plugins

No separate schema languages. No duplication. One definition of your data.

---

## Why this exists

Most applications end up defining their data multiple times: once for TypeScript, again for validation, again for a database schema, again for APIs. These definitions drift, become inconsistent, and introduce avoidable failures.

Afterdark Toolkit lets you keep a **single source of truth**: your TypeScript types, enriched with a small set of JSDoc annotations.
From those types, the toolkit derives everything else in a consistent and reliable way.

This approach maintains the clarity of plain TypeScript while giving you fully generated runtime artifacts.

---

## How it works

The toolkit includes a small compiler layer that reads your project’s types, interprets their structure, and turns them into a stable intermediate representation.
Plugins use this representation to emit validators, schemas, migrations, or any other code generation target.

This architecture keeps your authoring experience lightweight while allowing the tooling to stay robust and incremental.

---

## Example

```ts
/** @entity */
interface User {
  id: number;
  /** @email */
  email: string;
  /** @min(18) */
  age: number;
}
```

From this definition, plugins can derive:

* a runtime validator for `User`
* a JSON Schema document
* a database table definition and a migration plan
* additional artifacts depending on which plugins you enable

You only write the type once.

---

## Getting started

Documentation is organized by topic:

* **Concepts & Design** – how the toolkit interprets types and annotations
  → [`docs/architecture.md`](docs/architecture.md)

* **Roadmap** – feature progression and long-term direction
  → [`docs/roadmap.md`](docs/roadmap.md)

* **CLI & Usage Guide** – how to run validation, generate migrations, and use the compiler
  → [`docs/usage.md`](docs/usage.md)

* **Plugin Authoring** – how to build emitters for new targets
  → [`docs/plugins.md`](docs/plugins.md)

* **Contributing** – development guidelines and project structure
  → [`docs/contributing.md`](docs/contributing.md)

Examples and reference material live in the `examples/` and `docs/` directories.

---

## Status

The toolkit is under active development.
Interfaces and APIs may evolve before a stable release, but the overall direction and architecture are set.

Community feedback is welcome.

---

## License

Apache 2.0.
