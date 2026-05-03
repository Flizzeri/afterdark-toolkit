// packages/program/tests/fixtures/simple-project/src/types.ts

/**
 * A user in the system.
 */
export interface User {
        id: string;
        name: string;
        age: number;
        email?: string;
}

/**
 * User status enum.
 */
export type UserStatus = 'active' | 'inactive' | 'pending';

/**
 * A post by a user.
 */
export interface Post {
        id: string;
        author: User;
        title: string;
        content: string;
        status: UserStatus;
}

/**
 * Generic result type.
 */
export type Result<T, E> = { success: true; value: T } | { success: false; error: E };
