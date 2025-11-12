import { describe, expect, it } from 'vitest';

import {
        TYPE_UNSUPPORTED,
        TAG_UNKNOWN,
        INTERSECTION_CONFLICT,
        UNION_HETEROGENEOUS,
        TAG_MALFORMED,
} from '../../src/diagnostics/codes.js';
import { makeDiagnostic } from '../../src/diagnostics/factory.js';
import { formatDiagnostics } from '../../src/diagnostics/reporter.js';
import type { FilePath } from '../../src/shared/primitives.js';

describe('diagnostics', () => {
        it('creates a well-typed diagnostic with code metadata', () => {
                const d = makeDiagnostic({
                        meta: TYPE_UNSUPPORTED,
                        args: ['function types'],
                        location: {
                                filePath: 'src/models.ts' as FilePath,
                                line: 10,
                                column: 5,
                                symbol: 'doStuff',
                        },
                        context: { entity: 'User', field: 'callback' },
                });

                expect(d.code).toBe('ADTK-IR-1001');
                expect(d.category).toBe('error');
                expect(d.message).toContain('Unsupported TypeScript construct');
                expect(d.helpUrl?.endsWith('ADTK-IR-1001')).toBe(true);
        });

        it('renders pretty output deterministically', () => {
                const a = makeDiagnostic({
                        meta: TAG_UNKNOWN,
                        args: ['@fancyTag'],
                        location: {
                                filePath: 'src/a.ts' as FilePath,
                                line: 1,
                                column: 1,
                        },
                });
                const b = makeDiagnostic({
                        meta: INTERSECTION_CONFLICT,
                        args: ['User.name'],
                });
                const out = formatDiagnostics([a, b], { mode: 'pretty' });
                const iError = out.indexOf('ADTK-IR-2002');
                const iWarn = out.indexOf('ADTK-IR-3001');
                expect(iError).toBeGreaterThanOrEqual(0);
                expect(iWarn).toBeGreaterThanOrEqual(0);
                expect(iError).toBeLessThan(iWarn);
        });

        it('renders json output deterministically', () => {
                const a = makeDiagnostic({
                        meta: UNION_HETEROGENEOUS,
                        args: ['string | { x: number }'],
                });
                const b = makeDiagnostic({
                        meta: TAG_MALFORMED,
                        args: ['@index name:unique:extra'],
                });
                const out = formatDiagnostics([a, b], { mode: 'json' });
                const parsed = JSON.parse(out) as unknown[];
                expect(Array.isArray(parsed)).toBe(true);
        });
});
