// packages/shared/src/diagnostic/index.ts

export {
        type Diagnostic,
        type DiagnosticCategory,
        type DiagnosticCode,
        type DiagnosticMessage,
        type DiagnosticPrefix,
        type DiagnosticSpan,
        FatalDiagnostic,
} from './types';
export { DiagnosticCollector } from './collector';
