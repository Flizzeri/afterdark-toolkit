// src/ts/fs.ts

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { CACHE_IO_ERROR } from '../diagnostics/codes.js';
import { makeDiagnostic } from '../diagnostics/factory.js';
import type { FilePath } from '../shared/primitives.js';
import { ok, err, type Result } from '../shared/result.js';

/**
 * Normalizes a file path to POSIX format (forward slashes) for cross-platform stability.
 * Resolves to absolute path and ensures deterministic representation.
 *
 * @param filePath - The path to normalize (relative or absolute).
 * @param basePath - Optional base path for relative resolution (defaults to cwd).
 * @returns Normalized POSIX-style absolute path.
 */
export function normalizePath(filePath: string, basePath?: string): FilePath {
        const base = basePath ?? process.cwd();
        const resolved = path.isAbsolute(filePath) ? filePath : path.join(base, filePath);
        // Convert to POSIX (forward slashes) for deterministic cross-platform hashing
        const normalized = resolved.split(path.sep).join('/');
        return normalized as FilePath;
}

/**
 * Reads a file from disk, returning its UTF-8 contents.
 * Never throws; returns Result with diagnostics on failure.
 *
 * @param filePath - Absolute or relative path to the file.
 * @returns Result containing file contents or diagnostics.
 */
export async function readFile(filePath: FilePath): Promise<Result<string>> {
        try {
                const content = await fs.readFile(filePath, 'utf8');
                return ok(content);
        } catch (e) {
                return err([
                        makeDiagnostic({
                                meta: CACHE_IO_ERROR,
                                args: [filePath, String(e)],
                                location: { filePath },
                        }),
                ]);
        }
}

/**
 * Checks if a file exists at the given path.
 * Never throws; returns false on any error (including permissions).
 *
 * @param filePath - Path to check.
 * @returns True if file exists and is accessible, false otherwise.
 */
export async function fileExists(filePath: FilePath): Promise<boolean> {
        try {
                await fs.access(filePath);
                return true;
        } catch {
                return false;
        }
}

/**
 * Gets file stats (size, modified time) for a given path.
 * Never throws; returns Result with diagnostics on failure.
 *
 * @param filePath - Path to stat.
 * @returns Result containing file stats or diagnostics.
 */
export async function stat(filePath: FilePath): Promise<Result<{ size: number; mtimeMs: number }>> {
        try {
                const stats = await fs.stat(filePath);
                return ok({ size: stats.size, mtimeMs: stats.mtimeMs });
        } catch (e) {
                return err([
                        makeDiagnostic({
                                meta: CACHE_IO_ERROR,
                                args: [filePath, String(e)],
                                location: { filePath },
                        }),
                ]);
        }
}

Object.freeze(normalizePath);
Object.freeze(readFile);
Object.freeze(fileExists);
Object.freeze(stat);
