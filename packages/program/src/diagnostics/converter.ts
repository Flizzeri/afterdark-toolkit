// packages/program/src/diagnostics/converter.ts

import {
        type DiagnosticCollector,
        type SourceSpan,
        type DiagnosticCode,
        filePath,
        createSpan,
} from '@adtk/shared';
import * as ts from 'typescript';

/**
 * Maps TS diagnostic code to ADTK diagnostic code.
 */
export function toAdtkDiagnosticCode(tsCode: number): DiagnosticCode {
        return `ADTK-TS-${String(tsCode).padStart(4, '0')}` as DiagnosticCode;
}

/**
 * Convert TypeScript diagnostics to ADTK diagnostic format.
 * Preserves all information including related diagnostics.
 */
export function convertDiagnostics(
        tsDiagnostics: readonly ts.Diagnostic[],
        collector: DiagnosticCollector,
): void {
        for (const tsDiag of tsDiagnostics) {
                convertDiagnostic(tsDiag, collector);
        }
}

function convertDiagnostic(diagnostic: ts.Diagnostic, collector: DiagnosticCollector): void {
        const code = toAdtkDiagnosticCode(diagnostic.code);
        const message = getMessageText(diagnostic.messageText);
        const primarySpan = getSpanFromDiagnostic(diagnostic);
        const category = convertCategory(diagnostic.category);

        const spans = primarySpan ? [{ span: primarySpan, message }] : [];

        const relatedSpans =
                diagnostic.relatedInformation
                        ?.map((info) => {
                                const span = getSpanFromDiagnostic(info);
                                return span
                                        ? {
                                                  span,
                                                  message: getMessageText(info.messageText),
                                          }
                                        : null;
                        })
                        .filter((s): s is { span: SourceSpan; message: string } => s !== null) ??
                [];

        const allSpans = [...spans, ...relatedSpans];

        if (category === 'error') {
                collector.addError(code, message, allSpans, {
                        description: message,
                });
        } else if (category === 'warning') {
                collector.addWarning(code, message, allSpans, {
                        description: message,
                });
        } else {
                collector.addInfo(code, message, allSpans, {
                        description: message,
                });
        }
}

function getSpanFromDiagnostic(
        diagnostic: ts.Diagnostic | ts.DiagnosticRelatedInformation,
): SourceSpan | undefined {
        if (!diagnostic.file || diagnostic.start === undefined || diagnostic.length === undefined) {
                return undefined;
        }

        const file = diagnostic.file;
        const filePathResult = filePath(file.fileName);
        if (!filePathResult.ok) {
                return undefined;
        }

        const start = file.getLineAndCharacterOfPosition(diagnostic.start);
        const end = file.getLineAndCharacterOfPosition(diagnostic.start + diagnostic.length);

        return createSpan(
                filePathResult.value,
                {
                        line: start.line + 1,
                        column: start.character + 1,
                        offset: diagnostic.start,
                },
                {
                        line: end.line + 1,
                        column: end.character + 1,
                        offset: diagnostic.start + diagnostic.length,
                },
        );
}

function getMessageText(messageText: string | ts.DiagnosticMessageChain): string {
        if (typeof messageText === 'string') {
                return messageText;
        }

        let result = messageText.messageText;
        let chain = messageText.next;

        while (chain) {
                const current = Array.isArray(chain) ? chain[0] : chain;
                if (current) {
                        result += '\n' + current.messageText;
                        chain = current.next;
                } else {
                        break;
                }
        }

        return result;
}

function convertCategory(category: ts.DiagnosticCategory): 'error' | 'warning' | 'info' {
        switch (category) {
                case ts.DiagnosticCategory.Error:
                        return 'error';
                case ts.DiagnosticCategory.Warning:
                        return 'warning';
                case ts.DiagnosticCategory.Suggestion:
                case ts.DiagnosticCategory.Message:
                        return 'info';
        }
}
