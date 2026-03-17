// packages/program/src/project/config.ts

import * as fs from 'node:fs';
import * as path from 'node:path';

import { filePath, type FilePath, ok, err, type Result } from '@adtk/shared';
import * as ts from 'typescript';

import type { LoadError } from './types.js';

export function parseTsConfig(tsconfigPath: FilePath): Result<ts.ParsedCommandLine, LoadError> {
        if (!fs.existsSync(tsconfigPath)) {
                return err({
                        type: 'tsconfig-not-found',
                        message: `tsconfig.json not found at ${tsconfigPath}`,
                        path: tsconfigPath,
                });
        }

        let configText: string;
        try {
                configText = fs.readFileSync(tsconfigPath, 'utf-8');
        } catch (error) {
                return err({
                        type: 'tsconfig-read-error',
                        message: `Failed to read tsconfig.json: ${error instanceof Error ? error.message : String(error)}`,
                        path: tsconfigPath,
                });
        }

        const configDir = path.dirname(tsconfigPath);
        const parseResult = ts.parseConfigFileTextToJson(tsconfigPath, configText);

        if (parseResult.error) {
                return err({
                        type: 'tsconfig-parse-error',
                        message: ts.flattenDiagnosticMessageText(
                                parseResult.error.messageText,
                                '\n',
                        ),
                        path: tsconfigPath,
                });
        }

        const parsed = ts.parseJsonConfigFileContent(
                parseResult.config,
                ts.sys,
                configDir,
                undefined,
                tsconfigPath,
        );

        if (parsed.errors.length > 0) {
                const firstError = parsed.errors[0];
                return err({
                        type: 'tsconfig-parse-error',
                        message: ts.flattenDiagnosticMessageText(firstError.messageText, '\n'),
                        path: tsconfigPath,
                });
        }

        return ok(parsed);
}

export function resolveRootFiles(rootFiles: readonly FilePath[]): Result<string[], LoadError> {
        const resolved: string[] = [];

        for (const file of rootFiles) {
                if (!fs.existsSync(file)) {
                        return err({
                                type: 'no-input-files',
                                message: `Input file not found: ${file}`,
                                path: file,
                        });
                }
                resolved.push(file);
        }

        if (resolved.length === 0) {
                return err({
                        type: 'no-input-files',
                        message: 'No input files provided',
                });
        }

        return ok(resolved);
}

export function findTsConfig(startDir: FilePath): Result<FilePath, LoadError> {
        let currentDir = startDir;

        while (true) {
                const candidate = path.join(currentDir, 'tsconfig.json');

                const candidateResult = filePath(candidate);
                if (!candidateResult.ok) {
                        return err({
                                type: 'tsconfig-not-found',
                                message: candidateResult.error,
                        });
                }

                if (fs.existsSync(candidateResult.value)) {
                        return ok(candidateResult.value);
                }

                const parent = path.dirname(currentDir);
                if (parent === currentDir) {
                        return err({
                                type: 'tsconfig-not-found',
                                message: `No tsconfig.json found in ${startDir} or parent directories`,
                                path: startDir,
                        });
                }
                currentDir = parent as FilePath;
        }
}
