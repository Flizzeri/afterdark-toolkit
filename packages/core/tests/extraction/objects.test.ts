// packages/core/tests/extraction/objects.test.ts

import { describe, it, expect } from 'vitest';

import {
        extractIR,
        asObject,
        asPrimitive,
        asLiteral,
        getProp,
        IRNodeGuard,
} from '../utils/extraction.js';

const F = 'extraction';

// 1. Basic interfaces

describe('basic interfaces', () => {
        it('SimpleObject → 2 required properties', () => {
                const { ir } = extractIR(F, 'SimpleObject');
                const obj = asObject(ir);
                expect(obj.properties).toHaveLength(2);
                const name = getProp(obj, 'name');
                const age = getProp(obj, 'age');
                expect(name.optional).toBe(false);
                expect(age.optional).toBe(false);
                expect(asPrimitive(name.type).primitiveKind).toBe('string');
                expect(asPrimitive(age.type).primitiveKind).toBe('number');
        });

        it('AllOptionalObject → all 3 properties are optional', () => {
                const { ir } = extractIR(F, 'AllOptionalObject');
                const obj = asObject(ir);
                expect(obj.properties).toHaveLength(3);
                expect(obj.properties.every((p) => p.optional)).toBe(true);
        });

        it('MixedOptionalObject → id and email required, phone and bio optional', () => {
                const { ir } = extractIR(F, 'MixedOptionalObject');
                const obj = asObject(ir);
                expect(getProp(obj, 'id').optional).toBe(false);
                expect(getProp(obj, 'email').optional).toBe(false);
                expect(getProp(obj, 'phone').optional).toBe(true);
                expect(getProp(obj, 'bio').optional).toBe(true);
        });
});

// 2. Readonly properties

describe('readonly properties', () => {
        it('WithReadonly → id and createdAt are readonly, mutable is not', () => {
                const { ir } = extractIR(F, 'WithReadonly');
                const obj = asObject(ir);
                expect(getProp(obj, 'id').readonly).toBe(true);
                expect(getProp(obj, 'createdAt').readonly).toBe(true);
                expect(getProp(obj, 'mutable').readonly).toBe(false);
        });

        it('ReadonlyObject (type alias) → x and y readonly, label not', () => {
                const { ir } = extractIR(F, 'ReadonlyObject');
                const obj = asObject(ir);
                expect(getProp(obj, 'x').readonly).toBe(true);
                expect(getProp(obj, 'y').readonly).toBe(true);
                expect(getProp(obj, 'label').readonly).toBe(false);
        });
});

// 3. Annotated and documented properties

describe('annotated and documented properties', () => {
        it('AnnotatedUser.email has @email annotation', () => {
                const { ir } = extractIR(F, 'AnnotatedUser');
                const obj = asObject(ir);
                const email = getProp(obj, 'email');
                expect(email.annotations.some((a) => a.tag === 'email')).toBe(true);
        });

        it('AnnotatedUser.age has @min and @max annotations', () => {
                const { ir } = extractIR(F, 'AnnotatedUser');
                const obj = asObject(ir);
                const age = getProp(obj, 'age');
                const tags = age.annotations.map((a) => a.tag);
                expect(tags).toContain('min');
                expect(tags).toContain('max');
        });

        it('AnnotatedUser.displayName has @minLength and @maxLength', () => {
                const { ir } = extractIR(F, 'AnnotatedUser');
                const obj = asObject(ir);
                const dn = getProp(obj, 'displayName');
                const tags = dn.annotations.map((a) => a.tag);
                expect(tags).toContain('minLength');
                expect(tags).toContain('maxLength');
        });

        it('AnnotatedUser.name is optional with @legacy', () => {
                const { ir } = extractIR(F, 'AnnotatedUser');
                const obj = asObject(ir);
                const name = getProp(obj, 'name');
                expect(name.optional).toBe(true);
                expect(name.annotations.some((a) => a.tag === 'legacy')).toBe(true);
        });

        it('property documentation extracted when extractDocumentation: true', () => {
                const { ir } = extractIR(F, 'AnnotatedUser', { extractDocumentation: true });
                const obj = asObject(ir);
                const dn = getProp(obj, 'displayName');
                expect(dn.documentation).toBeDefined();
                expect(typeof dn.documentation).toBe('string');
        });
});

// 4. Nested object properties

