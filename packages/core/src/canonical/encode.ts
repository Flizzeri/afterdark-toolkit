// canonical/encode.ts
import {
        CANONICAL_UNSUPPORTED_TYPE,
        CANONICAL_UNSTABLE_NUMBER,
        CANONICAL_BIGINT_POLICY,
} from '../diagnostics/codes.js';
import { makeDiagnostic } from '../diagnostics/factory.js';
import type { Diagnostic } from '../shared/diagnostics.js';
import type { CanonicalJson } from '../shared/primitives.js';

export interface CanonicalEncodeConfig {
        specialNumbers?: 'error' | 'stringify' | 'null';
        bigints?: 'stringify' | 'error';
        pretty?: boolean;
}

// Deterministically serializes a value into canonical JSON.

export function encodeCanonical(
        value: unknown,
        config: CanonicalEncodeConfig = {},
): { json: CanonicalJson; diagnostics: Diagnostic[] } {
        const diagnostics: Diagnostic[] = [];
        const normalized = normalize(value, config, diagnostics);
        const json = stableJsonStringify(normalized, !!config.pretty);
        return { json: json as CanonicalJson, diagnostics };
}

function normalize(
        value: unknown,
        config: CanonicalEncodeConfig,
        diagnostics: Diagnostic[],
): unknown {
        if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;

        if (typeof value === 'number') {
                if (Number.isNaN(value) || !Number.isFinite(value)) {
                        switch (config.specialNumbers ?? 'error') {
                                case 'stringify':
                                        return String(value);
                                case 'null':
                                        return null;
                                default:
                                        diagnostics.push(
                                                makeDiagnostic({
                                                        meta: CANONICAL_UNSTABLE_NUMBER,
                                                        args: [String(value)],
                                                }),
                                        );
                                        return null;
                        }
                }
                return Number(value);
        }

        if (typeof value === 'bigint') {
                if ((config.bigints ?? 'stringify') === 'stringify') {
                        return value.toString();
                }
                diagnostics.push(makeDiagnostic({ meta: CANONICAL_BIGINT_POLICY }));
                return null;
        }

        if (Array.isArray(value)) {
                return value.map((v) => normalize(v, config, diagnostics));
        }

        if (typeof value === 'object') {
                const obj = value as Record<string, unknown>;
                const keys = Object.keys(obj).sort();
                const result: Record<string, unknown> = {};
                for (const key of keys) {
                        const val = obj[key];
                        if (
                                val === undefined ||
                                typeof val === 'function' ||
                                typeof val === 'symbol'
                        ) {
                                diagnostics.push(
                                        makeDiagnostic({
                                                meta: CANONICAL_UNSUPPORTED_TYPE,
                                                args: [`${typeof val}`],
                                        }),
                                );
                                continue;
                        }
                        result[key] = normalize(val, config, diagnostics);
                }
                return result;
        }

        diagnostics.push(
                makeDiagnostic({ meta: CANONICAL_UNSUPPORTED_TYPE, args: [`${typeof value}`] }),
        );
        return null;
}

function stableJsonStringify(value: unknown, pretty = false): string {
        const spacing = pretty ? 2 : 0;
        return JSON.stringify(value, null, spacing);
}
