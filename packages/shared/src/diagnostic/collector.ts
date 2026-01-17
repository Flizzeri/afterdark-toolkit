// packages/shared/src/diagnostic/collector.ts

import type { Diagnostic, DiagnosticCategory, DiagnosticCode, DiagnosticSpan } from './types';
import { createDiagnostic, isFatal, throwFatal } from './utils';
import type { SourceSpan } from '../source';

export class DiagnosticCollector {
        private diagnostics: Diagnostic[] = [];

        public add(diagnostic: Diagnostic): void {
                if (isFatal(diagnostic)) {
                        throwFatal(diagnostic);
                }
                this.diagnostics.push(diagnostic);
        }

        public addError(
                code: DiagnosticCode,
                title: string,
                span: SourceSpan,
                options?: {
                        description?: string;
                        notes?: readonly string[];
                        codeExample?: string;
                        message?: string;
                        issue?: string;
                        help?: string;
                        relatedSpans?: readonly DiagnosticSpan[];
                },
        ): void {
                this.add(
                        createDiagnostic(
                                code,
                                'error',
                                {
                                        title,
                                        description: options?.description ?? title,
                                        ...(options?.notes && { notes: options.notes }),
                                        ...(options?.codeExample && {
                                                codeExample: options.codeExample,
                                        }),
                                },
                                {
                                        span,
                                        message: options?.message ?? title,
                                        ...(options?.issue && { issue: options.issue }),
                                        ...(options?.help && { help: options.help }),
                                },
                                options?.relatedSpans,
                        ),
                );
        }

        public addWarning(
                code: DiagnosticCode,
                title: string,
                span: SourceSpan,
                options?: {
                        description?: string;
                        notes?: readonly string[];
                        codeExample?: string;
                        message?: string;
                        issue?: string;
                        help?: string;
                        relatedSpans?: readonly DiagnosticSpan[];
                },
        ): void {
                this.add(
                        createDiagnostic(
                                code,
                                'warning',
                                {
                                        title,
                                        description: options?.description ?? title,
                                        ...(options?.notes && { notes: options.notes }),
                                        ...(options?.codeExample && {
                                                codeExample: options.codeExample,
                                        }),
                                },
                                {
                                        span,
                                        message: options?.message ?? title,
                                        ...(options?.issue && { issue: options.issue }),
                                        ...(options?.help && { help: options.help }),
                                },
                                options?.relatedSpans,
                        ),
                );
        }

        public addInfo(
                code: DiagnosticCode,
                title: string,
                span: SourceSpan,
                options?: {
                        description?: string;
                        notes?: readonly string[];
                        message?: string;
                        relatedSpans?: readonly DiagnosticSpan[];
                },
        ): void {
                this.add(
                        createDiagnostic(
                                code,
                                'info',
                                {
                                        title,
                                        description: options?.description ?? title,
                                        ...(options?.notes && { notes: options.notes }),
                                },
                                {
                                        span,
                                        message: options?.message ?? title,
                                },
                                options?.relatedSpans,
                        ),
                );
        }

        public addHint(
                code: DiagnosticCode,
                title: string,
                span: SourceSpan,
                options?: {
                        description?: string;
                        help?: string;
                        message?: string;
                },
        ): void {
                this.add(
                        createDiagnostic(
                                code,
                                'hint',
                                {
                                        title,
                                        description: options?.description ?? title,
                                },
                                {
                                        span,
                                        message: options?.message ?? title,
                                        ...(options?.help && { help: options.help }),
                                },
                        ),
                );
        }

        public hasErrors(): boolean {
                return this.diagnostics.some((d) => d.category === 'error');
        }

        public hasWarnings(): boolean {
                return this.diagnostics.some((d) => d.category === 'warning');
        }

        public hasDiagnostics(): boolean {
                return this.diagnostics.length > 0;
        }

        public getErrors(): readonly Diagnostic[] {
                return this.diagnostics.filter((d) => d.category === 'error');
        }

        public getWarnings(): readonly Diagnostic[] {
                return this.diagnostics.filter((d) => d.category === 'warning');
        }

        public getInfos(): readonly Diagnostic[] {
                return this.diagnostics.filter((d) => d.category === 'info');
        }

        public getHints(): readonly Diagnostic[] {
                return this.diagnostics.filter((d) => d.category === 'hint');
        }

        public getAll(): readonly Diagnostic[] {
                return this.diagnostics;
        }

        public clear(): void {
                this.diagnostics = [];
        }

        public count(): number {
                return this.diagnostics.length;
        }

        public countByCategory(category: DiagnosticCategory): number {
                return this.diagnostics.filter((d) => d.category === category).length;
        }
}
