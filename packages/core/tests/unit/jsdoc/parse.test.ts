// tests/unit/jsdoc/parse.test.ts

import type { JsDocTagName, SymbolId } from '@afterdarktk/shared';
import { describe, it, expect } from 'vitest';

import { parseJsDocAnnotations, type RawSymbol } from '../../../src/jsdoc/parse.js';
import { CORE_TAGS } from '../../../src/jsdoc/tags.js';

function makeRawSymbol(symbolId: string, tags: Array<[string, string]>): RawSymbol {
        return {
                symbolId: symbolId as SymbolId,
                tags: tags.map(([name, text]) => ({ name: name as JsDocTagName, text })),
        };
}

describe('parseJsDocAnnotations', () => {
        it('parses entity annotation without name', () => {
                const symbols = new Map([
                        ['User' as SymbolId, makeRawSymbol('User', [['entity', '']])],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User' as SymbolId)).toEqual([{ tag: 'entity' }]);
        });

        it('parses entity annotation with name', () => {
                const symbols = new Map([
                        ['User' as SymbolId, makeRawSymbol('User', [['entity', 'users']])],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User' as SymbolId)).toEqual([
                        { tag: 'entity', name: 'users' },
                ]);
        });

        it('discovers entity tags in tagIndex', () => {
                const symbols = new Map([
                        ['User' as SymbolId, makeRawSymbol('User', [['entity', '']])],
                        ['Post' as SymbolId, makeRawSymbol('Post', [['entity', 'posts']])],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.tagIndex.get(CORE_TAGS.ENTITY)).toEqual([
                        'User' as SymbolId,
                        'Post' as SymbolId,
                ]);
        });

        it('parses primary key annotation', () => {
                const symbols = new Map([
                        ['User.id' as SymbolId, makeRawSymbol('User.id', [['pk', '']])],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User.id' as SymbolId)).toEqual([{ tag: 'pk' }]);
        });

        it('parses unique annotation', () => {
                const symbols = new Map([
                        ['User.email' as SymbolId, makeRawSymbol('User.email', [['unique', '']])],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User.email' as SymbolId)).toEqual([
                        { tag: 'unique' },
                ]);
        });

        it('parses index annotation', () => {
                const symbols = new Map([
                        ['User' as SymbolId, makeRawSymbol('User', [['index', 'name,email']])],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User' as SymbolId)).toEqual([
                        { tag: 'index', fields: ['name', 'email'], unique: false },
                ]);
        });

        it('parses unique index annotation', () => {
                const symbols = new Map([
                        ['User' as SymbolId, makeRawSymbol('User', [['index', 'email:unique']])],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User' as SymbolId)).toEqual([
                        { tag: 'index', fields: ['email'], unique: true },
                ]);
        });

        it('parses foreign key annotation', () => {
                const symbols = new Map([
                        [
                                'Post.userId' as SymbolId,
                                makeRawSymbol('Post.userId', [['fk', 'User.id cascade:restrict']]),
                        ],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('Post.userId' as SymbolId)).toEqual([
                        {
                                tag: 'fk',
                                target: 'User',
                                field: 'id',
                                onDelete: 'cascade',
                                onUpdate: 'restrict',
                        },
                ]);
        });

        it('parses foreign key annotation without actions', () => {
                const symbols = new Map([
                        [
                                'Post.userId' as SymbolId,
                                makeRawSymbol('Post.userId', [['fk', 'User.id']]),
                        ],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('Post.userId' as SymbolId)).toEqual([
                        { tag: 'fk', target: 'User', field: 'id' },
                ]);
        });

        it('parses default annotation', () => {
                const symbols = new Map([
                        [
                                'User.role' as SymbolId,
                                makeRawSymbol('User.role', [['default', "'user'"]]),
                        ],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User.role' as SymbolId)).toEqual([
                        { tag: 'default', value: "'user'" },
                ]);
        });

        it('parses renameFrom annotation', () => {
                const symbols = new Map([
                        [
                                'User.name' as SymbolId,
                                makeRawSymbol('User.name', [['renameFrom', 'username@1.0.0']]),
                        ],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User.name' as SymbolId)).toEqual([
                        { tag: 'renameFrom', oldName: 'username', version: '1.0.0' },
                ]);
        });

        it('parses sqlType annotation', () => {
                const symbols = new Map([
                        [
                                'User.data' as SymbolId,
                                makeRawSymbol('User.data', [['sqlType', 'jsonb']]),
                        ],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User.data' as SymbolId)).toEqual([
                        { tag: 'sqlType', type: 'jsonb' },
                ]);
        });

        it('parses decimal annotation', () => {
                const symbols = new Map([
                        [
                                'Product.price' as SymbolId,
                                makeRawSymbol('Product.price', [['decimal', '10,2']]),
                        ],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('Product.price' as SymbolId)).toEqual([
                        { tag: 'decimal', precision: 10, scale: 2 },
                ]);
        });

        it('parses min/max annotations', () => {
                const symbols = new Map([
                        [
                                'User.age' as SymbolId,
                                makeRawSymbol('User.age', [
                                        ['min', '0'],
                                        ['max', '120'],
                                ]),
                        ],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User.age' as SymbolId)).toEqual([
                        { tag: 'min', value: 0 },
                        { tag: 'max', value: 120 },
                ]);
        });

        it('parses int annotation', () => {
                const symbols = new Map([
                        ['User.age' as SymbolId, makeRawSymbol('User.age', [['int', '']])],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User.age' as SymbolId)).toEqual([{ tag: 'int' }]);
        });

        it('parses minLength/maxLength annotations', () => {
                const symbols = new Map([
                        [
                                'User.name' as SymbolId,
                                makeRawSymbol('User.name', [
                                        ['minLength', '2'],
                                        ['maxLength', '50'],
                                ]),
                        ],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User.name' as SymbolId)).toEqual([
                        { tag: 'minLength', value: 2 },
                        { tag: 'maxLength', value: 50 },
                ]);
        });

        it('parses pattern annotation', () => {
                const symbols = new Map([
                        [
                                'User.phone' as SymbolId,
                                makeRawSymbol('User.phone', [['pattern', '^\\d{10}$']]),
                        ],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User.phone' as SymbolId)).toEqual([
                        { tag: 'pattern', pattern: '^\\d{10}$' },
                ]);
        });

        it('parses format annotation', () => {
                const symbols = new Map([
                        [
                                'User.createdAt' as SymbolId,
                                makeRawSymbol('User.createdAt', [['format', 'date-time']]),
                        ],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User.createdAt' as SymbolId)).toEqual([
                        { tag: 'format', format: 'date-time' },
                ]);
        });

        it('parses email/uuid/url shorthand annotations', () => {
                const symbols = new Map([
                        ['User.email' as SymbolId, makeRawSymbol('User.email', [['email', '']])],
                        ['User.id' as SymbolId, makeRawSymbol('User.id', [['uuid', '']])],
                        ['User.website' as SymbolId, makeRawSymbol('User.website', [['url', '']])],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User.email' as SymbolId)).toEqual([
                        { tag: 'email' },
                ]);
                expect(result.annotations.get('User.id' as SymbolId)).toEqual([{ tag: 'uuid' }]);
                expect(result.annotations.get('User.website' as SymbolId)).toEqual([
                        { tag: 'url' },
                ]);
        });

        it('parses validator and transform annotations', () => {
                const symbols = new Map([
                        [
                                'User.email' as SymbolId,
                                makeRawSymbol('User.email', [['validator', 'emailValidator']]),
                        ],
                        [
                                'User.name' as SymbolId,
                                makeRawSymbol('User.name', [['transform', 'lowercase']]),
                        ],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User.email' as SymbolId)).toEqual([
                        { tag: 'validator', name: 'emailValidator' },
                ]);
                expect(result.annotations.get('User.name' as SymbolId)).toEqual([
                        { tag: 'transform', name: 'lowercase' },
                ]);
        });

        it('rejects unknown tags with warning', () => {
                const symbols = new Map([
                        ['User' as SymbolId, makeRawSymbol('User', [['unknownTag', 'value']])],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(1);
                expect(result.diagnostics[0]?.code).toBe('ADTK-IR-3001');
                expect(result.diagnostics[0]?.category).toBe('warning');
        });

        it('rejects missing required payload', () => {
                const symbols = new Map([
                        ['User' as SymbolId, makeRawSymbol('User', [['index', '']])],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(1);
                expect(result.diagnostics[0]?.code).toBe('ADTK-IR-3003');
        });

        it('rejects invalid payload format', () => {
                const symbols = new Map([
                        [
                                'Product.price' as SymbolId,
                                makeRawSymbol('Product.price', [['decimal', 'invalid']]),
                        ],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(1);
                expect(result.diagnostics[0]?.code).toBe('ADTK-IR-3004');
        });

        it('rejects duplicate tags', () => {
                const symbols = new Map([
                        [
                                'User.id' as SymbolId,
                                makeRawSymbol('User.id', [
                                        ['pk', ''],
                                        ['pk', ''],
                                ]),
                        ],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(1);
                expect(result.diagnostics[0]?.code).toBe('ADTK-IR-3007');
        });

        it('handles multiple valid annotations on one symbol', () => {
                const symbols = new Map([
                        [
                                'User.email' as SymbolId,
                                makeRawSymbol('User.email', [
                                        ['unique', ''],
                                        ['email', ''],
                                        ['maxLength', '255'],
                                ]),
                        ],
                ]);

                const result = parseJsDocAnnotations(symbols);

                expect(result.diagnostics).toHaveLength(0);
                expect(result.annotations.get('User.email' as SymbolId)).toEqual([
                        { tag: 'unique' },
                        { tag: 'email' },
                        { tag: 'maxLength', value: 255 },
                ]);
        });
});