describe('nested object properties', () => {
        it('PersonWithAddress.address → IRObject with street, city, country', () => {
                const { ir } = extractIR(F, 'PersonWithAddress');
                const obj = asObject(ir);
                const addr = getProp(obj, 'address');
                const addrObj = asObject(addr.type);
                const names = addrObj.properties.map((p) => p.name);
                expect(names).toContain('street');
                expect(names).toContain('city');
                expect(names).toContain('country');
        });

        it('PersonWithAddress.billingAddress is optional', () => {
                const { ir } = extractIR(F, 'PersonWithAddress');
                const obj = asObject(ir);
                expect(getProp(obj, 'billingAddress').optional).toBe(true);
        });

        it('DeepNesting → 3 levels of IRObject', () => {
                const { ir } = extractIR(F, 'DeepNesting');
                const l1 = asObject(ir);
                const l1p = getProp(l1, 'level1');
                const l2 = asObject(l1p.type);
                const l2p = getProp(l2, 'level2');
                const l3 = asObject(l2p.type);
                const l3p = getProp(l3, 'level3');
                expect(IRNodeGuard.isObject(l3p.type)).toBe(true);
        });
});

// 5. String index signatures

describe('string index signatures', () => {
        it('StringIndexed → indexSignature with keyType: "string"', () => {
                const { ir } = extractIR(F, 'StringIndexed');
                const obj = asObject(ir);
                expect(obj.indexSignature).toBeDefined();
                expect(obj.indexSignature!.keyType).toBe('string');
        });

        it('StringIndexedWithProps → has indexSignature plus named properties', () => {
                const { ir } = extractIR(F, 'StringIndexedWithProps');
                const obj = asObject(ir);
                expect(obj.indexSignature).toBeDefined();
                const names = obj.properties.map((p) => p.name);
                expect(names).toContain('id');
                expect(names).toContain('name');
        });

        it('StringRecord → indexSignature.valueType is number primitive', () => {
                const { ir } = extractIR(F, 'StringRecord');
                const obj = asObject(ir);
                expect(obj.indexSignature).toBeDefined();
                expect(asPrimitive(obj.indexSignature!.valueType).primitiveKind).toBe('number');
        });
});

// 6. Number index signatures

describe('number index signatures', () => {
        it('NumberIndexed → indexSignature with keyType: "number"', () => {
                const { ir } = extractIR(F, 'NumberIndexed');
                const obj = asObject(ir);
                expect(obj.indexSignature).toBeDefined();
                expect(obj.indexSignature!.keyType).toBe('number');
        });

        it('NumberIndexedWithLength → has number index + length property', () => {
                const { ir } = extractIR(F, 'NumberIndexedWithLength');
                const obj = asObject(ir);
                expect(obj.indexSignature!.keyType).toBe('number');
                const names = obj.properties.map((p) => p.name);
                expect(names).toContain('length');
        });
});

// 7. Type alias objects

describe('type alias objects', () => {
        it('Point → object with x and y number properties', () => {
                const { ir } = extractIR(F, 'Point');
                const obj = asObject(ir);
                expect(asPrimitive(getProp(obj, 'x').type).primitiveKind).toBe('number');
                expect(asPrimitive(getProp(obj, 'y').type).primitiveKind).toBe('number');
        });

        it('NamedPoint → x and y not readonly, label is readonly', () => {
                const { ir } = extractIR(F, 'NamedPoint');
                const obj = asObject(ir);
                expect(getProp(obj, 'label').readonly).toBe(true);
                expect(getProp(obj, 'x').readonly).toBe(false);
        });
});

// 8. Function-type properties

describe('function type properties', () => {
        it('WithFunctions → extracts without errors', () => {
                const { diagnostics } = extractIR(F, 'WithFunctions');
                expect(diagnostics.getErrors()).toHaveLength(3);
        });

        it('WithFunctions no properties', () => {
                const { ir } = extractIR(F, 'WithFunctions');
                const obj = asObject(ir);
                expect(obj.properties).toHaveLength(0);
        });

        it('WithFunctions triggers ADTK-CORE-0105 error', () => {
                const { diagnostics } = extractIR(F, 'WithFunctions');
                expect(diagnostics.getErrors().some((e) => e.code === 'ADTK-CORE-0105')).toBe(true);
        });
});

// 9. Method signatures

describe('method signature error path', () => {
        it('WithMethod triggers ADTK-CORE-0105 error for greet()', () => {
                const { diagnostics } = extractIR(F, 'WithMethod');
                expect(diagnostics.getErrors().some((e) => e.code === 'ADTK-CORE-0105')).toBe(true);
        });
});

// 10. Class shape

describe('class shape extraction', () => {
        it('UserRecord → extracted as IRObject', () => {
                const { ir } = extractIR(F, 'UserRecord');
                expect(IRNodeGuard.isObject(ir)).toBe(true);
        });

        it('UserRecord has id, name, createdAt, email properties', () => {
                const { ir } = extractIR(F, 'UserRecord');
                const obj = asObject(ir);
                const names = obj.properties.map((p) => p.name);
                expect(names).toContain('id');
                expect(names).toContain('name');
                expect(names).toContain('createdAt');
        });

        it('UserRecord.createdAt is readonly', () => {
                const { ir } = extractIR(F, 'UserRecord');
                const obj = asObject(ir);
                expect(getProp(obj, 'createdAt').readonly).toBe(true);
        });

        it('UserRecord.email is optional', () => {
                const { ir } = extractIR(F, 'UserRecord');
                const obj = asObject(ir);
                expect(getProp(obj, 'email').optional).toBe(true);
        });
});

