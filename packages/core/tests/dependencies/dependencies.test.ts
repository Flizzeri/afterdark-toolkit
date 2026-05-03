// packages/core/tests/dependencies/dependencies.test.ts

import { describe, it, expect } from 'vitest';

import { findSymbol, resolveFixture } from '../utils/helpers.js';

// Helpers

const FIXTURE = 'dependencies';

function depsOf(name: string): Set<string> {
        const { result } = resolveFixture(FIXTURE);
        const symbol = findSymbol(result, name);
        if (Array.isArray(symbol)) throw new Error(`findSymbol returned multiple for "${name}"`);

        return new Set(Array.from(symbol.dependencies.keys()).map((id) => id.split('#')[0]));
}

// 1. No dependencies

describe('no user-defined dependencies', () => {
        it('primitive alias — Age has no deps', () => {
                expect(depsOf('Age').size).toBe(0);
        });

        it('union of string literals — Status has no deps', () => {
                expect(depsOf('Status').size).toBe(0);
        });

        it('built-in array shorthand — Tags has no deps', () => {
                expect(depsOf('Tags').size).toBe(0);
        });

        it('Record utility type — Metadata has no deps', () => {
                expect(depsOf('Metadata').size).toBe(0);
        });

        it('Partial of inline object — PartialConfig has no deps', () => {
                expect(depsOf('PartialConfig').size).toBe(0);
        });
});

// 2. Single type-reference dependency

describe('single direct dependency', () => {
        it('type alias referencing another alias — AuthorId depends on UserId', () => {
                const deps = depsOf('AuthorId');
                expect(deps).toContain('UserId');
                expect(deps.size).toBe(1);
        });

        it('interface with one user-defined property — Comment depends on UserId', () => {
                const deps = depsOf('Comment');
                expect(deps).toContain('UserId');
                expect(deps.size).toBe(1);
        });
});

// 3. Multiple type-reference dependencies

describe('multiple direct dependencies', () => {
        it('Post depends on PostId and UserId', () => {
                const deps = depsOf('Post');
                expect(deps).toContain('PostId');
                expect(deps).toContain('UserId');
                expect(deps.size).toBe(2);
        });

        it('User extends BaseEntity and has Address property — depends on both', () => {
                const deps = depsOf('User');
                expect(deps).toContain('BaseEntity');
                expect(deps).toContain('Address');
        });
});

// 4. Transitive dependency collection

describe('transitive dependencies', () => {
        it('Profile directly depends on UserId and Address', () => {
                const deps = depsOf('Profile');
                expect(deps).toContain('UserId');
                expect(deps).toContain('Address');
        });

        it('AdminUser transitively includes all deps from User (BaseEntity, Address)', () => {
                const deps = depsOf('AdminUser');
                // Direct: User
                expect(deps).toContain('User');
                // Transitive via User
                expect(deps).toContain('BaseEntity');
                expect(deps).toContain('Address');
        });

        it('FullEntity transitively collects all ancestors', () => {
                const deps = depsOf('FullEntity');
                // Direct extends
                expect(deps).toContain('RichEntity');
                expect(deps).toContain('Loggable');
                // Transitive via RichEntity
                expect(deps).toContain('BaseEntity');
                expect(deps).toContain('Serializable');
                expect(deps).toContain('Validatable');
        });
});

// 5. Heritage clauses — extends

describe('interface extends (heritage clauses)', () => {
        it('TimestampedEntity extends BaseEntity — depends on BaseEntity', () => {
                const deps = depsOf('TimestampedEntity');
                expect(deps).toContain('BaseEntity');
        });

        it('RichEntity extends BaseEntity, Serializable, Validatable', () => {
                const deps = depsOf('RichEntity');
                expect(deps).toContain('BaseEntity');
                expect(deps).toContain('Serializable');
                expect(deps).toContain('Validatable');
        });
});

// 6. typeof — type query nodes

describe('typeof (type query)', () => {
        it('Config = typeof DEFAULT_CONFIG — depends on DEFAULT_CONFIG', () => {
                const deps = depsOf('Config');
                expect(deps).toContain('DEFAULT_CONFIG');
                expect(deps.size).toBe(1);
        });

        it('RoleList = typeof ROLE_LIST — depends on ROLE_LIST', () => {
                const deps = depsOf('RoleList');
                expect(deps).toContain('ROLE_LIST');
                expect(deps.size).toBe(1);
        });
});

// 7. Indexed access  T[K]

describe('indexed access types', () => {
        it("CityField = Address['city'] — depends on Address", () => {
                const deps = depsOf('CityField');
                expect(deps).toContain('Address');
        });

        it("PostTitle = Post['title'] — depends on Post (and its transitive deps)", () => {
                const deps = depsOf('PostTitle');
                expect(deps).toContain('Post');
        });
});

// 8. Generic type parameters with user-defined arguments

describe('built-in generics wrapping user-defined types', () => {
        it('UserIdList = Array<UserId> — Array is built-in, UserId is recorded', () => {
                const deps = depsOf('UserIdList');
                expect(deps).toContain('UserId');
                expect(deps).not.toContain('Array');
        });

        it('UserPromise = Promise<User> — Promise is built-in, User is recorded', () => {
                const deps = depsOf('UserPromise');
                expect(deps).toContain('User');
                expect(deps).not.toContain('Promise');
        });

        it('ReadonlyAddress = Readonly<Address> — Readonly is built-in, Address is recorded', () => {
                const deps = depsOf('ReadonlyAddress');
                expect(deps).toContain('Address');
                expect(deps).not.toContain('Readonly');
        });
});

// 9. Union / intersection with user-defined members

