// packages/program/src/codes.ts

// Single source of truth for every diagnostic @adtk/program can emit.

// Range allocation:
//   0001–0099  Fatal infrastructure failures (symbol ID, file path)
//   1001–1099   Emitter

import type { Diagnostic } from '@adtk/shared';

export const ProgramDiagnostics = {
        // EMIT-0001–0099  Emitter

        EMIT_CRASHED: {
                code: 'ADTK-PROGRAM-1001' as const,
                category: 'fatal' as const,
                new(errorMessage: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Emit crashed',
                                        description: `Emit failed with exception: ${errorMessage}`,
                                },
                                spans: [],
                        };
                },
        },

        // FATAL-0001–0002  Infrastructure failures

        SYMBOL_ID_HASH_FAILED: {
                code: 'ADTK-PROGRAM-0001' as const,
                category: 'fatal' as const,
                new(name: string, errorDetail: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Failed to generate symbol ID',
                                        description: `Cannot hash symbol metadata for '${name}': ${errorDetail}`,
                                },
                                spans: [],
                        };
                },
        },

        SYMBOL_LOCATION_HASH_FAILED: {
                code: 'ADTK-PROGRAM-0002' as const,
                category: 'fatal' as const,
                new(name: string, errorDetail: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Failed to hash symbol location',
                                        description: `Cannot hash symbol location for '${name}': ${errorDetail}`,
                                },
                                spans: [],
                        };
                },
        },

        INVALID_SYMBOL_FILE_PATH: {
                code: 'ADTK-FATAL-0003' as const,
                category: 'fatal' as const,
                new(fileName: string, errorDetail: string): Diagnostic {
                        return {
                                code: this.code,
                                category: this.category,
                                message: {
                                        title: 'Invalid file path in symbol declaration',
                                        description: `Failed to create file path from "${fileName}": ${errorDetail}`,
                                },
                                spans: [],
                        };
                },
        },
} as const;

export type ProgramDiagnosticCode =
        (typeof ProgramDiagnostics)[keyof typeof ProgramDiagnostics]['code'];
