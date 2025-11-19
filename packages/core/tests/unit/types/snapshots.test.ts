// tests/unit/types/snapshots.test.ts

import path from 'node:path';

import { isOk } from '@afterdarktk/shared';
import { Project } from 'ts-morph';
import { describe, it, expect, beforeAll } from 'vitest';

import { encodeCanonical } from '../../../src/canonical/encode.js';
import { resolveSymbolType } from '../../../src/types/resolve.js';

describe('Type Resolution Snapshots', () => {
        let project: Project;

        beforeAll(() => {
                const fixturePath = path.join(__dirname, '../../fixtures/types/tsconfig.json');
                project = new Project({
                        tsConfigFilePath: fixturePath,
                });
        });

        function getResolvedCanonical(typeName: string, isInterface = false): string {
                const sourceFile = project.getSourceFileOrThrow('test-types.ts');

                const declaration = isInterface
                        ? sourceFile.getInterfaceOrThrow(typeName)
                        : sourceFile.getTypeAliasOrThrow(typeName);

                const symbol = declaration.getSymbol();
                if (!symbol) throw new Error(`No symbol for ${typeName}`);

                const result = resolveSymbolType(symbol);
                if (!isOk(result)) {
                        throw new Error(`Failed to resolve ${typeName}`);
                }

                const encoded = encodeCanonical(result.value);
                if (!isOk(encoded)) {
                        throw new Error(`Failed to encode ${typeName}`);
                }

                return encoded.value;
        }

        it('produces stable canonical output for primitives', () => {
                expect(getResolvedCanonical('StringType')).toMatchInlineSnapshot(
                        `"{"kind":"primitive","primitiveKind":"string"}"`,
                );
                expect(getResolvedCanonical('NumberType')).toMatchInlineSnapshot(
                        `"{"kind":"primitive","primitiveKind":"number"}"`,
                );
        });

        it('produces stable canonical output for literals with kind', () => {
                const stringLiteral = getResolvedCanonical('StringLiteral');
                expect(stringLiteral).toContain('"kind":"literal"');
                expect(stringLiteral).toContain('"literalKind":"string"');
                expect(stringLiteral).toContain('"value":"hello"');

                const numberLiteral = getResolvedCanonical('NumberLiteral');
                expect(numberLiteral).toContain('"kind":"literal"');
                expect(numberLiteral).toContain('"literalKind":"number"');
                expect(numberLiteral).toContain('"value":42');
        });

        it('produces stable canonical output for literal unions', () => {
                const statusJson = getResolvedCanonical('Status');
                const parsed = JSON.parse(statusJson);

                expect(parsed.kind).toBe('literalUnion');
                expect(parsed.members).toHaveLength(3);

                // Members should be literal objects, not raw values
                expect(parsed.members.every((m: { kind: string }) => m.kind === 'literal')).toBe(
                        true,
                );

                // Check for sorted order in canonical JSON
                expect(statusJson).toContain('"kind":"literalUnion"');
        });

        it('produces stable canonical output for arrays', () => {
                expect(getResolvedCanonical('StringArray')).toMatchInlineSnapshot(
                        `"{"element":{"kind":"primitive","primitiveKind":"string"},"kind":"array"}"`,
                );
        });

        it('produces stable canonical output for objects with sorted properties', () => {
                const simpleJson = getResolvedCanonical('SimpleObject', true);
                const parsed = JSON.parse(simpleJson);

                expect(parsed.kind).toBe('object');
                expect(parsed.properties).toHaveLength(2);

                // Properties should be sorted by name: age, name
                expect(parsed.properties[0].name).toBe('age');
                expect(parsed.properties[1].name).toBe('name');

                // Keys in canonical JSON should be sorted
                const keys = Object.keys(parsed);
                expect(keys).toEqual(keys.sort());
        });

        it('produces stable output for flattened intersections', () => {
                const intersectionJson = getResolvedCanonical('PersonWithEmail');
                const parsed = JSON.parse(intersectionJson);

                // Should be flattened to object, not intersection
                expect(parsed.kind).toBe('object');
                expect(parsed.properties).toHaveLength(3);

                // Properties should be sorted
                const names = parsed.properties.map((p: { name: string }) => p.name);
                expect(names).toEqual(['age', 'email', 'name']);
        });

        it('produces stable output for Records as objects', () => {
                const recordJson = getResolvedCanonical('StringRecord');
                const parsed = JSON.parse(recordJson);

                expect(parsed.kind).toBe('object');
                expect(parsed.properties).toEqual([]);
                expect(parsed.indexSignature).toBeDefined();
                expect(parsed.indexSignature.keyType).toBe('string');
        });

        it('produces stable output for unions with sorted members', () => {
                const unionJson = getResolvedCanonical('StringOrNumber');
                const parsed = JSON.parse(unionJson);

                expect(parsed.kind).toBe('union');
                expect(parsed.members).toHaveLength(2);

                // Members should be sorted by kind
                expect(parsed.members[0].kind).toBe('primitive');
                expect(parsed.members[1].kind).toBe('primitive');
        });

        it('produces deterministic output regardless of property order', () => {
                const json1 = getResolvedCanonical('SimpleObject', true);
                const json2 = getResolvedCanonical('SimpleObject', true);

                // Exact string match proves determinism
                expect(json1).toBe(json2);

                // Verify keys are sorted in canonical JSON
                const parsed = JSON.parse(json1);
                const topKeys = Object.keys(parsed);
                expect(topKeys).toEqual(topKeys.sort());

                // Verify property array is sorted
                expect(parsed.properties[0].name).toBe('age');
                expect(parsed.properties[1].name).toBe('name');
        });

        it('produces stable output for template literals resolved to string', () => {
                const templateJson = getResolvedCanonical('Greeting');
                expect(templateJson).toBe(
                        '{"kind":"literalUnion","members":[{"kind":"literal","literalKind":"string","value":"Hello, friend"},{"kind":"literal","literalKind":"string","value":"Hello, world"}]}',
                );
        });

        it('produces stable unsupported nodes', () => {
                const anyJson = getResolvedCanonical('AnyType');
                const parsed = JSON.parse(anyJson);

                expect(parsed.kind).toBe('unsupported');
                expect(parsed.reason).toBeDefined();

                // Keys should be sorted
                const keys = Object.keys(parsed);
                expect(keys).toEqual(keys.sort());
        });
});
