import { CATEGORY_ORDER } from './categories.js';
import type { Diagnostic } from './types.js';

export type ReportMode = 'pretty' | 'json';

export interface ReportOptions {
        readonly mode: ReportMode;
        readonly includeStack?: boolean; // reserved for future, default false
}

// Stable sort: category order, then code, then message text.
function sortDiagnostics(diags: readonly Diagnostic[]): readonly Diagnostic[] {
        return [...diags].sort((a, b) => {
                const cat = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
                if (cat !== 0) return cat;
                if (a.code !== b.code) return a.code < b.code ? -1 : 1;
                return a.message < b.message ? -1 : a.message > b.message ? 1 : 0;
        });
}

function renderPretty(d: Diagnostic): string {
        const loc = d.location;
        const where =
                loc?.filePath != null
                        ? `${loc.filePath}${loc.line ? `:${loc.line}` : ''}${loc.column ? `:${loc.column}` : ''}`
                        : '';
        const ctx = d.context;
        const ctxLine =
                ctx != null
                        ? [
                                  ctx.entity ? `entity: ${ctx.entity}` : '',
                                  ctx.field ? `field: ${ctx.field}` : '',
                                  ctx.hint ? ctx.hint : '',
                          ]
                                  .filter(Boolean)
                                  .join(' ')
                        : '';

        const help = d.helpUrl != null ? `\nhelp: ${d.helpUrl}` : '';

        const header = `${d.category} ${d.code} ${d.message}`;
        const body =
                where !== ''
                        ? `\n  ${where}${ctxLine !== '' ? ` ${ctxLine}` : ''}`
                        : ctxLine !== ''
                          ? `\n  ${ctxLine}`
                          : '';
        return `${header}${body}${help}`;
}

export function formatDiagnostics(diags: readonly Diagnostic[], options: ReportOptions): string {
        const sorted = sortDiagnostics(diags);
        if (options.mode === 'json') {
                // Stable JSON: let the caller pass this to a canonical encoder later.
                return JSON.stringify(sorted, null, 2);
        }
        return sorted.map(renderPretty).join('\n\n');
}
