// packages/shared/src/source/utils.test.ts

import { describe, it, expect } from 'vitest';

import type { SourcePosition } from './types.js';
import { createSpan, spanContains, spanOverlaps, formatSpan } from './utils.js';
import { filePath } from '../branded/utils.js';

describe('source/utils', () => {
        const testFile = filePath('/test/file.ts');
        if (!testFile.ok) throw new Error('Failed to create test file path');
        const file = testFile.value;

        const pos = (line: number, column: number, offset: number): SourcePosition => ({
                line,
                column,
                offset,
        });

        describe('createSpan', () => {
                it('creates a span from file and positions', () => {
                        const start = pos(1, 5, 5);
                        const end = pos(1, 10, 10);

                        const span = createSpan(file, start, end);

                        expect(span.file).toBe(file);
                        expect(span.start).toBe(start);
                        expect(span.end).toBe(end);
                });
        });

        describe('spanContains', () => {
                it('returns true when position is within span on same line', () => {
                        const span = createSpan(file, pos(5, 10, 50), pos(5, 20, 60));
                        const position = pos(5, 15, 55);

                        expect(spanContains(span, position)).toBe(true);
                });

                it('returns true when position is at start of span', () => {
                        const span = createSpan(file, pos(5, 10, 50), pos(5, 20, 60));
                        const position = pos(5, 10, 50);

                        expect(spanContains(span, position)).toBe(true);
                });

                it('returns true when position is at end of span', () => {
                        const span = createSpan(file, pos(5, 10, 50), pos(5, 20, 60));
                        const position = pos(5, 20, 60);

                        expect(spanContains(span, position)).toBe(true);
                });

                it('returns true when position is within multi-line span', () => {
                        const span = createSpan(file, pos(5, 10, 50), pos(10, 5, 100));
                        const position = pos(7, 15, 75);

                        expect(spanContains(span, position)).toBe(true);
                });

                it('returns false when position is before span', () => {
                        const span = createSpan(file, pos(5, 10, 50), pos(5, 20, 60));
                        const position = pos(5, 5, 45);

                        expect(spanContains(span, position)).toBe(false);
                });

                it('returns false when position is after span', () => {
                        const span = createSpan(file, pos(5, 10, 50), pos(5, 20, 60));
                        const position = pos(5, 25, 65);

                        expect(spanContains(span, position)).toBe(false);
                });

                it('returns false when position is on different line before span', () => {
                        const span = createSpan(file, pos(5, 10, 50), pos(5, 20, 60));
                        const position = pos(4, 15, 45);

                        expect(spanContains(span, position)).toBe(false);
                });

                it('returns false when position is on different line after span', () => {
                        const span = createSpan(file, pos(5, 10, 50), pos(5, 20, 60));
                        const position = pos(6, 15, 65);

                        expect(spanContains(span, position)).toBe(false);
                });
        });

        describe('spanOverlaps', () => {
                it('returns true when spans are identical', () => {
                        const a = createSpan(file, pos(5, 10, 50), pos(5, 20, 60));
                        const b = createSpan(file, pos(5, 10, 50), pos(5, 20, 60));

                        expect(spanOverlaps(a, b)).toBe(true);
                });

                it('returns true when spans partially overlap', () => {
                        const a = createSpan(file, pos(5, 10, 50), pos(5, 20, 60));
                        const b = createSpan(file, pos(5, 15, 55), pos(5, 25, 65));

                        expect(spanOverlaps(a, b)).toBe(true);
                        expect(spanOverlaps(b, a)).toBe(true);
                });

                it('returns true when one span contains another', () => {
                        const a = createSpan(file, pos(5, 10, 50), pos(5, 30, 70));
                        const b = createSpan(file, pos(5, 15, 55), pos(5, 20, 60));

                        expect(spanOverlaps(a, b)).toBe(true);
                        expect(spanOverlaps(b, a)).toBe(true);
                });

                it('returns true when spans touch at boundary', () => {
                        const a = createSpan(file, pos(5, 10, 50), pos(5, 20, 60));
                        const b = createSpan(file, pos(5, 20, 60), pos(5, 30, 70));

                        expect(spanOverlaps(a, b)).toBe(true);
                });

                it('returns false when spans are on different lines and do not overlap', () => {
                        const a = createSpan(file, pos(5, 10, 50), pos(5, 20, 60));
                        const b = createSpan(file, pos(6, 10, 70), pos(6, 20, 80));

                        expect(spanOverlaps(a, b)).toBe(false);
                });

                it('returns false when spans are on same line but do not overlap', () => {
                        const a = createSpan(file, pos(5, 10, 50), pos(5, 20, 60));
                        const b = createSpan(file, pos(5, 25, 65), pos(5, 30, 70));

                        expect(spanOverlaps(a, b)).toBe(false);
                });

                it('returns false when spans are in different files', () => {
                        const file2Result = filePath('/test/other.ts');
                        if (!file2Result.ok) throw new Error('Failed to create test file path');
                        const file2 = file2Result.value;

                        const a = createSpan(file, pos(5, 10, 50), pos(5, 20, 60));
                        const b = createSpan(file2, pos(5, 10, 50), pos(5, 20, 60));

                        expect(spanOverlaps(a, b)).toBe(false);
                });

                it('returns true for multi-line overlapping spans', () => {
                        const a = createSpan(file, pos(5, 10, 50), pos(10, 5, 100));
                        const b = createSpan(file, pos(8, 0, 80), pos(12, 10, 120));

                        expect(spanOverlaps(a, b)).toBe(true);
                });
        });

        describe('formatSpan', () => {
                it('formats span as file:line:column', () => {
                        const span = createSpan(file, pos(42, 15, 500), pos(42, 25, 510));

                        expect(formatSpan(span)).toBe(`${file}:42:15`);
                });

                it('uses start position for formatting', () => {
                        const span = createSpan(file, pos(10, 5, 100), pos(20, 10, 200));

                        expect(formatSpan(span)).toBe(`${file}:10:5`);
                });
        });
});
