// packages/program/tests/utils/helpers.ts

import * as path from 'node:path';

import { filePath, type FilePath } from '@adtk/shared';

const fixturesDir = path.join(__dirname, '..', 'fixtures');

export function fixturePath(name: string, file: string = ''): FilePath {
        const fp = filePath(path.join(fixturesDir, name, file));
        if (!fp.ok) throw new Error(`Invalid fixture path: ${name}/${file}`);
        return fp.value;
}

export const tempDir = path.join(fixturesDir, 'temp-emit');

export function tempPath(file: string = ''): FilePath {
        const fp = filePath(path.join(tempDir, file));
        if (!fp.ok) throw new Error(`Invalid temp path: ${file}`);
        return fp.value;
}