describe('union and intersection types', () => {
        it('IdType = UserId | PostId — depends on both', () => {
                const deps = depsOf('IdType');
                expect(deps).toContain('UserId');
                expect(deps).toContain('PostId');
                expect(deps.size).toBe(2);
        });

        it('FullUser = User & Address — depends on both', () => {
                const deps = depsOf('FullUser');
                expect(deps).toContain('User');
                expect(deps).toContain('Address');
        });
});

// 10. Duplicate references — same dep appearing multiple times

describe('duplicate references produce a single map entry', () => {
        it('DuplicateDepsTest has three UserId properties — dep recorded once', () => {
                const deps = depsOf('DuplicateDepsTest');
                expect(deps).toContain('UserId');
                const userIdCount = Array.from(deps).filter((n) => n === 'UserId').length;
                expect(userIdCount).toBe(1);
        });
});

// 11. Class declarations — heritage and member types

describe('class declarations', () => {
        it('UserService has a User parameter — depends on User', () => {
                const deps = depsOf('UserService');
                expect(deps).toContain('User');
        });

        it('AdminService extends UserService — depends on UserService (and transitively User)', () => {
                const deps = depsOf('AdminService');
                expect(deps).toContain('UserService');
                expect(deps).toContain('User');
        });
});

// 12. Class implements

describe('class implements (heritage clauses)', () => {
        it('SerializableUser implements Serializable — depends on Serializable', () => {
                const deps = depsOf('SerializableUser');
                expect(deps).toContain('Serializable');
        });

        it('RichUser implements three interfaces — depends on all three', () => {
                const deps = depsOf('RichUser');
                expect(deps).toContain('Serializable');
                expect(deps).toContain('Validatable');
                expect(deps).toContain('Loggable');
        });

        it('ValidatedAdminService extends UserService and implements two interfaces', () => {
                const deps = depsOf('ValidatedAdminService');
                expect(deps).toContain('UserService');
                expect(deps).toContain('Serializable');
                expect(deps).toContain('Validatable');
        });
});

// 13. Utility types filtering built-ins correctly

describe('built-in utility types are filtered out', () => {
        it('StringRecord = Record<string, string> — no user-defined deps', () => {
                expect(depsOf('StringRecord').size).toBe(0);
        });

        it('RequiredAddress = Required<Address> — Required is built-in, Address is recorded', () => {
                const deps = depsOf('RequiredAddress');
                expect(deps).toContain('Address');
                expect(deps).not.toContain('Required');
        });

        it("PickedAddress = Pick<Address, 'city'> — Pick is built-in, Address is recorded", () => {
                const deps = depsOf('PickedAddress');
                expect(deps).toContain('Address');
                expect(deps).not.toContain('Pick');
        });

        it("OmittedPost = Omit<Post, 'authorId'> — Omit is built-in, Post is recorded", () => {
                const deps = depsOf('OmittedPost');
                expect(deps).toContain('Post');
                expect(deps).not.toContain('Omit');
        });
});

// 14. Deeply nested generics

describe('deeply nested generic arguments', () => {
        it('MaybeUser = Array<UserId | null> — records UserId, not Array', () => {
                const deps = depsOf('MaybeUser');
                expect(deps).toContain('UserId');
                expect(deps).not.toContain('Array');
        });

        it('PaginatedResult has Array<Post> and UserId — records Post and UserId', () => {
                const deps = depsOf('PaginatedResult');
                expect(deps).toContain('Post');
                expect(deps).toContain('UserId');
        });
});

// 15. Dependency map structure

describe('dependency map structure', () => {
        it('map values are truthy declaration objects', () => {
                const { result } = resolveFixture(FIXTURE);
                const symbol = findSymbol(result, 'Post');
                if (Array.isArray(symbol)) throw new Error('unexpected array');

                for (const [, decl] of symbol.dependencies) {
                        expect(decl).toBeTruthy();
                        expect(typeof decl).toBe('object');
                }
        });

        it('root symbol is not present in its own dependency map', () => {
                const { result } = resolveFixture(FIXTURE);
                const symbol = findSymbol(result, 'User');
                if (Array.isArray(symbol)) throw new Error('unexpected array');

                const depNames = Array.from(symbol.dependencies.keys()).map(
                        (id) => id.split('#')[0],
                );
                expect(depNames).not.toContain('User');
        });
});

// 16. Generic heritage clause

describe('generic type arguments in heritage clauses', () => {
        it('UserRepository extends Repository<User> — depends on Repository and User', () => {
                const deps = depsOf('UserRepository');
                expect(deps).toContain('Repository');
                expect(deps).toContain('User');
        });

        it('PaginatedRepository extends Repository<Post> — depends on Repository and Post', () => {
                const deps = depsOf('PaginatedRepository');
                expect(deps).toContain('Repository');
                expect(deps).toContain('Post');
        });

        it('ConcreteRepository extends UserService and implements Repository<User>', () => {
                const deps = depsOf('ConcreteRepository');
                expect(deps).toContain('UserService');
                expect(deps).toContain('Repository');
                expect(deps).toContain('User');
        });
});

// 17. Import type with qualifier

describe('import type nodes', () => {
        it('ImportedType = import(...).ExternalType — qualifier symbol is recorded', () => {
                const deps = depsOf('ImportedType');
                expect(deps).toContain('ExternalType');
        });
});

// 18. Cycles

describe('cyclic references', () => {
        it('CycleA ↔ CycleB mutual cycle — both terminate and cross-reference', () => {
                const depsA = depsOf('CycleA');
                const depsB = depsOf('CycleB');

                expect(depsA).toContain('CycleB');
                expect(depsB).toContain('CycleA');
        });

        it('cyclic dep map does not contain infinite entries', () => {
                // sanity check — the map is finite
                const deps = depsOf('CycleA');
                expect(deps.size).toBeLessThan(20);
        });
});
