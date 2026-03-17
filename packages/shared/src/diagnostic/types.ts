// packages/shared/src/diagnostic/types.ts

import type { SourceSpan } from '../source';

export type DiagnosticCategory = 'fatal' | 'error' | 'warning' | 'info' | 'hint';

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type FourDigits = `${Digit}${Digit}${Digit}${Digit}`;
type FiveDigits = `${FourDigits}${Digit}`;

export type DiagnosticPrefix = 'ADTK' | 'PLUGIN';

export type DiagnosticCode = `${DiagnosticPrefix}-${string}-${FourDigits | FiveDigits}`;

export interface DiagnosticMessage {
        readonly title: string;
        readonly description: string;
        readonly notes?: readonly string[];
        readonly codeExample?: string;
}

export interface DiagnosticSpan {
        readonly span: SourceSpan;
        readonly message: string;
        readonly issue?: string;
        readonly help?: string;
}

export interface Diagnostic {
        readonly code: DiagnosticCode;
        readonly category: DiagnosticCategory;
        readonly message: DiagnosticMessage;
        readonly spans: DiagnosticSpan[];
}

export class FatalDiagnostic extends Error {
        public constructor(public readonly diagnostic: Diagnostic) {
                super(diagnostic.message.title);
                this.name = 'FatalDiagnostic';
                Object.setPrototypeOf(this, FatalDiagnostic.prototype);
        }
}
