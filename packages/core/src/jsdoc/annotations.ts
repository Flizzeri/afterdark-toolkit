// src/jsdoc/annotations.ts

import type { CoreTagName } from './tags.js';

export type Action = 'cascade' | 'restrict' | 'set null' | 'no action';

export interface BaseAnnotation {
        readonly tag: CoreTagName;
}

export interface EntityAnnotation extends BaseAnnotation {
        readonly tag: 'entity';
        readonly name?: string;
}

export interface PrimaryKeyAnnotation extends BaseAnnotation {
        readonly tag: 'pk';
}

export interface UniqueAnnotation extends BaseAnnotation {
        readonly tag: 'unique';
}

export interface IndexAnnotation extends BaseAnnotation {
        readonly tag: 'index';
        readonly fields: readonly string[];
        readonly unique: boolean;
}

export interface ForeignKeyAnnotation extends BaseAnnotation {
        readonly tag: 'fk';
        readonly target: string;
        readonly field: string;
        readonly onDelete?: Action;
        readonly onUpdate?: Action;
}

export interface DefaultAnnotation extends BaseAnnotation {
        readonly tag: 'default';
        readonly value: string;
}

export interface RenameFromAnnotation extends BaseAnnotation {
        readonly tag: 'renameFrom';
        readonly oldName: string;
        readonly version?: string;
}

export interface SqlTypeAnnotation extends BaseAnnotation {
        readonly tag: 'sqlType';
        readonly type: string;
}

export interface DecimalAnnotation extends BaseAnnotation {
        readonly tag: 'decimal';
        readonly precision: number;
        readonly scale: number;
}

export interface CheckAnnotation extends BaseAnnotation {
        readonly tag: 'check';
        readonly expression: string;
}

export interface VersionAnnotation extends BaseAnnotation {
        readonly tag: 'version';
        readonly semver: string;
}

export interface MinAnnotation extends BaseAnnotation {
        readonly tag: 'min';
        readonly value: number;
}

export interface MaxAnnotation extends BaseAnnotation {
        readonly tag: 'max';
        readonly value: number;
}

export interface IntAnnotation extends BaseAnnotation {
        readonly tag: 'int';
}

export interface MinLengthAnnotation extends BaseAnnotation {
        readonly tag: 'minLength';
        readonly value: number;
}

export interface MaxLengthAnnotation extends BaseAnnotation {
        readonly tag: 'maxLength';
        readonly value: number;
}

export interface PatternAnnotation extends BaseAnnotation {
        readonly tag: 'pattern' | 'regex';
        readonly pattern: string;
}

export interface FormatAnnotation extends BaseAnnotation {
        readonly tag: 'format';
        readonly format: string;
}

export interface EmailAnnotation extends BaseAnnotation {
        readonly tag: 'email';
}

export interface UuidAnnotation extends BaseAnnotation {
        readonly tag: 'uuid';
}

export interface UrlAnnotation extends BaseAnnotation {
        readonly tag: 'url';
}

export interface DescriptionAnnotation extends BaseAnnotation {
        readonly tag: 'description';
        readonly text: string;
}

export interface ValidatorAnnotation extends BaseAnnotation {
        readonly tag: 'validator';
        readonly name: string;
}

export interface TransformAnnotation extends BaseAnnotation {
        readonly tag: 'transform';
        readonly name: string;
}

export type ParsedAnnotation =
        | EntityAnnotation
        | PrimaryKeyAnnotation
        | UniqueAnnotation
        | IndexAnnotation
        | ForeignKeyAnnotation
        | DefaultAnnotation
        | RenameFromAnnotation
        | SqlTypeAnnotation
        | DecimalAnnotation
        | CheckAnnotation
        | VersionAnnotation
        | MinAnnotation
        | MaxAnnotation
        | IntAnnotation
        | MinLengthAnnotation
        | MaxLengthAnnotation
        | PatternAnnotation
        | FormatAnnotation
        | EmailAnnotation
        | UuidAnnotation
        | UrlAnnotation
        | DescriptionAnnotation
        | ValidatorAnnotation
        | TransformAnnotation;
