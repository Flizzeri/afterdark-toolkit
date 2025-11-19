// packages/shared/src/diagnostics/factory.ts

import type { CodeMeta, Diagnostic, DiagnosticContext, DiagnosticLocation } from './types.js';
import { DOCS_BASE_URL } from '../primitives/constants';

function codeUrl(meta: CodeMeta): string {
        return `${DOCS_BASE_URL}/${meta.docsSlug}`;
}

// String formatting w/ explicit typing.
function format(template: string, args: readonly string[]): string {
        let idx = 0;
        return template.replace(/%s/g, () => {
                const v: string | undefined = args[idx++];
                return v ?? '<missing>';
        });
}

export interface DiagnosticInput {
        readonly meta: CodeMeta;
        readonly args?: readonly string[];
        readonly location?: DiagnosticLocation;
        readonly context?: DiagnosticContext;
}

export function makeDiagnostic(input: DiagnosticInput): Diagnostic {
        const message = format(input.meta.template, input.args ?? []);
        return {
                code: input.meta.code,
                category: input.meta.category,
                message,
                helpUrl: codeUrl(input.meta),
                ...(input.location && { location: input.location }),
                ...(input.context && { context: input.context }),
        };
}
