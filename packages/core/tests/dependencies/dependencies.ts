// packages/core/tests/dependencies/dependencies.ts

// Fixtures for extractDependencies coverage.
// Each section is labelled with what branch of the walker it exercises.

// ---------------------------------------------------------------------------
// Shared base types (referenced by many fixtures below)
// ---------------------------------------------------------------------------

export type UserId = number;
export type PostId = string;

export interface Address {
        street: string;
        city: string;
}

export interface BaseEntity {
        id: number;
        createdAt: string;
}

// ---------------------------------------------------------------------------
// 1. No dependencies — primitive / literal / built-in only
// ---------------------------------------------------------------------------

/** Plain primitive — zero user-defined deps */
export type Age = number;

/** Union of primitives — still zero user-defined deps */
export type Status = 'active' | 'inactive' | 'pending';

/** Array of built-in — Array is in isBuiltInSymbol, no dep recorded */
export type Tags = string[];

/** Record utility — Record is built-in, no dep recorded */
export type Metadata = Record<string, unknown>;

/** Partial of a built-in-keyed object — Partial is built-in */
export type PartialConfig = Partial<{ host: string; port: number }>;

// ---------------------------------------------------------------------------
// 2. Single type-reference dependency
// ---------------------------------------------------------------------------

/** Direct reference to a user-defined type alias */
export type AuthorId = UserId;

/** Object with a single user-defined property type */
export interface Comment {
        authorId: UserId;
        body: string;
}

// ---------------------------------------------------------------------------
// 3. Multiple type-reference dependencies
// ---------------------------------------------------------------------------

/** Object referencing two user-defined types */
export interface Post {
        id: PostId;
        authorId: UserId;
        title: string;
}

/** Interface extending another interface */
export interface User extends BaseEntity {
        name: string;
        address: Address;
}

// ---------------------------------------------------------------------------
// 4. Nested / transitive references (direct deps only, not transitive)
// ---------------------------------------------------------------------------

/** Direct deps are Address and UserId; BaseEntity is transitive via User */
export interface Profile {
        userId: UserId;
        home: Address;
}

// ---------------------------------------------------------------------------
// 5. Heritage clauses — extends
// ---------------------------------------------------------------------------

export interface TimestampedEntity extends BaseEntity {
        updatedAt: string;
}

export interface AdminUser extends User {
        role: string;
}

// ---------------------------------------------------------------------------
// 6. typeof (type query node)
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG = {
        host: 'localhost',
        port: 3000,
} as const;

export const ROLE_LIST = ['admin', 'editor', 'viewer'] as const;

/** typeof captures the user-defined value symbol */
export type Config = typeof DEFAULT_CONFIG;

/** typeof on a const array */
export type RoleList = typeof ROLE_LIST;

// ---------------------------------------------------------------------------
// 7. Indexed access  T[K]
// ---------------------------------------------------------------------------

/** Both Address (object) and 'city' (string literal key) are walked */
export type CityField = Address['city'];

/** Nested indexed access */
export type PostTitle = Post['title'];

// ---------------------------------------------------------------------------
// 8. Generic type parameters — built-in generic with user-defined argument
// ---------------------------------------------------------------------------

/** Array<T> — Array is built-in, UserId is user-defined */
export type UserIdList = UserId[];

/** Promise — built-in, but wrapping a user-defined type */
export type UserPromise = Promise<User>;

/** Readonly<T> — built-in utility */
export type ReadonlyAddress = Readonly<Address>;

// ---------------------------------------------------------------------------
// 9. Union / intersection with user-defined members
// ---------------------------------------------------------------------------

export type IdType = UserId | PostId;

export type FullUser = User & Address;

// ---------------------------------------------------------------------------
// 10. Duplicate references — same dep appearing twice should still produce
//     a single entry in the Map (set semantics)
// ---------------------------------------------------------------------------

export interface DuplicateDepsTest {
        a: UserId;
        b: UserId;
        c: UserId;
}

// ---------------------------------------------------------------------------
// 11. Class declarations (heritage + members)
// ---------------------------------------------------------------------------

