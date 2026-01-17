// packages/shared/src/encoding/canonical.ts

import type { CanonicalJson } from '../branded';
import { ok, err, type Result } from '../result';
import type {
        CanonicalEncodeConfig,
        CanonicalEncodeError,
        JsonValue,
        JsonPrimitive,
} from './types.js';
import {
        DEFAULT_CANONICAL_CONFIG,
        createError,
        isBinaryLike,
        toUint8Array,
        uint8ToBase64,
        keyToStableString,
        serializeCanonical,
} from './utils.js';

export function encodeCanonical(
        value: unknown,
        config: Partial<CanonicalEncodeConfig> = {},
): Result<CanonicalJson, CanonicalEncodeError> {
        const cfg: CanonicalEncodeConfig = { ...DEFAULT_CANONICAL_CONFIG, ...config };
        const seen = new Set<unknown>();

        const normalize = (v: unknown, path: string): Result<JsonValue, CanonicalEncodeError> => {
                if (v === null) return ok(null);

                const t = typeof v;

                if (t === 'string' || t === 'boolean') {
                        return ok(v as JsonPrimitive);
                }

                if (t === 'number') {
                        const n = v as number;
                        if (!Number.isFinite(n)) {
                                switch (cfg.specialNumberPolicy) {
                                        case 'error':
                                                return err(
                                                        createError(
                                                                'non-finite-number',
                                                                path,
                                                                `Non-finite number: ${String(n)}`,
                                                                n,
                                                        ),
                                                );
                                        case 'string':
                                                return ok(String(n) as JsonPrimitive);
                                        case 'null':
                                                return ok(null);
                                }
                        }
                        if (cfg.coerceNegativeZeroToZero && Object.is(n, -0)) {
                                return ok(0);
                        }
                        return ok(n);
                }

                if (t === 'bigint') {
                        const b = v as bigint;
                        switch (cfg.bigintPolicy) {
                                case 'error':
                                        return err(
                                                createError(
                                                        'bigint-disallowed',
                                                        path,
                                                        'BigInt not allowed',
                                                        b,
                                                ),
                                        );
                                case 'string':
                                        return ok(b.toString());
                                case 'number': {
                                        const num = Number(b);
                                        if (!Number.isSafeInteger(num)) {
                                                return err(
                                                        createError(
                                                                'unsafe-bigint',
                                                                path,
                                                                `BigInt ${b.toString()} not safely representable as number`,
                                                                b,
                                                        ),
                                                );
                                        }
                                        return ok(num);
                                }
                        }
                }

                if (t === 'function' || t === 'symbol') {
                        return err(createError('unsupported-type', path, `Unsupported type: ${t}`));
                }

                if (t === 'object') {
                        if (seen.has(v)) {
                                return err(
                                        createError(
                                                'circular-reference',
                                                path,
                                                'Circular reference detected',
                                        ),
                                );
                        }

                        if (isBinaryLike(v)) {
                                const bytes = toUint8Array(v);
                                if (!bytes) {
                                        return err(
                                                createError(
                                                        'unsupported-binary',
                                                        path,
                                                        'Unsupported binary view',
                                                ),
                                        );
                                }

                                switch (cfg.binaryPolicy) {
                                        case 'error':
                                                return err(
                                                        createError(
                                                                'binary-disallowed',
                                                                path,
                                                                'Binary not allowed',
                                                        ),
                                                );
                                        case 'array': {
                                                const arr: number[] = new Array(bytes.length);
                                                for (let i = 0; i < bytes.length; i++) {
                                                        arr[i] = bytes[i]!;
                                                }
                                                return ok(arr as JsonValue);
                                        }
                                        case 'base64':
                                                return ok(uint8ToBase64(bytes));
                                }
                        }

                        if (v instanceof Date) {
                                if (cfg.datePolicy === 'error') {
                                        return err(
                                                createError(
                                                        'date-disallowed',
                                                        path,
                                                        'Date not allowed',
                                                ),
                                        );
                                }

                                const time = (v as Date).getTime();
                                if (!Number.isFinite(time)) {
                                        return err(
                                                createError('invalid-date', path, 'Invalid Date'),
                                        );
                                }

                                return ok(
                                        cfg.datePolicy === 'iso'
                                                ? (new Date(time).toISOString() as JsonPrimitive)
                                                : (time as JsonPrimitive),
                                );
                        }

                        if (v instanceof Map) {
                                if (cfg.mapPolicy === 'error') {
                                        return err(
                                                createError(
                                                        'map-disallowed',
                                                        path,
                                                        'Map not allowed',
                                                ),
                                        );
                                }

                                const entries: Array<{ k: string; v: JsonValue }> = [];
                                seen.add(v);

                                let idx = 0;
                                for (const [k, vv] of v) {
                                        const keyStr = keyToStableString(k, cfg);
                                        if (keyStr === undefined) {
                                                seen.delete(v);
                                                return err(
                                                        createError(
                                                                'unsupported-map-key',
                                                                `${path}[${idx}].<key>`,
                                                                'Unsupported map key type',
                                                                k,
                                                        ),
                                                );
                                        }

                                        const nvResult = normalize(
                                                vv,
                                                `${path}[${JSON.stringify(keyStr)}]`,
                                        );
                                        if (!nvResult.ok) {
                                                seen.delete(v);
                                                return nvResult;
                                        }

                                        entries.push({ k: keyStr, v: nvResult.value });
                                        idx++;
                                }

                                seen.delete(v);
                                entries.sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
                                return ok(entries.map((e) => [e.k, e.v]) as JsonValue);
                        }

                        if (v instanceof Set) {
                                if (cfg.setPolicy === 'error') {
                                        return err(
                                                createError(
                                                        'set-disallowed',
                                                        path,
                                                        'Set not allowed',
                                                ),
                                        );
                                }

                                seen.add(v);
                                const elems: Array<{ s: string; v: JsonValue }> = [];

                                let i = 0;
                                for (const item of v) {
                                        const nResult = normalize(item, `${path}[${i}]`);
                                        if (!nResult.ok) {
                                                seen.delete(v);
                                                return nResult;
                                        }

                                        const s = serializeCanonical(nResult.value);
                                        elems.push({ s, v: nResult.value });
                                        i++;
                                }

                                seen.delete(v);
                                elems.sort((a, b) => (a.s < b.s ? -1 : a.s > b.s ? 1 : 0));
                                return ok(elems.map((e) => e.v) as JsonValue);
                        }

                        if (Array.isArray(v)) {
                                seen.add(v);
                                const out: JsonValue[] = [];

                                for (let i = 0; i < v.length; i++) {
                                        const elem = v[i];
                                        if (elem === undefined) {
                                                switch (cfg.undefinedPolicy) {
                                                        case 'omit':
                                                                out.push(null);
                                                                break;
                                                        case 'null':
                                                                out.push(null);
                                                                break;
                                                        case 'error':
                                                                seen.delete(v);
                                                                return err(
                                                                        createError(
                                                                                'undefined-disallowed',
                                                                                `${path}[${i}]`,
                                                                                'undefined not allowed',
                                                                        ),
                                                                );
                                                }
                                        } else {
                                                const nResult = normalize(elem, `${path}[${i}]`);
                                                if (!nResult.ok) {
                                                        seen.delete(v);
                                                        return nResult;
                                                }
                                                out.push(nResult.value);
                                        }
                                }

                                seen.delete(v);
                                return ok(out as JsonValue);
                        }

                        seen.add(v);
                        const o = v as Record<string, unknown>;
                        const keys = Object.keys(o).sort();
                        const outObj: Record<string, JsonValue> = {};

                        for (const k of keys) {
                                const val = o[k];
                                if (val === undefined) {
                                        switch (cfg.undefinedPolicy) {
                                                case 'omit':
                                                        continue;
                                                case 'null':
                                                        outObj[k] = null;
                                                        continue;
                                                case 'error':
                                                        seen.delete(v);
                                                        return err(
                                                                createError(
                                                                        'undefined-disallowed',
                                                                        `${path}.${k}`,
                                                                        'undefined not allowed',
                                                                ),
                                                        );
                                        }
                                }

                                const nResult = normalize(val, `${path}.${k}`);
                                if (!nResult.ok) {
                                        seen.delete(v);
                                        return nResult;
                                }
                                outObj[k] = nResult.value;
                        }

                        seen.delete(v);
                        return ok(outObj as JsonValue);
                }

                return err(createError('unsupported-type', path, `Unknown type: ${t}`));
        };

        const result = normalize(value, '$');
        if (!result.ok) return result;

        const json = serializeCanonical(result.value);
        return ok(json as CanonicalJson);
}
