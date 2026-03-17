// packages/program/src/source/wrapper.ts

import {
        filePath,
        createSpan,
        type FilePath,
        type SourceSpan,
        type SourcePosition,
} from '@adtk/shared';
import type * as ts from 'typescript';

import type { SourceFile } from './types.js';

export class SourceFileWrapper implements SourceFile {
        public readonly fileName: FilePath;
        public readonly text: string;

        public constructor(private readonly tsSourceFile: ts.SourceFile) {
                const filePathResult = filePath(tsSourceFile.fileName);
                if (!filePathResult.ok) {
                        throw new Error(`Invalid file path: ${tsSourceFile.fileName}`);
                }
                this.fileName = filePathResult.value;
                this.text = tsSourceFile.text;
        }

        public getSpan(node: ts.Node): SourceSpan {
                const start = this.tsSourceFile.getLineAndCharacterOfPosition(
                        node.getStart(this.tsSourceFile),
                );
                const end = this.tsSourceFile.getLineAndCharacterOfPosition(node.getEnd());

                return createSpan(
                        this.fileName,
                        {
                                line: start.line + 1,
                                column: start.character + 1,
                                offset: node.getStart(this.tsSourceFile),
                        },
                        {
                                line: end.line + 1,
                                column: end.character + 1,
                                offset: node.getEnd(),
                        },
                );
        }

        public getPosition(offset: number): SourcePosition {
                const { line, character } = this.tsSourceFile.getLineAndCharacterOfPosition(offset);

                return {
                        line: line + 1,
                        column: character + 1,
                        offset,
                };
        }
}
