// packages/shared/src/branded/utils.ts

import * as path from 'node:path';

import type {
        FilePath,
        SemVer,
        EntityName,
        SymbolId,
        TypeId,
        NodeId,
        JsDocTagName,
} from './types.js';

export function filePath(pathStr: string): FilePath {
        if (!pathStr || pathStr.trim().length === 0) {
                throw new Error('File path cannot be empty');
        }

        // Resolve to absolute path
        const absolutePath = path.resolve(pathStr);

        // Normalize to forward slashes (cross-platform consistency)
        const normalized = absolutePath.split(path.sep).join('/');

        return normalized as FilePath;
}

export function semVer(version: string): SemVer {
        if (!version || version.trim().length === 0) {
                throw new Error('Version cannot be empty');
        }

        const trimmed = version.trim();

        // Regex for semantic versioning (strict)
        // Matches: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
        const semverRegex =
                /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

        if (!semverRegex.test(trimmed)) {
                throw new Error(
                        `Invalid semantic version: "${version}". ` +
                                'Expected format: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]',
                );
        }

        return trimmed as SemVer;
}

export function entityName(name: string): EntityName {
        return name as EntityName;
}

export function symbolId(id: string): SymbolId {
        return id as SymbolId;
}

export function typeId(id: string): TypeId {
        return id as TypeId;
}

export function nodeId(id: string): NodeId {
        return id as NodeId;
}

export function jsDocTagName(name: string): JsDocTagName {
        return name as JsDocTagName;
}
