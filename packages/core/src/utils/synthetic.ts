// packages/core/src/utils/synthetic.ts

import { symbolId, hashString, type SymbolId, type DiagnosticCollector } from '@adtk/shared';

import type { IRNode } from '../ir';

/**
 * Creates a synthetic symbol ID for intrinsic types that don't have user-defined symbols.
 *
 * @remarks
 * Intrinsic types (like `string`, `number`, literal values) don't have TypeScript symbols
 * in the user's code. We generate stable, deterministic symbol IDs for these using
 * a category and value.
 *
 * @example
 * ```typescript
 * createSyntheticSymbolId('primitive', 'string', diagnostics)
 * // → "string#<intrinsic:primitive>#abc123"
 *
 * createSyntheticSymbolId('literal', '"hello"', diagnostics)
 * // → "hello#<intrinsic:literal>#def456"
 * ```
 */
export function createSyntheticSymbolId(
        category: IRNode['kind'],
        value: string,
        diagnostics: DiagnosticCollector,
): SymbolId {
        // Create a stable hash of the value for uniqueness
        const hashResult = hashString(value);

        if (!hashResult.ok) {
                diagnostics.add({
                        code: 'ADTK-FATAL-0001',
                        category: 'fatal',
                        message: {
                                title: 'Failed to hash synthetic symbol value',
                                description: `Cannot create synthetic symbol ID for ${category}: ${hashResult.error}`,
                        },
                        spans: [],
                });
                // Fatal diagnostic throws, but TypeScript doesn't know that
                // This return is unreachable but satisfies the type checker
                return symbolId('');
        }

        const hash = hashResult.value.substring(0, 8);
        return symbolId(`${value}#<intrinsic:${category}>#${hash}`);
}
