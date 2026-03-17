// packages/program/src/transform/types.ts

import type * as ts from 'typescript';

export type TransformerFactory = ts.TransformerFactory<ts.SourceFile>;

export type CustomTransformers = ts.CustomTransformers;
