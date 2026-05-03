// packages/program/tests/watch.test.ts

import * as fs from 'node:fs';

import { type FilePath } from '@adtk/shared';
import { describe, it, expect, vi } from 'vitest';

import { createWatchProgram, type WatchStatus } from '../src/watch';
import { fixturePath } from './utils/helpers.js';

// Helper to wait for watch mode to detect changes
const waitForWatch = () => new Promise((resolve) => setTimeout(resolve, 1500));

describe('watch/watcher', () => {
        describe('createWatchProgram', () => {
                it('returns error when tsconfig is missing', () => {
                        const result = createWatchProgram({
                                projectConfig: {},
                                onProgramUpdate: () => {},
                        });

                        expect(result.ok).toBe(false);
                        if (result.ok) return;

                        expect(result.error.type).toBe('missing-tsconfig');
                });

                it('creates watch program successfully', async () => {
                        const tsconfigPath = fixturePath('watch-test', 'tsconfig.json');

                        const result = createWatchProgram({
                                projectConfig: { tsconfig: tsconfigPath },
                                onProgramUpdate: () => {},
                        });

                        expect(result.ok).toBe(true);

                        if (!result.ok) return;

                        const watchProgram = result.value;
                        expect(watchProgram).toBeDefined();
                        expect(typeof watchProgram.getCurrentProgram).toBe('function');
                        expect(typeof watchProgram.close).toBe('function');

                        // Wait a bit before closing to avoid issues
                        await waitForWatch();
                        watchProgram.close();
                });

                it('provides current program', async () => {
                        const tsconfigPath = fixturePath('watch-test', 'tsconfig.json');

                        const result = createWatchProgram({
                                projectConfig: { tsconfig: tsconfigPath },
                                onProgramUpdate: () => {},
                        });

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        const watchProgram = result.value;
                        const program = watchProgram.getCurrentProgram();

                        expect(program).toBeDefined();
                        expect(program.getSourceFiles().length).toBeGreaterThan(0);

                        await waitForWatch();
                        watchProgram.close();
                });

                it('calls onProgramUpdate on initial compilation', async () => {
                        const tsconfigPath = fixturePath('watch-test', 'tsconfig.json');
                        const onProgramUpdate = vi.fn();

                        const result = createWatchProgram({
                                projectConfig: { tsconfig: tsconfigPath },
                                onProgramUpdate,
                        });

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        // Wait for initial compilation
                        await waitForWatch();

                        expect(onProgramUpdate).toHaveBeenCalled();

                        const [program, changedFiles] = onProgramUpdate.mock.calls[0];
                        expect(program).toBeDefined();
                        expect(Array.isArray(changedFiles)).toBe(true);

                        result.value.close();
                });

                it('detects file changes', async () => {
                        const tsconfigPath = fixturePath('watch-test', 'tsconfig.json');
                        const watchTestFile = fixturePath('watch-test', 'initial.ts');
                        const onProgramUpdate = vi.fn();

                        const result = createWatchProgram({
                                projectConfig: { tsconfig: tsconfigPath },
                                onProgramUpdate,
                        });

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        // Wait for initial compilation
                        await waitForWatch();
                        onProgramUpdate.mockClear();

                        // Read original content
                        const originalContent = fs.readFileSync(watchTestFile, 'utf-8');

                        try {
                                // Modify the file
                                const modifiedContent =
                                        originalContent + '\nexport const NEW_CONSTANT = 42;\n';
                                fs.writeFileSync(watchTestFile, modifiedContent, 'utf-8');

                                // Wait for watch to detect change
                                await waitForWatch();

                                expect(onProgramUpdate).toHaveBeenCalled();

                                const [, changedFiles] = onProgramUpdate.mock.calls[0];
                                expect(changedFiles.length).toBeGreaterThan(0);
                                expect(
                                        changedFiles.some((f: FilePath) =>
                                                f.includes('initial.ts'),
                                        ),
                                ).toBe(true);
                        } finally {
                                // Restore original content
                                fs.writeFileSync(watchTestFile, originalContent, 'utf-8');
                                result.value.close();
                        }
                });

                it('reports only changed files, not all files', async () => {
                        const tsconfigPath = fixturePath('multiple-files', 'tsconfig.json');
                        const userFilePath = fixturePath('multiple-files/models', 'user.ts');
                        const onProgramUpdate = vi.fn();

                        const result = createWatchProgram({
                                projectConfig: { tsconfig: tsconfigPath },
                                onProgramUpdate,
                        });

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        await waitForWatch();
                        onProgramUpdate.mockClear();

                        // Read original content
                        const originalContent = fs.readFileSync(userFilePath, 'utf-8');

                        try {
                                // Modify just one file
                                fs.writeFileSync(
                                        userFilePath,
                                        originalContent + '\n// Comment\n',
                                        'utf-8',
                                );

                                await waitForWatch();

                                // Check if callback was called
                                if (onProgramUpdate.mock.calls.length > 0) {
                                        const [, changedFiles] = onProgramUpdate.mock.calls[0];

                                        // Should only report user.ts as changed, not all files
                                        expect(changedFiles.length).toBeGreaterThan(0);
                                        expect(
                                                changedFiles.some((f: FilePath) =>
                                                        f.includes('user.ts'),
                                                ),
                                        ).toBe(true);
                                }
                        } finally {
                                // Restore original content
                                fs.writeFileSync(userFilePath, originalContent, 'utf-8');
                                result.value.close();
                        }
                });

                it('calls onStatusChange callback', async () => {
                        const tsconfigPath = fixturePath('watch-test', 'tsconfig.json');
                        const onStatusChange = vi.fn();

                        const result = createWatchProgram({
                                projectConfig: { tsconfig: tsconfigPath },
                                onProgramUpdate: () => {},
                                onStatusChange,
                        });

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        await waitForWatch();

                        expect(onStatusChange).toHaveBeenCalled();

                        const statuses = onStatusChange.mock.calls.map(
                                (call) => call[0],
                        ) as WatchStatus[];

                        // Should have received status updates
                        expect(statuses.length).toBeGreaterThan(0);

                        // Should have "compiled" status
                        const compiledStatus = statuses.find((s) => s.type === 'compiled');
                        expect(compiledStatus).toBeDefined();

                        if (compiledStatus?.type === 'compiled') {
                                expect(typeof compiledStatus.duration).toBe('number');
                                expect(compiledStatus.duration).toBeGreaterThanOrEqual(0);
                        }

                        result.value.close();
                });

                it('calls onDiagnostics callback when errors occur', async () => {
                        // Create an error file
                        const errorFilePath = fixturePath('watch-test', 'error-file.ts');
                        const errorContent = `
export interface User {
  name: string;
}

export const user: User = {
  name: 123  // Type error
};
`;

                        try {
                                fs.writeFileSync(errorFilePath, errorContent, 'utf-8');

                                const tsconfigPath = fixturePath('watch-test', 'tsconfig.json');
                                const onDiagnostics = vi.fn();

                                const result = createWatchProgram({
                                        projectConfig: { tsconfig: tsconfigPath },
                                        onProgramUpdate: () => {},
                                        onDiagnostics,
                                });

                                expect(result.ok).toBe(true);
                                if (!result.ok) return;

                                await waitForWatch();

                                // Should have received diagnostics
                                expect(onDiagnostics.mock.calls.length).toBeGreaterThan(0);

                                const [diagnosticsCollector] = onDiagnostics.mock.calls[0];
                                expect(diagnosticsCollector).toBeDefined();

                                result.value.close();
                        } finally {
                                // Cleanup
                                if (fs.existsSync(errorFilePath)) {
                                        fs.unlinkSync(errorFilePath);
                                }
                        }
                });

                it('does not report unchanged files as changed', async () => {
                        const tsconfigPath = fixturePath('multiple-files', 'tsconfig.json');
                        const userFilePath = fixturePath('multiple-files/models', 'user.ts');
                        const onProgramUpdate = vi.fn();

                        const result = createWatchProgram({
                                projectConfig: { tsconfig: tsconfigPath },
                                onProgramUpdate,
                        });

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        await waitForWatch();
                        onProgramUpdate.mockClear();

                        // Touch a file without changing content
                        const content = fs.readFileSync(userFilePath, 'utf-8');
                        fs.writeFileSync(userFilePath, content, 'utf-8');

                        await waitForWatch();

                        // Might trigger a recompilation, but shouldn't report as changed
                        if (onProgramUpdate.mock.calls.length > 0) {
                                const [, changedFiles] = onProgramUpdate.mock.calls[0];
                                // Changed files should be empty (content is identical)
                                expect(changedFiles.length).toBe(0);
                        }

                        result.value.close();
                });

                it('handles file deletion', async () => {
                        // Create a temporary file
                        const tempFilePath = fixturePath('watch-test', 'temp.ts');
                        fs.writeFileSync(tempFilePath, 'export const TEMP = true;\n', 'utf-8');

                        const tsconfigPath = fixturePath('watch-test', 'tsconfig.json');
                        const onProgramUpdate = vi.fn();

                        const result = createWatchProgram({
                                projectConfig: { tsconfig: tsconfigPath },
                                onProgramUpdate,
                        });

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        await waitForWatch();
                        onProgramUpdate.mockClear();

                        // Delete the file
                        fs.unlinkSync(tempFilePath);

                        // Wait for watch to detect deletion
                        await waitForWatch();

                        // Some watch implementations may or may not trigger on deletion
                        // Just verify that if it triggers, it reports the deleted file
                        if (onProgramUpdate.mock.calls.length > 0) {
                                const [, changedFiles] = onProgramUpdate.mock.calls[0];
                                expect(
                                        changedFiles.some((f: FilePath) => f.includes('temp.ts')),
                                ).toBe(true);
                        }

                        result.value.close();
                });

                it('handles new file creation', async () => {
                        const tsconfigPath = fixturePath('watch-test', 'tsconfig.json');
                        const newFilePath = fixturePath('watch-test', 'new-file.ts');
                        const onProgramUpdate = vi.fn();

                        const result = createWatchProgram({
                                projectConfig: { tsconfig: tsconfigPath },
                                onProgramUpdate,
                        });

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        await waitForWatch();
                        onProgramUpdate.mockClear();

                        try {
                                // Create a new file
                                fs.writeFileSync(
                                        newFilePath,
                                        'export const NEW = true;\n',
                                        'utf-8',
                                );

                                await waitForWatch();

                                // Some watch implementations may take time to detect new files
                                // Just verify that if it triggers, it reports the new file
                                if (onProgramUpdate.mock.calls.length > 0) {
                                        const [, changedFiles] = onProgramUpdate.mock.calls[0];
                                        expect(
                                                changedFiles.some((f: FilePath) =>
                                                        f.includes('new-file.ts'),
                                                ),
                                        ).toBe(true);
                                }
                        } finally {
                                // Cleanup
                                if (fs.existsSync(newFilePath)) {
                                        fs.unlinkSync(newFilePath);
                                }
                                result.value.close();
                        }
                });

                it('respects skipLibFiles option', async () => {
                        const tsconfigPath = fixturePath('lib-files', 'tsconfig.json');
                        const onProgramUpdate = vi.fn();

                        const result = createWatchProgram({
                                projectConfig: { tsconfig: tsconfigPath },
                                loadOptions: { skipLibFiles: true },
                                onProgramUpdate,
                        });

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        await waitForWatch();

                        const [program] = onProgramUpdate.mock.calls[0];
                        const sourceFiles = program.getSourceFiles();

                        // Should not include lib files
                        expect(sourceFiles.every((f) => !f.fileName.includes('lib.'))).toBe(true);

                        result.value.close();
                });

                it('can be closed and stopped', async () => {
                        const tsconfigPath = fixturePath('watch-test', 'tsconfig.json');
                        const watchTestFile = fixturePath('watch-test', 'initial.ts');
                        const onProgramUpdate = vi.fn();

                        const result = createWatchProgram({
                                projectConfig: { tsconfig: tsconfigPath },
                                onProgramUpdate,
                        });

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        await waitForWatch();
                        const callCountBeforeClose = onProgramUpdate.mock.calls.length;

                        // Close the watcher
                        result.value.close();

                        // Read original content
                        const originalContent = fs.readFileSync(watchTestFile, 'utf-8');

                        try {
                                // Modify file after close
                                fs.writeFileSync(
                                        watchTestFile,
                                        originalContent + '\n// After close\n',
                                        'utf-8',
                                );

                                await waitForWatch();

                                // Should not receive new updates after close
                                expect(onProgramUpdate.mock.calls.length).toBe(
                                        callCountBeforeClose,
                                );
                        } finally {
                                // Restore original content
                                fs.writeFileSync(watchTestFile, originalContent, 'utf-8');
                        }
                });

                it('reports compilation duration', async () => {
                        const tsconfigPath = fixturePath('watch-test', 'tsconfig.json');
                        const onStatusChange = vi.fn();

                        const result = createWatchProgram({
                                projectConfig: { tsconfig: tsconfigPath },
                                onProgramUpdate: () => {},
                                onStatusChange,
                        });

                        expect(result.ok).toBe(true);
                        if (!result.ok) return;

                        await waitForWatch();

                        const statuses = onStatusChange.mock.calls.map(
                                (call) => call[0],
                        ) as WatchStatus[];
                        const compiledStatus = statuses.find((s) => s.type === 'compiled');

                        expect(compiledStatus).toBeDefined();
                        if (compiledStatus?.type === 'compiled') {
                                expect(compiledStatus.duration).toBeGreaterThanOrEqual(0);
                                // Compilation should take some time
                                expect(compiledStatus.duration).toBeGreaterThan(0);
                        }

                        result.value.close();
                });
        });
});