export class UserService {
        process = (user: User): void => {
                void user;
        };
}

export class AdminService extends UserService {
        promote = (_user: User): void => {};
}

// ---------------------------------------------------------------------------
// 12. Qualified name  Namespace.Type
// ---------------------------------------------------------------------------

export namespace Shapes {
        export interface Circle {
                radius: number;
        }
        export interface Rectangle {
                width: number;
                height: number;
        }
}

/** References a qualified name — Shapes.Circle */
export type MyShape = Shapes.Circle | Shapes.Rectangle;

// ---------------------------------------------------------------------------
// 13. Deeply nested references inside generics
// ---------------------------------------------------------------------------

export type MaybeUser = Array<UserId | null>;

export interface PaginatedResult {
        items: Post[];
        total: number;
        page: UserId; // re-use UserId intentionally
}

// ---------------------------------------------------------------------------
// 14. Type alias with no user-defined deps after filtering built-ins
//     (ensures built-in filtering works correctly for utility types)
// ---------------------------------------------------------------------------

export type StringRecord = Record<string, string>;
export type RequiredAddress = Required<Address>;
export type PickedAddress = Pick<Address, 'city'>;
export type OmittedPost = Omit<Post, 'authorId'>;

// ---------------------------------------------------------------------------
// 15. Interface multiple extends
// ---------------------------------------------------------------------------

export interface Serializable {
        serialize: () => string;
}

export interface Validatable {
        validate: () => boolean;
}

export interface Loggable {
        log: () => void;
}

/** Extends three interfaces simultaneously */
export interface RichEntity extends BaseEntity, Serializable, Validatable {
        label: string;
}

/** Extends two interfaces, one of which is itself multi-extended */
export interface FullEntity extends RichEntity, Loggable {
        extra: string;
}

// ---------------------------------------------------------------------------
// 16. Class implements (single)
// ---------------------------------------------------------------------------

/** Class implementing one interface */
export class SerializableUser implements Serializable {
        serialize = (): string => {
                return '';
        };
}

// ---------------------------------------------------------------------------
// 17. Class implements multiple interfaces
// ---------------------------------------------------------------------------

/** Class implementing three interfaces */
export class RichUser implements Serializable, Validatable, Loggable {
        serialize = (): string => {
                return '';
        };
        validate = (): boolean => {
                return true;
        };
        log = (): void => {};
}

// ---------------------------------------------------------------------------
// 18. Class extends + implements simultaneously
// ---------------------------------------------------------------------------

/** Class that both extends a base class and implements interfaces */
export class ValidatedAdminService extends UserService implements Serializable, Validatable {
        serialize = (): string => {
                return '';
        };
        validate = (): boolean => {
                return true;
        };
}

// ---------------------------------------------------------------------------
// 19. Heritage clause with generic type arguments (covers lines 77-78)
// ---------------------------------------------------------------------------

export interface Repository<T> {
        findById: (id: number) => T;
}

/** extends a generic interface with a concrete type argument */
export interface UserRepository extends Repository<User> {}

export interface PaginatedRepository extends Repository<Post> {}

/** Class extending a generic class with a type argument */
export class ConcreteRepository extends UserService implements Repository<User> {
        findById = (_id: number): User => {
                return {} as User;
        };
}

// ---------------------------------------------------------------------------
// 20. Import type with qualifier (covers lines 111-113)
// ---------------------------------------------------------------------------

/** import type(...).Qualifier — exercises the import type branch */
export type ImportedType = import('./external-types.js').ExternalType;

// ---------------------------------------------------------------------------
// 21. Cycles
// ---------------------------------------------------------------------------

/** Direct self-reference via property */
export interface TreeNode {
        value: number;
        children: TreeNode[];
}

/** Mutual cycle: A → B → A */
export interface CycleA {
        b: CycleB;
        name: string;
}

export interface CycleB {
        a: CycleA;
        value: number;
}

/** Longer cycle: Chain → ChainLink → ChainEnd → Chain */
export interface Chain {
        link: ChainLink;
}

export interface ChainLink {
        end: ChainEnd;
}

export interface ChainEnd {
        back: Chain;
}
