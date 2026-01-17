// packages/shared/src/diagnostic/collector.ts

import type { Diagnostic, DiagnosticCategory, DiagnosticCode, DiagnosticSpan } from './types';
import { createDiagnostic, isFatal, throwFatal } from './utils';
import type { SourceSpan } from '../source';

/**
 * Collects and manages diagnostics during compilation.
 *
 * @remarks
 * The diagnostic collector provides a centralized way to accumulate errors,
 * warnings, and other messages during IR extraction and compilation. Instead
 * of throwing exceptions or failing fast, code can add diagnostics to the
 * collector and continue processing.
 *
 * This approach enables:
 * - Reporting multiple errors at once (better DX)
 * - Distinguishing between fatal and recoverable errors
 * - Rich error context with source spans and related information
 * - Querying diagnostics by category or code
 *
 * @example
 * Basic error collection:
 * ```typescript
 * const collector = new DiagnosticCollector();
 *
 * // Extract types, accumulating errors
 * for (const typeNode of typeNodes) {
 *   const result = extractIR(typeNode);
 *   if (!result.ok) {
 *     collector.addError(
 *       'ADTK-IR-001',
 *       'Failed to extract type',
 *       typeNode.span,
 *       { description: result.error }
 *     );
 *   }
 * }
 *
 * // Check for errors
 * if (collector.hasErrors()) {
 *   const errors = collector.getErrors();
 *   // Format and display errors
 *   return err(errors);
 * }
 * ```
 *
 * @example
 * Rich diagnostics with context:
 * ```typescript
 * collector.addError('ADTK-IR-002', 'Circular reference', span, {
 *   description: 'Type "User" references itself through "Account"',
 *   help: 'Add a base case to break the cycle',
 *   relatedSpans: [
 *     { span: userSpan, message: 'User defined here' },
 *     { span: accountSpan, message: 'Account references User' }
 *   ],
 *   codeExample: `
 *     // Instead of:
 *     type User = { account: Account }
 *     type Account = { user: User }
 *
 *     // Try:
 *     type User = { account: Account | null }
 *   `
 * });
 * ```
 *
 * @example
 * Warnings and hints:
 * ```typescript
 * // Non-blocking warning
 * collector.addWarning('ADTK-IR-100', 'Deprecated feature', span, {
 *   description: 'Using legacy annotation syntax',
 *   help: 'Use @validate instead of @check'
 * });
 *
 * // Optimization hint
 * collector.addHint('ADTK-IR-200', 'Performance tip', span, {
 *   description: 'Union could use discriminant for faster validation',
 *   help: 'Add a "type" or "kind" property with literal values'
 * });
 * ```
 *
 * @example
 * Fatal errors (throws exception):
 * ```typescript
 * // This throws FatalDiagnostic and stops compilation
 * collector.add({
 *   code: 'ADTK-FATAL-001',
 *   category: 'fatal',
 *   message: { title: 'Out of memory', description: 'Cannot continue' },
 *   span: { span: someSpan, message: 'Processing failed here' }
 * });
 * ```
 */
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
