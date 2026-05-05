// packages/shared/src/branded/utils.ts

import * as path from 'node:path';

import { ok, err, type Result } from '../result';
import type {
        _DiagnosticCode,
        FilePath,
        SemVer,
        EntityName,
        SymbolId,
        TypeId,
        NodeId,
        JsDocTagName,
} from './types.js';

type Prefix = 'ADTK' | 'PLUGIN';

export function _diagnosticCode<T extends string>(
        code: T extends `${Prefix}-${string}-${infer Suffix}`
                ? Suffix extends `${number}${number}${number}${number}${infer Rest}`
                        ? Rest extends '' | `${number}`
                                ? T
                                : never
                        : never
                : never,
): _DiagnosticCode {
        return code as _DiagnosticCode;
}

export function filePath(pathStr: string): Result<FilePath, string> {
        if (!pathStr || pathStr.trim().length === 0) {
                return err('File path cannot be empty');
        }

        const absolutePath = path.resolve(pathStr);
        const normalized = absolutePath.split(path.sep).join('/');

        return ok(normalized as FilePath);
}

export function semVer(version: string): Result<SemVer, string> {
        if (!version || version.trim().length === 0) {
                return err('Version cannot be empty');
        }

        const trimmed = version.trim();
        const semverRegex =
                /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

        if (!semverRegex.test(trimmed)) {
                return err(
                        `Invalid semantic version: "${version}". Expected format: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`,
                );
        }

        return ok(trimmed as SemVer);
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
