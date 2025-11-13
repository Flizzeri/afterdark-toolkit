// src/ts/types.ts

import type { JsDocTagName } from '../shared/primitives.js';

// Represents a parsed JSDoc tag with stable structure.
export interface ParsedJsDocTag {
        readonly name: JsDocTagName;
        readonly text: string; // trimmed, normalized whitespace
        readonly comment?: string; // optional tag comment/description
}

// Represents a source location span (1-based line/column).
export interface SourceSpan {
        readonly filePath: string; // normalized posix path
        readonly startLine: number; // 1-based
        readonly startColumn: number; // 1-based
        readonly endLine: number; // 1-based
        readonly endColumn: number; // 1-based
}
