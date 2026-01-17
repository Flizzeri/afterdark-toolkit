// packages/shared/src/encoding/utils.ts

import type { CanonicalEncodeConfig, CanonicalEncodeError, JsonValue } from './types.js';

export const DEFAULT_CANONICAL_CONFIG: CanonicalEncodeConfig = Object.freeze({
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

export function createError(
        reason: CanonicalEncodeError['reason'],
        path: string,
        message: string,
        value?: unknown,
): CanonicalEncodeError {
        return {
                reason,
                path,
                message,
                ...(value !== undefined && { value: String(value) }),
        };
}

export function isBinaryLike(v: unknown): boolean {
        return (
                v instanceof Uint8Array ||
                (typeof Buffer !== 'undefined' &&
                        typeof Buffer.isBuffer === 'function' &&
                        Buffer.isBuffer(v)) ||
                v instanceof ArrayBuffer ||
                ArrayBuffer.isView(v)
        );
}

export function toUint8Array(v: unknown): Uint8Array | null {
        if (v instanceof Uint8Array) return v;

        if (
                typeof Buffer !== 'undefined' &&
                typeof Buffer.isBuffer === 'function' &&
                Buffer.isBuffer(v)
        ) {
                return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
        }

        if (v instanceof ArrayBuffer) return new Uint8Array(v);

        if (ArrayBuffer.isView(v)) {
                return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
        }

        return null;
}

export function uint8ToBase64(u8: Uint8Array): string {
        let s = '';
        for (let i = 0; i < u8.length; i++) {
                s += String.fromCharCode(u8[i]);
        }

        if (typeof btoa === 'function') return btoa(s);

        if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64');

        return '';
}

export function keyToStableString(k: unknown, cfg: CanonicalEncodeConfig): string | undefined {
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
                // Handle -0 explicitly when coercion is disabled
                if (!cfg.coerceNegativeZeroToZero && Object.is(n, -0)) return '-0';
                return String(n);
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

        return undefined;
}

export function serializeCanonical(v: JsonValue): string {
        const t = typeof v;

        if (v === null || t === 'boolean') {
                return JSON.stringify(v);
        }

        if (t === 'number') {
                // Handle -0 explicitly
                if (Object.is(v, -0)) {
                        return '-0';
                }
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

        const obj = v as Record<string, JsonValue>;
        const keys = Object.keys(obj).sort();
        const kv: string[] = new Array(keys.length);
        for (let i = 0; i < keys.length; i++) {
                const k = keys[i]!;
                const sk = JSON.stringify(k);
                const sv = serializeCanonical(obj[k] as JsonValue);
                kv[i] = `${sk}:${sv}`;
        }
        return `{${kv.join(',')}}`;
}
