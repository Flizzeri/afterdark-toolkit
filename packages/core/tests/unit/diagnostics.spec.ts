import { describe, expect, it } from 'vitest';

import { IR_ERROR_CODES } from '../../src/diagnostics/codes.js';
import { diagError, makeDiagnostic } from '../../src/diagnostics/factory.js';
import { formatDiagnostics } from '../../src/diagnostics/reporter.js';
import type { Diagnostic } from '../../src/diagnostics/types.js';

describe('diagnostics', () => {
        it('creates a well-typed diagnostic with code metadata', () => {
                const d: Diagnostic = makeDiagnostic({
                        key: 'TYPE_UNSUPPORTED',
                        args: ['function types'],
                        location: {
                                filePath: 'src/models.ts',
                                line: 10,
                                column: 5,
                                symbol: 'doStuff',
                        },
                        context: { entity: 'User', field: 'callback' },
                });

                expect(d.code).toBe(IR_ERROR_CODES.TYPE_UNSUPPORTED);
                expect(d.category).toBe('error');
                expect(d.message).toContain('Unsupported TypeScript construct');
                expect(d.helpUrl?.endsWith('ADTK-IR-1001')).toBe(true);
        });

        it('renders pretty output deterministically', () => {
                const a = diagError('TAG_UNKNOWN', ['@fancyTag'], {
                        filePath: 'src/a.ts',
                        line: 1,
                        column: 1,
                });
                const b = diagError('INTERSECTION_CONFLICT', ['User.name']);
                const out = formatDiagnostics([a, b], { mode: 'pretty' });
                const iError = out.indexOf('ADTK-IR-2002');
                const iWarn = out.indexOf('ADTK-IR-3001');
                expect(iError).toBeGreaterThanOrEqual(0);
                expect(iWarn).toBeGreaterThanOrEqual(0);
                expect(iError).toBeLessThan(iWarn);
        });

        it('renders json output deterministically', () => {
                const a = diagError('UNION_HETEROGENEOUS', ['string | { x: number }']);
                const b = diagError('TAG_MALFORMED', ['@index name:unique:extra']);
                const out = formatDiagnostics([a, b], { mode: 'json' });
                const parsed = JSON.parse(out) as unknown[];
                expect(Array.isArray(parsed)).toBe(true);
        });
});
