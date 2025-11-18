// tests/pipe/extract.test.ts

import * as path from 'node:path';

import { describe, it, expect } from 'vitest';

import { extractProgramIR } from '../../src/pipe/extract.js';
import { isOk, isErr } from '../../src/shared/result.js';

describe('extractProgramIR', () => {
        const fixturePath = path.resolve(__dirname, '../fixtures/e2e/simple-schema');
        const tsconfigPath = path.join(fixturePath, 'tsconfig.json');

        it('should extract IR from simple schema', async () => {
                const result = await extractProgramIR({ tsconfigPath });

                if (!isOk(result)) {
                        console.error('Extraction failed with diagnostics:', result.diagnostics);
                }

                expect(isOk(result)).toBe(true);
                if (!isOk(result)) return;

                const { ir, diagnostics } = result.value;

                // Should have 4 entities
                expect(ir.entities.size).toBe(4);

                // Check entity names
                const entityNames = Array.from(ir.entities.values()).map((e) => e.name);
                expect(entityNames.sort()).toEqual(['Comment', 'Post', 'Product', 'User']);

                // All entities should have corresponding IR nodes
                expect(ir.nodes.size).toBe(4);

                // Check User entity structure
                const userEntity = Array.from(ir.entities.values()).find((e) => e.name === 'User');
                expect(userEntity).toBeDefined();
                expect(userEntity?.node.kind).toBe('object');

                if (userEntity?.node.kind === 'object') {
                        const props = userEntity.node.properties;
                        expect(props.length).toBeGreaterThan(0);

                        // Check for id property
                        const idProp = props.find((p) => p.name === 'id');
                        expect(idProp).toBeDefined();
                        expect(idProp?.optional).toBe(false);

                        // Property-level annotations are not yet extracted in this phase
                        // TODO: Add property-level annotation extraction in future phase

                        // Check for email property
                        const emailProp = props.find((p) => p.name === 'email');
                        expect(emailProp).toBeDefined();

                        // Check role property is a literal union
                        const roleProp = props.find((p) => p.name === 'role');
                        expect(roleProp).toBeDefined();
                        expect(roleProp?.type.kind).toBe('literalUnion');

                        if (roleProp?.type.kind === 'literalUnion') {
                                const values = roleProp.type.members.map((m) => m.value);
                                expect(values.sort()).toEqual(['admin', 'guest', 'user']);
                        }
                }

                // Check Post entity structure
                const postEntity = Array.from(ir.entities.values()).find((e) => e.name === 'Post');
                expect(postEntity).toBeDefined();

                if (postEntity?.node.kind === 'object') {
                        const userIdProp = postEntity.node.properties.find(
                                (p) => p.name === 'userId',
                        );
                        expect(userIdProp).toBeDefined();

                        // Property-level FK annotations not yet extracted
                        // TODO: Add property-level annotation extraction

                        // Check tags array
                        const tagsProp = postEntity.node.properties.find((p) => p.name === 'tags');
                        expect(tagsProp).toBeDefined();
                        expect(tagsProp?.type.kind).toBe('array');

                        // Check metadata Record type
                        const metadataProp = postEntity.node.properties.find(
                                (p) => p.name === 'metadata',
                        );
                        expect(metadataProp).toBeDefined();
                        expect(metadataProp?.optional).toBe(true);
                        expect(metadataProp?.type.kind).toBe('object');

                        if (metadataProp?.type.kind === 'object') {
                                expect(metadataProp.type.indexSignature).toBeDefined();
                                expect(metadataProp.type.indexSignature?.keyType).toBe('string');
                        }
                }

                // Check Comment entity has nested object
                const commentEntity = Array.from(ir.entities.values()).find(
                        (e) => e.name === 'Comment',
                );
                expect(commentEntity).toBeDefined();

                if (commentEntity?.node.kind === 'object') {
                        const nestedProp = commentEntity.node.properties.find(
                                (p) => p.name === 'nested',
                        );
                        expect(nestedProp).toBeDefined();
                        expect(nestedProp?.type.kind).toBe('object');

                        if (nestedProp?.type.kind === 'object') {
                                const levelProp = nestedProp.type.properties.find(
                                        (p) => p.name === 'level',
                                );
                                const dataProp = nestedProp.type.properties.find(
                                        (p) => p.name === 'data',
                                );
                                expect(levelProp).toBeDefined();
                                expect(dataProp).toBeDefined();
                                expect(dataProp?.type.kind).toBe('object');
                        }
                }

                // Check Product entity has tuple
                const productEntity = Array.from(ir.entities.values()).find(
                        (e) => e.name === 'Product',
                );
                expect(productEntity).toBeDefined();

                if (productEntity?.node.kind === 'object') {
                        const dimensionsProp = productEntity.node.properties.find(
                                (p) => p.name === 'dimensions',
                        );
                        expect(dimensionsProp).toBeDefined();
                        expect(dimensionsProp?.type.kind).toBe('tuple');

                        if (dimensionsProp?.type.kind === 'tuple') {
                                expect(dimensionsProp.type.elements.length).toBe(3);
                        }

                        // Property-level decimal annotations not yet extracted
                        // TODO: Add property-level annotation extraction
                }

                // Diagnostics should only contain warnings or info (no errors for valid schema)
                const errors = diagnostics.filter((d) => d.category === 'error');
                expect(errors.length).toBe(0);
        });

        it('should produce deterministic output', async () => {
                const result1 = await extractProgramIR({ tsconfigPath });
                const result2 = await extractProgramIR({ tsconfigPath });

                expect(isOk(result1)).toBe(true);
                expect(isOk(result2)).toBe(true);

                if (!isOk(result1) || !isOk(result2)) return;

                // Serialize and compare
                const json1 = JSON.stringify(result1.value.ir, null, 2);
                const json2 = JSON.stringify(result2.value.ir, null, 2);

                expect(json1).toBe(json2);
        }, 10000);

        it('should handle missing tsconfig', async () => {
                const result = await extractProgramIR({
                        tsconfigPath: '/nonexistent/tsconfig.json',
                });

                expect(isErr(result)).toBe(true);
                if (!isErr(result)) return;

                expect(result.diagnostics.length).toBeGreaterThan(0);
                expect(result.diagnostics[0]?.category).toBe('error');
        });

        it('should collect entity-level annotations', async () => {
                const result = await extractProgramIR({ tsconfigPath });

                expect(isOk(result)).toBe(true);
                if (!isOk(result)) return;

                const userEntity = Array.from(result.value.ir.entities.values()).find(
                        (e) => e.name === 'User',
                );
                expect(userEntity).toBeDefined();

                const versionAnnotation = userEntity?.annotations.find((a) => a.tag === 'version');
                expect(versionAnnotation).toBeDefined();

                if (versionAnnotation?.tag === 'version') {
                        expect(versionAnnotation.semver).toBe('1.0.0');
                }

                const postEntity = Array.from(result.value.ir.entities.values()).find(
                        (e) => e.name === 'Post',
                );
                expect(postEntity).toBeDefined();

                const indexAnnotations = postEntity?.annotations.filter((a) => a.tag === 'index');
                expect(indexAnnotations?.length).toBe(2);
        });
});
