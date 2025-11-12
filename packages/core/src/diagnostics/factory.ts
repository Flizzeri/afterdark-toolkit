import { type IrErrorKey, codeUrl, getCodeMeta } from './codes.js';
import type { Diagnostic, DiagnosticContext, DiagnosticLocation } from './types.js';

// String formatting w/ explicit typing.
function format(template: string, args: readonly string[]): string {
        let idx = 0;
        return template.replace(/%s/g, () => {
                const v: string | undefined = args[idx++];
                return v ?? '<missing>';
        });
}

export interface DiagnosticInput {
        readonly key: IrErrorKey;
        readonly args?: readonly string[];
        readonly location?: DiagnosticLocation;
        readonly context?: DiagnosticContext;
}

export function makeDiagnostic(input: DiagnosticInput): Diagnostic {
        const meta = getCodeMeta(input.key);
        const message = format(meta.template, input.args ?? []);
        return {
                code: meta.code,
                category: meta.category,
                message,
                helpUrl: codeUrl(meta),
                ...(input.location && { location: input.location }),
                ...(input.context && { context: input.context }),
        };
}

// Small helpers for ergonomics.
export function diagError(
        key: IrErrorKey,
        args: readonly string[],
        location?: DiagnosticLocation,
        context?: DiagnosticContext,
): Diagnostic {
        const d = makeDiagnostic({
                key,
                args,
                ...(location && { location }),
                ...(context && { context }),
        });
        return d;
}
