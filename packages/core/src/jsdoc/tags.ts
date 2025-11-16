// src/jsdoc/tags.ts

export const CORE_TAGS = {
        // Entity & schema
        ENTITY: 'entity',
        PK: 'pk',
        UNIQUE: 'unique',
        INDEX: 'index',
        FK: 'fk',
        DEFAULT: 'default',
        RENAME_FROM: 'renameFrom',
        SQL_TYPE: 'sqlType',
        DECIMAL: 'decimal',
        CHECK: 'check',
        VERSION: 'version',

        // Validation constraints
        MIN: 'min',
        MAX: 'max',
        INT: 'int',
        MIN_LENGTH: 'minLength',
        MAX_LENGTH: 'maxLength',
        PATTERN: 'pattern',
        REGEX: 'regex',
        FORMAT: 'format',
        EMAIL: 'email',
        UUID: 'uuid',
        URL: 'url',
        DESCRIPTION: 'description',
        VALIDATOR: 'validator',
        TRANSFORM: 'transform',
} as const;

export type CoreTagName = (typeof CORE_TAGS)[keyof typeof CORE_TAGS];

export const ALL_CORE_TAG_NAMES: ReadonlySet<CoreTagName> = new Set(Object.values(CORE_TAGS));

export interface TagGrammar {
        readonly name: CoreTagName;
        readonly payloadRequired: boolean;
        readonly pattern?: RegExp;
        readonly description: string;
}

export const TAG_GRAMMARS: ReadonlyMap<CoreTagName, TagGrammar> = new Map([
        [
                CORE_TAGS.ENTITY,
                {
                        name: CORE_TAGS.ENTITY,
                        payloadRequired: false,
                        description: 'Marks interface as database entity',
                },
        ],
        [
                CORE_TAGS.PK,
                {
                        name: CORE_TAGS.PK,
                        payloadRequired: false,
                        description: 'Marks field as primary key',
                },
        ],
        [
                CORE_TAGS.UNIQUE,
                {
                        name: CORE_TAGS.UNIQUE,
                        payloadRequired: false,
                        description: 'Marks field as unique constraint',
                },
        ],
        [
                CORE_TAGS.INDEX,
                {
                        name: CORE_TAGS.INDEX,
                        payloadRequired: true,
                        pattern: /^[\w,]+(?::unique)?$/,
                        description: 'Index definition: fields[:unique]',
                },
        ],
        [
                CORE_TAGS.FK,
                {
                        name: CORE_TAGS.FK,
                        payloadRequired: true,
                        pattern: /^[\w.]+(?:\s+\w+:\w+)?$/,
                        description: 'Foreign key: target.field [onDelete:onUpdate]',
                },
        ],
        [
                CORE_TAGS.DEFAULT,
                {
                        name: CORE_TAGS.DEFAULT,
                        payloadRequired: true,
                        description: 'Default value expression',
                },
        ],
        [
                CORE_TAGS.RENAME_FROM,
                {
                        name: CORE_TAGS.RENAME_FROM,
                        payloadRequired: true,
                        pattern: /^\w+(?:@[\d.]+)?$/,
                        description: 'Rename hint: oldName[@version]',
                },
        ],
        [
                CORE_TAGS.SQL_TYPE,
                {
                        name: CORE_TAGS.SQL_TYPE,
                        payloadRequired: true,
                        description: 'Override SQL type',
                },
        ],
        [
                CORE_TAGS.DECIMAL,
                {
                        name: CORE_TAGS.DECIMAL,
                        payloadRequired: true,
                        pattern: /^\d+,\d+$/,
                        description: 'Decimal precision: precision,scale',
                },
        ],
        [
                CORE_TAGS.CHECK,
                {
                        name: CORE_TAGS.CHECK,
                        payloadRequired: true,
                        description: 'SQL check constraint expression',
                },
        ],
        [
                CORE_TAGS.VERSION,
                {
                        name: CORE_TAGS.VERSION,
                        payloadRequired: true,
                        pattern: /^\d+\.\d+\.\d+(?:-[\w.]+)?$/,
                        description: 'Schema version (semver)',
                },
        ],
        [
                CORE_TAGS.MIN,
                {
                        name: CORE_TAGS.MIN,
                        payloadRequired: true,
                        pattern: /^-?\d+(?:\.\d+)?$/,
                        description: 'Minimum numeric value',
                },
        ],
        [
                CORE_TAGS.MAX,
                {
                        name: CORE_TAGS.MAX,
                        payloadRequired: true,
                        pattern: /^-?\d+(?:\.\d+)?$/,
                        description: 'Maximum numeric value',
                },
        ],
        [
                CORE_TAGS.INT,
                {
                        name: CORE_TAGS.INT,
                        payloadRequired: false,
                        description: 'Integer-only constraint',
                },
        ],
        [
                CORE_TAGS.MIN_LENGTH,
                {
                        name: CORE_TAGS.MIN_LENGTH,
                        payloadRequired: true,
                        pattern: /^\d+$/,
                        description: 'Minimum string/array length',
                },
        ],
        [
                CORE_TAGS.MAX_LENGTH,
                {
                        name: CORE_TAGS.MAX_LENGTH,
                        payloadRequired: true,
                        pattern: /^\d+$/,
                        description: 'Maximum string/array length',
                },
        ],
        [
                CORE_TAGS.PATTERN,
                {
                        name: CORE_TAGS.PATTERN,
                        payloadRequired: true,
                        description: 'Regex pattern for string',
                },
        ],
        [
                CORE_TAGS.REGEX,
                {
                        name: CORE_TAGS.REGEX,
                        payloadRequired: true,
                        description: 'Regex pattern for string (alias)',
                },
        ],
        [
                CORE_TAGS.FORMAT,
                {
                        name: CORE_TAGS.FORMAT,
                        payloadRequired: true,
                        pattern: /^[\w-]+$/,
                        description: 'String format (email, uuid, url, date-time, etc.)',
                },
        ],
        [
                CORE_TAGS.EMAIL,
                {
                        name: CORE_TAGS.EMAIL,
                        payloadRequired: false,
                        description: 'Email format constraint',
                },
        ],
        [
                CORE_TAGS.UUID,
                {
                        name: CORE_TAGS.UUID,
                        payloadRequired: false,
                        description: 'UUID format constraint',
                },
        ],
        [
                CORE_TAGS.URL,
                {
                        name: CORE_TAGS.URL,
                        payloadRequired: false,
                        description: 'URL format constraint',
                },
        ],
        [
                CORE_TAGS.DESCRIPTION,
                {
                        name: CORE_TAGS.DESCRIPTION,
                        payloadRequired: true,
                        description: 'Documentation text',
                },
        ],
        [
                CORE_TAGS.VALIDATOR,
                {
                        name: CORE_TAGS.VALIDATOR,
                        payloadRequired: true,
                        pattern: /^\w+$/,
                        description: 'Custom validator name',
                },
        ],
        [
                CORE_TAGS.TRANSFORM,
                {
                        name: CORE_TAGS.TRANSFORM,
                        payloadRequired: true,
                        pattern: /^\w+$/,
                        description: 'Custom transformer name',
                },
        ],
]);

Object.freeze(CORE_TAGS);
Object.freeze(ALL_CORE_TAG_NAMES);
Object.freeze(TAG_GRAMMARS);
