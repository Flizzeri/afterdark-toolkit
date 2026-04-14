// packages/shared/src/source/utils.ts

import type { SourcePosition, SourceSpan } from './types.js';
import type { FilePath } from '../branded';

export function createSpan(file: FilePath, start: SourcePosition, end: SourcePosition): SourceSpan {
        return { file, start, end };
}

export function spanContains(span: SourceSpan, position: SourcePosition): boolean {
        if (span.start.line > position.line || span.end.line < position.line) {
                return false;
        }

        if (span.start.line === position.line && span.start.column > position.column) {
                return false;
        }

        if (span.end.line === position.line && span.end.column < position.column) {
                return false;
        }

        return true;
}

export function spanOverlaps(a: SourceSpan, b: SourceSpan): boolean {
        if (a.file !== b.file) {
                return false;
        }

        if (a.end.line < b.start.line || b.end.line < a.start.line) {
                return false;
        }

        if (a.end.line === b.start.line && a.end.column < b.start.column) {
                return false;
        }

        if (b.end.line === a.start.line && b.end.column < a.start.column) {
                return false;
        }

        return true;
}

export function formatSpan(span: SourceSpan): string {
        return `${span.file}:${span.start.line}:${span.start.column}`;
}
