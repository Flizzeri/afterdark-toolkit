// packages/core/src/ts/program.ts

import { type FilePath, ok, err, type Result, makeDiagnostic } from '@afterdarktk/shared';
import { Project, type CompilerOptions } from 'ts-morph';

import { normalizePath, fileExists } from './fs.js';
import { TYPE_UNRESOLVED } from '../diagnostics/codes.js';

/**
 * Stable compiler options enforced by the toolkit.
 * These ensure deterministic type checking and extraction.
 */
const STRICT_COMPILER_OPTIONS: Partial<CompilerOptions> = {
        strict: true,
        strictNullChecks: true,
        strictFunctionTypes: true,
        strictBindCallApply: true,
        strictPropertyInitialization: true,
        noImplicitAny: true,
        noImplicitThis: true,
        alwaysStrict: true,
        exactOptionalPropertyTypes: true,
        noUncheckedIndexedAccess: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        noUnusedLocals: false, // Allow unused for extraction
        noUnusedParameters: false, // Allow unused for extraction
        skipLibCheck: true, // Performance optimization
} as const;

/**
 * Options for creating a TypeScript Program wrapper.
 */
export interface CreateProgramOptions {
        readonly tsconfigPath: FilePath;
        readonly basePath?: string; // defaults to dirname of tsconfig
}

/**
 * Wrapper around ts-morph Project with controlled initialization.
 * Encapsulates all compiler state and provides deterministic access.
 */
export interface ProgramWrapper {
        readonly project: Project;
        readonly tsconfigPath: FilePath;
        readonly basePath: string;
}

/**
 * Creates a ts-morph Project from a tsconfig.json file.
 * Enforces strict compiler options for deterministic extraction.
 * Never throws; returns Result with diagnostics on failure.
 *
 * @param options - Configuration for project creation.
 * @returns Result containing ProgramWrapper or diagnostics.
 */
export async function createProgram(
        options: CreateProgramOptions,
): Promise<Result<ProgramWrapper>> {
        const tsconfigPath = normalizePath(options.tsconfigPath, options.basePath);

        // Verify tsconfig exists
        const exists = await fileExists(tsconfigPath);
        if (!exists) {
                return err([
                        makeDiagnostic({
                                meta: TYPE_UNRESOLVED,
                                args: [`tsconfig.json not found at ${tsconfigPath}`],
                                location: { filePath: tsconfigPath },
                        }),
                ]);
        }

        try {
                // Create project with strict options
                const project = new Project({
                        tsConfigFilePath: tsconfigPath,
                        compilerOptions: STRICT_COMPILER_OPTIONS,
                        skipAddingFilesFromTsConfig: false,
                        skipFileDependencyResolution: false,
                });

                // Determine base path (directory of tsconfig)
                const basePath =
                        options.basePath ??
                        tsconfigPath.substring(0, tsconfigPath.lastIndexOf('/'));

                return ok({
                        project,
                        tsconfigPath,
                        basePath,
                });
        } catch (e) {
                return err([
                        makeDiagnostic({
                                meta: TYPE_UNRESOLVED,
                                args: [`Failed to create TypeScript program: ${String(e)}`],
                                location: { filePath: tsconfigPath },
                        }),
                ]);
        }
}

/**
 * Adds a source file to the project programmatically.
 * Useful for testing or dynamic file injection.
 * Never throws; returns Result with diagnostics on failure.
 *
 * @param wrapper - The program wrapper.
 * @param filePath - Path to the source file (absolute or relative to basePath).
 * @param content - Optional file content (if not reading from disk).
 * @returns Result containing the normalized file path or diagnostics.
 */
export function addSourceFile(
        wrapper: ProgramWrapper,
        filePath: string,
        content?: string,
): Result<FilePath> {
        try {
                const normalized = normalizePath(filePath, wrapper.basePath);

                if (content !== undefined) {
                        wrapper.project.createSourceFile(normalized, content, { overwrite: true });
                } else {
                        wrapper.project.addSourceFileAtPath(normalized);
                }

                return ok(normalized);
        } catch (e) {
                return err([
                        makeDiagnostic({
                                meta: TYPE_UNRESOLVED,
                                args: [`Failed to add source file ${filePath}: ${String(e)}`],
                        }),
                ]);
        }
}

/**
 * Retrieves all source files in the project (excluding node_modules and declaration files).
 * Returns normalized file paths for deterministic processing.
 *
 * @param wrapper - The program wrapper.
 * @returns Array of normalized source file paths.
 */
export function getSourceFiles(wrapper: ProgramWrapper): readonly FilePath[] {
        return wrapper.project
                .getSourceFiles()
                .filter(
                        (sf) =>
                                !sf.isDeclarationFile() &&
                                !sf.getFilePath().includes('node_modules'),
                )
                .map((sf) => normalizePath(sf.getFilePath()) as FilePath);
}

Object.freeze(STRICT_COMPILER_OPTIONS);
Object.freeze(createProgram);
Object.freeze(addSourceFile);
Object.freeze(getSourceFiles);
