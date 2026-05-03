// packages/core/tests/queries/src/entities.ts

// Core fixture file. Contains every symbol kind recognised by getSymbolKind/getDeclarationSymbol,

// Type aliases

/** @entity */
export type UserId = number;

/** @entity @deprecated */
export type PostId = string;

/** No annotation — should be excluded by has-annotation('entity') */
export type RawId = number;

export type InternalAlias = string;

// Interfaces

/** @entity */
export interface User {
        id: UserId;
        name: string;
        email: string;
}

/** @entity @validate */
export interface Post {
        id: PostId;
        title: string;
        body: string;
}

/** No annotation */
export interface InternalConfig {
        host: string;
        port: number;
}

// Classes

/** @service */
export class UserService {
        getUser(_id: UserId): User {
                return { id: 1, name: '', email: '' };
        }
}

/** @service @singleton */
export class PostService {
        getPost(_id: PostId): Post {
                return { id: '', title: '', body: '' };
        }
}

/** No annotation */
export class InternalHelper {
        help(): void {}
}

// Enums

/** @enum */
export enum Role {
        Admin = 'admin',
        Editor = 'editor',
        Viewer = 'viewer',
}

/** @enum */
export enum Status {
        Active = 'active',
        Inactive = 'inactive',
}

/** No annotation */
export enum InternalFlag {
        On,
        Off,
}

// Const variables

/** @config */
export const DEFAULT_HOST = 'localhost';

/** @config */
export const DEFAULT_PORT = 3000;

/** No annotation */
export const INTERNAL_SECRET = 'shh';

// Unexported symbols

/** @entity */
type UnexportedAlias = boolean;

/** @entity */
interface UnexportedInterface {
        value: string;
}

class UnexportedClass {
        run(): void {}
}

enum UnexportedEnum {
        A,
        B,
}

const unexportedConst = 42;
