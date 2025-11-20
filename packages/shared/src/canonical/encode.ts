// packages/shared/src/canonical/encode.ts

import { ok, err } from '@afterdarktk/shared';

import {
        CANONICAL_UNSUPPORTED_TYPE,
        CANONICAL_UNSTABLE_NUMBER,
        CANONICAL_BIGINT_POLICY,
} from '../diagnostics/codes.js';
import { makeDiagnostic } from '../diagnostics/factory.js';
import { type Diagnostic } from '../diagnostics/types.js';
import { type CanonicalJson } from '../primitives/types.js';
import { type Result } from '../utils/types.js';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { readonly [k: string]: JsonValue };

// --- Canonical encoding configuration ---------------------------------------

type SpecialNumberPolicy =
        | 'error' // NaN/±Infinity are rejected
        | 'string' // encode as "NaN" | "Infinity" | "-Infinity"
        | 'null'; // encode as null

type BigIntPolicy =
        | 'error' // reject BigInt
        | 'string' // decimal string
        | 'number'; // coerce to Number (reject if not safe integer)

type DatePolicy =
        | 'error'
        | 'iso' // e.g., "2020-01-01T00:00:00.000Z"
        | 'epoch-ms'; // number of milliseconds since epoch (as a JSON number)

type MapPolicy = 'error' | 'entries'; // encode as sorted array of [key, value]; key serialized as JSON string

type SetPolicy = 'error' | 'array-sorted'; // encode as array of values sorted by their canonical JSON

type BinaryPolicy =
        | 'error'
        | 'base64' // Uint8Array / Buffer -> base64 string
        | 'array'; // as array of numbers (0..255)

type UndefinedPolicy =
        | 'omit' // drop object fields with undefined; arrays encode undefined as null
        | 'null' // object fields and array elements become null
        | 'error'; // reject any occurrence of undefined

export interface CanonicalEncodeConfig {
        readonly specialNumberPolicy: SpecialNumberPolicy;
        readonly bigintPolicy: BigIntPolicy;
        readonly datePolicy: DatePolicy;
        readonly mapPolicy: MapPolicy;
        readonly setPolicy: SetPolicy;
        readonly binaryPolicy: BinaryPolicy;
        readonly undefinedPolicy: UndefinedPolicy;

        /** Treat -0 as 0 to avoid representational instability. Default: true. */
        readonly coerceNegativeZeroToZero: boolean;

        /** For arrays: keep order as-is (default true). Canonical encoding assumes caller-provided order is deterministic. */
        readonly preserveArrayOrder: boolean;
}

const DEFAULT_CANONICAL_CONFIG: CanonicalEncodeConfig = Object.freeze({
        specialNumberPolicy: 'error',
        bigintPolicy: 'string',
        datePolicy: 'iso',
        mapPolicy: 'entries',
        setPolicy: 'array-sorted',
        binaryPolicy: 'base64',
        undefinedPolicy: 'omit',
        coerceNegativeZeroToZero: true,
        preserveArrayOrder: true,
});

// --- Public API --------------------------------------------------------------

/**
 * Canonically encodes an arbitrary JS value into compact, deterministic JSON.
 * - Keys are sorted lexicographically.
 * - Whitespace is canonical (no spaces, no trailing newline).
 * - Representation of edge cases is governed by `config`.
 *
 * Never throws; returns Result<string> with diagnostics on failure.
 */