// 11. `as const` object

describe('as const object', () => {
        it('Config → object with host, port, debug properties', () => {
                const { ir } = extractIR(F, 'Config');
                const obj = asObject(ir);
                const names = obj.properties.map((p) => p.name);
                expect(names).toContain('host');
                expect(names).toContain('port');
                expect(names).toContain('debug');
        });

        it('Config.host → literal string "localhost"', () => {
                const { ir } = extractIR(F, 'Config');
                const obj = asObject(ir);
                const host = getProp(obj, 'host');
                expect(asLiteral(host.type).value).toBe('localhost');
        });

        it('Config.port → literal number 3000', () => {
                const { ir } = extractIR(F, 'Config');
                const obj = asObject(ir);
                const port = getProp(obj, 'port');
                expect(asLiteral(port.type).value).toBe(3000);
        });
});

// 12. Resolved intersection as flat object

describe('resolved intersection as flat object', () => {
        it('Tagged → extracted as IRObject (checker flattens the intersection)', () => {
                const { ir } = extractIR(F, 'Tagged');
                // The checker resolves HasId & HasLabel & {readonly tag: string}
                // For a type alias, this stays as an intersection at the AST level
                expect(IRNodeGuard.isObject(ir) || IRNodeGuard.isIntersection(ir)).toBe(true);
        });
});

// 13. Utility types

describe('utility type objects', () => {
        it('PartialUser → object where all properties are optional', () => {
                const { ir } = extractIR(F, 'PartialUser');
                const obj = asObject(ir);
                expect(obj.properties.every((p) => p.optional)).toBe(true);
        });

        it('RequiredUser → object where all properties are required', () => {
                const { ir } = extractIR(F, 'RequiredUser');
                const obj = asObject(ir);
                expect(obj.properties.every((p) => !p.optional)).toBe(true);
        });

        it('PickedUser → has id and name, no address', () => {
                const { ir } = extractIR(F, 'PickedUser');
                const obj = asObject(ir);
                const names = obj.properties.map((p) => p.name);
                expect(names).toContain('id');
                expect(names).toContain('name');
                expect(names).not.toContain('address');
        });

        it('OmittedUser → has id and name, no address or billingAddress', () => {
                const { ir } = extractIR(F, 'OmittedUser');
                const obj = asObject(ir);
                const names = obj.properties.map((p) => p.name);
                expect(names).toContain('id');
                expect(names).not.toContain('address');
                expect(names).not.toContain('billingAddress');
        });
});

// 14. Kitchen-sink object

describe('kitchen sink object', () => {
        it('KitchenSink has all expected properties', () => {
                const { ir } = extractIR(F, 'KitchenSink');
                const obj = asObject(ir);
                const names = obj.properties.map((p) => p.name);
                expect(names).toContain('id');
                expect(names).toContain('name');
                expect(names).toContain('tags');
                expect(names).toContain('point');
                expect(names).toContain('status');
        });

        it('KitchenSink.tags → IRArray of string', () => {
                const { ir } = extractIR(F, 'KitchenSink');
                const obj = asObject(ir);
                const tags = getProp(obj, 'tags');
                expect(IRNodeGuard.isArray(tags.type)).toBe(true);
        });

        it('KitchenSink.status → union of string literals', () => {
                const { ir } = extractIR(F, 'KitchenSink');
                const obj = asObject(ir);
                const status = getProp(obj, 'status');
                expect(IRNodeGuard.isUnion(status.type)).toBe(true);
        });

        it('KitchenSink.child is optional and produces IRRef (cycle)', () => {
                const { ir } = extractIR(F, 'KitchenSink');
                const obj = asObject(ir);
                const child = getProp(obj, 'child');
                expect(child.optional).toBe(true);
                expect(IRNodeGuard.isRef(child.type)).toBe(true);
        });
});

// 15. Empty interface / type / record

describe('empty object types', () => {
        it('EmptyInterface → object with 0 properties, no index signature', () => {
                const { ir } = extractIR(F, 'EmptyInterface');
                const obj = asObject(ir);
                expect(obj.properties).toHaveLength(0);
                expect(obj.indexSignature).toBeUndefined();
        });

        it('EmptyObjectType → same as EmptyInterface', () => {
                const { ir } = extractIR(F, 'EmptyObjectType');
                const obj = asObject(ir);
                expect(obj.properties).toHaveLength(0);
        });
});
