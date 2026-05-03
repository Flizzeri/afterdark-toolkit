// packages/core/src/annotation/types.ts

import type { JsDocTagName, SourceSpan } from '@adtk/shared';

/**
 * A parsed JSDoc annotation.
 * The data field is intentionally generic - plugins define their own schemas.
 *
 * @example
 * // @min(18)
 * { tag: "min", data: { value: 18 }, span: {...} }
 */
export interface ParsedAnnotation<T = unknown> {
        readonly tag: JsDocTagName;
        readonly data: T;
        readonly span: SourceSpan;
}