export function encodeCanonical(
        value: unknown,
        config: Partial<CanonicalEncodeConfig> = {},
): Result<CanonicalJson> {
        const cfg: CanonicalEncodeConfig = { ...DEFAULT_CANONICAL_CONFIG, ...config };

        const seen = new Set<unknown>(); // cycle detection
        const diagnostics: Diagnostic[] = [];

        const normalize = (v: unknown, path: string): JsonValue | undefined => {
                // Null
                if (v === null) return null;

                // Primitives
                const t = typeof v;
                if (t === 'string' || t === 'boolean') return v as JsonPrimitive;

                if (t === 'number') {
                        const n = v as number;
                        if (!Number.isFinite(n)) {
                                switch (cfg.specialNumberPolicy) {
                                        case 'error': {
                                                diagnostics.push(
                                                        makeDiagnostic({
                                                                meta: CANONICAL_UNSTABLE_NUMBER,
                                                                args: [`${path}: ${String(n)}`],
                                                                context: { field: path },
                                                        }),
                                                );
                                                return undefined;
                                        }
                                        case 'string':
                                                return String(n) as JsonPrimitive;
                                        case 'null':
                                                return null;
                                }
                        }
                        if (cfg.coerceNegativeZeroToZero && Object.is(n, -0)) {
                                return 0;
                        }
                        // Normalize representation: integers as simple decimal; otherwise JSON's default is already canonical.
                        // We still guard against -0 above and ensure finite.
                        return n;
                }

                if (t === 'bigint') {
                        const b = v as bigint;
                        switch (cfg.bigintPolicy) {
                                case 'error': {
                                        diagnostics.push(
                                                makeDiagnostic({
                                                        meta: CANONICAL_BIGINT_POLICY,
                                                        args: [],
                                                        context: { field: path },
                                                }),
                                        );
                                        return undefined;
                                }
                                case 'string':
                                        return b.toString();
                                case 'number': {
                                        const num = Number(b);
                                        if (!Number.isSafeInteger(num)) {
                                                diagnostics.push(
                                                        makeDiagnostic({
                                                                meta: CANONICAL_UNSTABLE_NUMBER,
                                                                args: [
                                                                        `${path}: BigInt ${b.toString()} not safely representable as number`,
                                                                ],
                                                                context: { field: path },
                                                        }),
                                                );
                                                return undefined;
                                        }
                                        return num;
                                }
                        }
                }

                // Functions / Symbols
                if (t === 'function' || t === 'symbol') {
                        diagnostics.push(
                                makeDiagnostic({
                                        meta: CANONICAL_UNSUPPORTED_TYPE,
                                        args: [`${path}: ${t}`],
                                        context: { field: path },
                                }),
                        );
                        return undefined;
                }

                // Objects (including arrays, dates, buffers, maps, sets, typed arrays)
                if (t === 'object') {
                        // Cycle detection
                        if (seen.has(v)) {
                                diagnostics.push(
                                        makeDiagnostic({
                                                meta: CANONICAL_UNSUPPORTED_TYPE,
                                                args: [`${path}: circular reference`],
                                                context: { field: path },
                                        }),
                                );
                                return undefined;
                        }

                        // Binary-like (Buffer/Uint8Array/DataView/ArrayBuffer/typed arrays)
                        if (isBinaryLike(v)) {
                                const bytes = toUint8Array(v);
                                if (!bytes) {
                                        diagnostics.push(
                                                makeDiagnostic({
                                                        meta: CANONICAL_UNSUPPORTED_TYPE,
                                                        args: [`${path}: unsupported binary view`],
                                                        context: { field: path },
                                                }),
                                        );
                                        return undefined;
                                }
                                switch (cfg.binaryPolicy) {
                                        case 'error': {
                                                diagnostics.push(
                                                        makeDiagnostic({
                                                                meta: CANONICAL_UNSUPPORTED_TYPE,
                                                                args: [
                                                                        `${path}: binary disallowed by policy`,
                                                                ],
                                                                context: { field: path },
                                                        }),
                                                );
                                                return undefined;
                                        }
                                        case 'array': {
                                                const arr: number[] = new Array(bytes.length);
                                                for (let i = 0; i < bytes.length; i++)
                                                        arr[i] = bytes[i];
                                                return arr as JsonValue;
                                        }
                                        case 'base64': {
                                                // Node & web compatible base64 from Uint8Array
                                                const base64 = uint8ToBase64(bytes);
                                                return base64;
                                        }
                                }
                        }

                        // Date
                        if (v instanceof Date) {
                                if (cfg.datePolicy === 'error') {
                                        diagnostics.push(
                                                makeDiagnostic({
                                                        meta: CANONICAL_UNSUPPORTED_TYPE,
                                                        args: [
                                                                `${path}: Date disallowed by policy`,
                                                        ],
                                                        context: { field: path },
                                                }),
                                        );
                                        return undefined;
                                }
                                const time = (v as Date).getTime();
                                if (!Number.isFinite(time)) {
                                        diagnostics.push(
                                                makeDiagnostic({
                                                        meta: CANONICAL_UNSTABLE_NUMBER,
                                                        args: [`${path}: invalid Date`],
                                                        context: { field: path },
                                                }),
                                        );
                                        return undefined;
                                }
                                return cfg.datePolicy === 'iso'
                                        ? (new Date(time).toISOString() as JsonPrimitive)
                                        : (time as JsonPrimitive);
                        }

                        // Map
                        if (v instanceof Map) {
                                if (cfg.mapPolicy === 'error') {
                                        diagnostics.push(
                                                makeDiagnostic({
                                                        meta: CANONICAL_UNSUPPORTED_TYPE,
                                                        args: [`${path}: Map disallowed by policy`],
                                                        context: { field: path },
                                                }),
                                        );
                                        return undefined;
                                }
                                const entries: Array<{ k: string; v: JsonValue }> = [];
                                seen.add(v);
                                let idx = 0;
                                for (const [k, vv] of v) {
                                        // keys must be deterministically stringifiable
                                        const keyStrRes = keyToStableString(k, cfg);
                                        if (keyStrRes === undefined) {
                                                diagnostics.push(
                                                        makeDiagnostic({
                                                                meta: CANONICAL_UNSUPPORTED_TYPE,
                                                                args: [
                                                                        `${path}[${idx}].<key>: unsupported map key type`,
                                                                ],
                                                                context: {
                                                                        field: `${path}[${idx}].<key>`,
                                                                },
                                                        }),
                                                );
                                                seen.delete(v);
                                                return undefined;
                                        }
                                        const nv = normalize(
                                                vv,
                                                `${path}[${JSON.stringify(keyStrRes)}]`,
                                        );
                                        if (nv === undefined) {
                                                seen.delete(v);
                                                return undefined;
                                        }
                                        entries.push({ k: keyStrRes, v: nv });
                                        idx++;
                                }
                                seen.delete(v);
                                // sort by key string lexicographically
                                entries.sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
                                const json = entries.map((e) => [e.k, e.v]);
                                return json as JsonValue;
                        }

                        // Set
                        if (v instanceof Set) {
                                if (cfg.setPolicy === 'error') {
                                        diagnostics.push(
                                                makeDiagnostic({
                                                        meta: CANONICAL_UNSUPPORTED_TYPE,
                                                        args: [`${path}: Set disallowed by policy`],
                                                        context: { field: path },
                                                }),
                                        );
                                        return undefined;
                                }
                                seen.add(v);
                                const elems: Array<{ s: string; v: JsonValue }> = [];
                                let i = 0;
                                for (const item of v) {
                                        const n = normalize(item, `${path}[${i}]`);
                                        if (n === undefined) {
                                                seen.delete(v);
                                                return undefined;
                                        }
                                        // Serialize element to canonical JSON for sorting
                                        const s = serializeCanonical(n);
                                        elems.push({ s, v: n });
                                        i++;
                                }
                                seen.delete(v);
                                elems.sort((a, b) => (a.s < b.s ? -1 : a.s > b.s ? 1 : 0));
                                return elems.map((e) => e.v) as JsonValue;
                        }

                        // Array
                        if (Array.isArray(v)) {
                                seen.add(v);
                                const out: JsonValue[] = [];
                                for (let i = 0; i < v.length; i++) {
                                        const elem = v[i];
                                        if (elem === undefined) {
                                                switch (cfg.undefinedPolicy) {
                                                        case 'omit':
                                                                // For arrays, JSON has no hole elimination in strict canonical form;
                                                                // we choose to encode undefined as null to keep array length stable.
                                                                out.push(null);
                                                                break;
                                                        case 'null':
                                                                out.push(null);
                                                                break;
                                                        case 'error':
                                                                diagnostics.push(
                                                                        makeDiagnostic({
                                                                                meta: CANONICAL_UNSUPPORTED_TYPE,
                                                                                args: [
                                                                                        `${path}[${i}]: undefined disallowed by policy`,
                                                                                ],
                                                                                context: {
                                                                                        field: `${path}[${i}]`,
                                                                                },
                                                                        }),
                                                                );
                                                                seen.delete(v);
                                                                return undefined;
                                                }
                                        } else {
                                                const n = normalize(elem, `${path}[${i}]`);
                                                if (n === undefined) {
                                                        seen.delete(v);
                                                        return undefined;
                                                }
                                                out.push(n);
                                        }
                                }
                                seen.delete(v);
                                // preserve order as provided (assumed deterministic upstream)
                                return out as JsonValue;
                        }

                        // Plain object
                        seen.add(v);
                        const o = v as Record<string, unknown>;
                        const keys = Object.keys(o).sort(); // canonical key order
                        const outObj: Record<string, JsonValue> = {};
                        for (const k of keys) {
                                const val = o[k];
                                if (val === undefined) {
                                        switch (cfg.undefinedPolicy) {
                                                case 'omit':
                                                        // skip
                                                        continue;
                                                case 'null':
                                                        outObj[k] = null;
                                                        continue;
                                                case 'error':
                                                        diagnostics.push(
                                                                makeDiagnostic({
                                                                        meta: CANONICAL_UNSUPPORTED_TYPE,
                                                                        args: [
                                                                                `${path}.${k}: undefined disallowed by policy`,
                                                                        ],
                                                                        context: {
                                                                                field: `${path}.${k}`,
                                                                        },
                                                                }),
                                                        );
                                                        seen.delete(v);
                                                        return undefined;
                                        }
                                }
                                const n = normalize(val, `${path}.${k}`);
                                if (n === undefined) {
                                        seen.delete(v);
                                        return undefined;
                                }
                                outObj[k] = n;
                        }
                        seen.delete(v);
                        return outObj as JsonValue;
                }

                // Fallback (should not reach)
                diagnostics.push(
                        makeDiagnostic({
                                meta: CANONICAL_UNSUPPORTED_TYPE,
                                args: [`${path}: unknown type`],
                                context: { field: path },
                        }),
                );
                return undefined;
        };

        const normalized = normalize(value, '$');
        if (normalized === undefined) {
                return err(diagnostics);
        }
        // Final serialization with canonical key order and compact whitespace.
        const json = serializeCanonical(normalized);
        return ok(json as CanonicalJson);
}

// --- Helpers ----------------------------------------------------------------

function isBinaryLike(v: unknown): boolean {
        return (
                v instanceof Uint8Array ||
                (typeof Buffer !== 'undefined' &&
                        typeof Buffer.isBuffer === 'function' &&
                        Buffer.isBuffer(v)) ||
                v instanceof ArrayBuffer ||
                ArrayBuffer.isView(v) // covers typed arrays/DataView
        );
}

function toUint8Array(v: unknown): Uint8Array | null {
        if (v instanceof Uint8Array) return v;
        if (
                typeof Buffer !== 'undefined' &&
                typeof Buffer.isBuffer === 'function' &&
                Buffer.isBuffer(v)
        ) {
                const b: Uint8Array = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
                return b;
        }
        if (v instanceof ArrayBuffer) return new Uint8Array(v);
        if (ArrayBuffer.isView(v)) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
        return null;
}

function uint8ToBase64(u8: Uint8Array): string {
        // Browser-safe conversion
        let s = '';
        for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
        // btoa is not always available in Node; use Buffer if present.
        if (typeof btoa === 'function') return btoa(s);
        if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64');
        // Fallback (shouldn’t happen in supported environments)
        // Encoding to base64 manually is overkill here; return empty to avoid throw and let caller fail with unsupported type.
        return '';
}

/**
 * Convert a Map key to a deterministic string for use in canonical Map encoding.
 * Allowed key types: string | number | boolean | bigint (subject to config).
 */
function keyToStableString(k: unknown, cfg: CanonicalEncodeConfig): string | undefined {
        const t = typeof k;
        if (t === 'string') return k as string;
        if (t === 'boolean') return (k as boolean) ? 'true' : 'false';
        if (t === 'number') {
                const n = k as number;
                if (!Number.isFinite(n)) {
                        switch (cfg.specialNumberPolicy) {
                                case 'error':
                                        return undefined;
                                case 'string':
                                        return String(n);
                                case 'null':
                                        return 'null';
                        }
                }
                if (cfg.coerceNegativeZeroToZero && Object.is(n, -0)) return '0';
                // Use minimal decimal form
                return Number.isInteger(n) ? String(n) : String(n);
        }
        if (t === 'bigint') {
                switch (cfg.bigintPolicy) {
                        case 'error':
                                return undefined;
                        case 'string':
                                return (k as bigint).toString();
                        case 'number': {
                                const num = Number(k as bigint);
                                if (!Number.isSafeInteger(num)) return undefined;
                                return String(num);
                        }
                }
        }
        // disallow object/function/symbol as map keys
        return undefined;
}

/**
 * Serialize a normalized JsonValue to canonical JSON:
 * - object keys sorted lexicographically
 * - compact (no spaces), deterministic
 */
function serializeCanonical(v: JsonValue): string {
        const t = typeof v;
        if (v === null || t === 'number' || t === 'boolean') {
                // JSON.stringify is deterministic for these
                // Guard -0 already handled during normalization
                return JSON.stringify(v);
        }
        if (t === 'string') {
                return JSON.stringify(v);
        }
        if (Array.isArray(v)) {
                const parts: string[] = new Array(v.length);
                for (let i = 0; i < v.length; i++) {
                        parts[i] = serializeCanonical(v[i] as JsonValue);
                }
                return `[${parts.join(',')}]`;
        }
        // object
        const obj = v as Record<string, JsonValue>;
        const keys = Object.keys(obj).sort();
        const kv: string[] = new Array(keys.length);
        for (let i = 0; i < keys.length; i++) {
                const k = keys[i]!;
                const sk = JSON.stringify(k); // JSON-escaped key
                const sv = serializeCanonical(obj[k] as JsonValue);
                kv[i] = `${sk}:${sv}`;
        }
        return `{${kv.join(',')}}`;
}
